package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestSetupRouter(t *testing.T) {
	cfg := &config.Config{
		StreamSecret:   "secret",
		AllowedOrigins: "*",
		APIKey:         "apikey",
		AppEnv:         "development",
	}

	e := SetupRouter(cfg, nil, nil, nil)
	assert.NotNil(t, e)

	t.Run("Health check route", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("Docs route in development", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/docs/index.html", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.NotEqual(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("Protected route without auth", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/files", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("Protected route with auth", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/files", nil)
		req.Header.Set("X-API-KEY", "apikey")
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		// Status 500 expected due to nil services
		assert.Equal(t, http.StatusInternalServerError, rec.Code)
	})
}
