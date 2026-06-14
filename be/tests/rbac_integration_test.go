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
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRBACIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	jwtSecret := "test-secret"
	os.Setenv("JWT_SECRET", jwtSecret)
	defer os.Unsetenv("JWT_SECRET")

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	tokenService := services.NewTokenService(jwtSecret, 15*time.Minute, 7*24*time.Hour)

	// Create the real server
	server := api.NewServer(store, tokenService, nil, nil, nil, logger)
	e := server.GetEcho() // We need a way to get the echo instance from server for ServeHTTP

	// Setup users with different roles
	adminUser, _ := store.CreateUser(ctx, generated.CreateUserParams{
		Email:        "admin@rbac.com",
		PasswordHash: "password",
		Role:         generated.UserRoleADMIN,
	})

	regularUser, _ := store.CreateUser(ctx, generated.CreateUserParams{
		Email:        "user@rbac.com",
		PasswordHash: "password",
		Role:         generated.UserRoleUSER,
	})

	t.Run("Admin accessing Admin route", func(t *testing.T) {
		token, _ := tokenService.GenerateAccessToken(adminUser)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/ping", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), "admin")
	})

	t.Run("User accessing Admin route", func(t *testing.T) {
		token, _ := tokenService.GenerateAccessToken(regularUser)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/ping", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)
		// RBAC middleware should return 403 Forbidden
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("Unauthenticated accessing Admin route", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/ping", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)
		// JWT middleware should return 401 Unauthorized
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})
}
