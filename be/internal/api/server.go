package api

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/handlers"
	internalMiddleware "github.com/shafins-course/backend/internal/middleware"
	"github.com/shafins-course/backend/internal/services"
	"go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho"
)

type Server struct {
	echo         *echo.Echo
	store        db.Store
	tokenService *services.TokenService
	cacheService *services.CacheService
	logger       *slog.Logger
}

func NewServer(store db.Store, tokenService *services.TokenService, cacheService *services.CacheService, logger *slog.Logger) *Server {
	e := echo.New()

	s := &Server{
		echo:         e,
		store:        store,
		tokenService: tokenService,
		cacheService: cacheService,
		logger:       logger,
	}

	s.setupMiddleware()
	s.registerRoutes()

	return s
}

func (s *Server) setupMiddleware() {
	// CORS configuration should be near the top to handle preflight requests
	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000,http://127.0.0.1:3000"
	}
	s.echo.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     strings.Split(allowedOrigins, ","),
		AllowMethods:     []string{http.MethodGet, http.MethodPut, http.MethodPost, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization, "X-Requested-With"},
		AllowCredentials: true,
	}))

	// OpenTelemetry Tracing
	s.echo.Use(otelecho.Middleware("course-platform-api"))

	// Prometheus metrics
	s.echo.Use(internalMiddleware.PrometheusMiddleware())

	// Custom slog middleware
	s.echo.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)
			stop := time.Now()

			req := c.Request()
			res := c.Response()

			attrs := []slog.Attr{
				slog.String("method", req.Method),
				slog.String("uri", req.RequestURI),
				slog.Int("status", res.Status),
				slog.String("ip", c.RealIP()),
				slog.Duration("latency", stop.Sub(start)),
				slog.String("user_agent", req.UserAgent()),
			}

			if err != nil {
				attrs = append(attrs, slog.String("error", err.Error()))
				s.logger.LogAttrs(req.Context(), slog.LevelError, "request failed", attrs...)
			} else {
				s.logger.LogAttrs(req.Context(), slog.LevelInfo, "request processed", attrs...)
			}

			return err
		}
	})

	s.echo.Use(middleware.Recover())

	// Request Body Limit
	s.echo.Use(middleware.BodyLimit("1M"))
}

func (s *Server) registerRoutes() {
	// Health check
	s.echo.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status": "ok",
		})
	})

	jwtSecret := os.Getenv("JWT_SECRET")
	authHandler := handlers.NewAuthHandler(s.store, s.tokenService, s.logger)
	userHandler := handlers.NewUserHandler(s.store, s.cacheService, s.logger)

	// API v1 Group
	v1 := s.echo.Group("/api/v1")

	// Metrics endpoint (internal only in production)
	v1.GET("/metrics", echo.WrapHandler(promhttp.Handler()))

	// Documentation
	v1.Static("/openapi", "docs")
	v1.GET("/docs", func(c echo.Context) error {
		return c.HTML(http.StatusOK, `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Course Platform API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" >
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"> </script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"> </script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/api/v1/openapi/openapi.yaml",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
      window.ui = ui;
    };
  </script>
</body>
</html>
`)
	})

	// Public Auth routes
	auth := v1.Group("/auth")

	// Rate Limiting for Auth
	denyHandler := func(c echo.Context, _ string, _ error) error {
		c.Response().Header().Set("Retry-After", "60")
		return echo.NewHTTPError(http.StatusTooManyRequests, "Too many requests, please try again later")
	}

	defaultRateLimit := middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 20, Burst: 20, ExpiresIn: 1 * time.Minute},
		),
		DenyHandler: denyHandler,
	})
	loginRateLimit := middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 5, Burst: 5, ExpiresIn: 1 * time.Minute},
		),
		DenyHandler: denyHandler,
	})
	registerRateLimit := middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 3, Burst: 3, ExpiresIn: 1 * time.Minute},
		),
		DenyHandler: denyHandler,
	})

	auth.Use(defaultRateLimit)
	auth.POST("/register", authHandler.Register, registerRateLimit)
	auth.POST("/login", authHandler.Login, loginRateLimit)
	auth.POST("/refresh", authHandler.Refresh)

	// Protected routes
	protected := v1.Group("")
	protected.Use(internalMiddleware.JWTMiddleware(jwtSecret))

	protected.POST("/auth/logout", authHandler.Logout)

	// User routes
	users := protected.Group("/users")
	users.GET("/me", userHandler.GetMe)
	users.PATCH("/me", userHandler.UpdateMe)
	users.PUT("/me/password", userHandler.UpdatePassword)

	// Admin routes
	admin := protected.Group("/admin")
	admin.Use(internalMiddleware.RequireAdmin())
	admin.GET("/ping", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"message": "pong", "role": "admin"})
	})
}

func (s *Server) Start(addr string) error {
	return s.echo.Start(addr)
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.echo.Shutdown(ctx)
}
