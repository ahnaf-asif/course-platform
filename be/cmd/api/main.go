package main

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/shafins-course/backend/internal/api"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/services"
	"github.com/shafins-course/backend/internal/worker"
)

func main() {
	// Load .env file if it exists
	_ = godotenv.Load()

	// Initialize Logger
	env := os.Getenv("ENV")
	var logger *slog.Logger
	if env == "production" {
		logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))
	} else {
		logger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	}
	slog.SetDefault(logger)

	// Initialize Tracer
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	otelAddr := os.Getenv("OTEL_COLLECTOR_ADDR")
	if otelAddr == "" {
		otelAddr = "localhost:4317"
	}

	tp, err := api.InitTracer(ctx, "course-platform-api", otelAddr)
	if err != nil {
		logger.Error("Failed to initialize tracer", "error", err)
	} else {
		defer func() {
			if err := tp.Shutdown(context.Background()); err != nil {
				logger.Error("Error shutting down tracer provider", "error", err)
			}
		}()
	}

	// Database initialization
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		logger.Error("DB_URL environment variable is not set")
		os.Exit(1)
	}

	conn, err := sql.Open("pgx", dbURL)
	if err != nil {
		logger.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}

	if err := conn.Ping(); err != nil {
		logger.Error("Database is unreachable", "error", err)
		os.Exit(1)
	}

	// Redis initialization
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}
	cacheService := services.NewCacheService(redisURL, "", 0)
	if err := cacheService.Ping(ctx); err != nil {
		logger.Warn("Redis is unreachable, caching will be disabled", "error", err)
	}

	// Task Service initialization
	taskService := services.NewTaskService(redisURL)

	// Minio initialization
	minioCfg := &services.MinioConfig{
		Endpoint:     os.Getenv("MINIO_ENDPOINT"),
		AccessKey:    os.Getenv("MINIO_ACCESS_KEY"),
		SecretKey:    os.Getenv("MINIO_SECRET_KEY"),
		UseSSL:       os.Getenv("MINIO_USE_SSL") == "true",
		ImportBucket: os.Getenv("MINIO_BUCKET_TEMP"),
	}
	if minioCfg.ImportBucket == "" {
		minioCfg.ImportBucket = "temp-imports"
	}
	if minioCfg.Endpoint == "" {
		minioCfg.Endpoint = "localhost:9000"
	}
	minioService, err := services.NewMinioService(minioCfg)
	if err != nil {
		logger.Error("Failed to initialize Minio service", "error", err)
		os.Exit(1)
	}

	// Dependencies
	store := db.NewStore(conn)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		logger.Error("JWT_SECRET environment variable is not set")
		os.Exit(1)
	}
	tokenService := services.NewTokenService(jwtSecret, 15*time.Minute, 7*24*time.Hour)

	// Background Worker initialization
	quizWorker := worker.NewQuizWorker(store, minioService)
	backgroundWorker := worker.NewWorker(redisURL, quizWorker)

	// Server initialization
	server := api.NewServer(store, tokenService, cacheService, minioService, taskService, logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start Background Worker
	go func() {
		if err := backgroundWorker.Start(); err != nil {
			logger.Error("Background worker failed", "error", err)
		}
	}()

	// Channel to listen for errors coming from the listener.
	serverErrors := make(chan error, 1)

	// Start the service listening for requests.
	go func() {
		logger.Info("Starting server", "port", port, "env", env)
		serverErrors <- server.Start(":" + port)
	}()

	// Channel to listen for an interrupt or terminate signal from the OS.
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	// Blocking main and waiting for shutdown or error.
	select {
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.Error("Server failed to start", "error", err)
			os.Exit(1)
		}

	case sig := <-shutdown:
		logger.Info("Starting shutdown", "signal", sig.String())

		// Give outstanding requests a deadline for completion.
		const timeout = 10 * time.Second
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		// Asking listener to shut down and shed load.
		if err := server.Shutdown(ctx); err != nil {
			logger.Error("Graceful shutdown failed", "error", err)
			// If shutdown fails, we force close resources and exit.
			_ = conn.Close()
			_ = cacheService.Close()
			backgroundWorker.Shutdown()
			_ = taskService.Close()
			os.Exit(1)
		}

		backgroundWorker.Shutdown()
		_ = taskService.Close()

		// Close resources.
		if err := conn.Close(); err != nil {
			logger.Error("Failed to close database connection", "error", err)
		}
		if err := cacheService.Close(); err != nil {
			logger.Error("Failed to close redis connection", "error", err)
		}

		logger.Info("Shutdown complete")
	}
}
