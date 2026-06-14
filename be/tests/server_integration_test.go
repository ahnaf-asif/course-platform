package tests

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/shafins-course/backend/internal/api"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerGenericRoutes(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	tokenService := services.NewTokenService("secret", time.Minute, time.Hour)
	server := api.NewServer(store, tokenService, nil, nil, nil, logger)
	e := server.GetEcho()

	t.Run("Health Check", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), "ok")
	})

	t.Run("Metrics Endpoint", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), "http_requests_total")
	})

	t.Run("Documentation Endpoint", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/docs", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), "SwaggerUIBundle")
	})
}
