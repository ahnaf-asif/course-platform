package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/shafin/course-platform/media-server/docs"
	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/shafin/course-platform/media-server/internal/handler"
	customMiddleware "github.com/shafin/course-platform/media-server/internal/middleware"
	"github.com/shafin/course-platform/media-server/internal/service"
	echoSwagger "github.com/swaggo/echo-swagger"
)

// ... Swagger annotations remain the same ...

func main() {
	cfg := config.LoadConfig()

	// 1. Initialize Services
	minioService, err := service.NewMinioService(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize Minio service: %v", err)
	}
	transcodeService := service.NewTranscodeService(minioService, cfg)

	// 2. Initialize Worker
	taskProcessor := service.NewTaskProcessor(cfg, transcodeService)
	if err := taskProcessor.Start(); err != nil {
		log.Fatalf("Failed to start task processor: %v", err)
	}
	defer taskProcessor.Stop()

	// 3. Setup Router
	e := SetupRouter(cfg, minioService, transcodeService, taskProcessor)

	// Start server
	go func() {
		if err := e.Start(":" + cfg.Port); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Shutting down the server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}

func SetupRouter(cfg *config.Config, minioService service.IMinioService, transcodeService service.ITranscodeService, taskProcessor *service.TaskProcessor) *echo.Echo {
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger()) //nolint:staticcheck
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Initialize Handlers
	h := handler.NewHandler(minioService, transcodeService, taskProcessor, cfg)
	sh := handler.NewStreamHandler(transcodeService, cfg)

	// Routes
	api := e.Group("/api/v1")

	// Public routes
	api.GET("/health", h.HealthCheck)
	api.GET("/files/:file_name", h.GetDownloadURL)
	api.GET("/p/:file_name", h.GetPublicFile)
	api.GET("/docs/readme", h.Readme)

	if cfg.AppEnv == "development" {
		e.GET("/api/v1/docs", func(c echo.Context) error {
			return c.Redirect(http.StatusMovedPermanently, "/api/v1/docs/index.html")
		})
		e.GET("/api/v1/docs/*", echoSwagger.WrapHandler)
	}

	// HLS Protected routes
	stream := api.Group("/stream")
	stream.Use(customMiddleware.HLSProtection(cfg.StreamSecret, cfg.AllowedOrigins))
	stream.GET("/:video_id/index.m3u8", sh.ServeManifest)
	stream.GET("/:video_id/:segment", sh.ServeSegment)
	stream.GET("/:video_id/key", sh.ServeKey)

	// Protected routes (require API key)
	protected := api.Group("")
	protected.Use(customMiddleware.APIKeyAuth(cfg.APIKey))

	protected.GET("/upload-url", h.GetUploadURL)
	protected.POST("/upload", h.UploadFile)
	protected.POST("/transcode", h.TriggerTranscode) // New endpoint
	protected.GET("/files", h.ListFiles)
	protected.DELETE("/files/:file_name", h.DeleteFile)
	protected.GET("/stream-token/:video_id", sh.GetToken)

	return e
}
