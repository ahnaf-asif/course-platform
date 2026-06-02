package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/handlers"
	internalMiddleware "github.com/shafins-course/backend/internal/middleware"
	"github.com/shafins-course/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	tokenService := services.NewTokenService("test-secret", 15*time.Minute, 7*24*time.Hour)
	cacheService := services.NewCacheService("localhost:6379", "", 0) // Integration test uses real redis if available, but we can skip cache errors

	authHandler := handlers.NewAuthHandler(store, tokenService, logger)
	userHandler := handlers.NewUserHandler(store, cacheService, logger)

	e := echo.New()

	// 1. Setup User
	email := "user@example.com"
	password := "password123"
	fullName := "User Test"

	t.Run("GetMe and UpdateMe", func(t *testing.T) {
		// Register
		regReq := handlers.RegisterRequest{
			Email:    email,
			Password: password,
			FullName: fullName,
		}
		regBody, _ := json.Marshal(regReq)
		req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBuffer(regBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		require.NoError(t, authHandler.Register(c))

		var regResp handlers.UserResponse
		json.Unmarshal(rec.Body.Bytes(), &regResp)
		userID := regResp.ID

		// Create Auth context (simulating middleware)
		authUser := &internalMiddleware.AuthUser{
			ID:    userID,
			Email: email,
			Role:  "USER",
		}

		// 2. GetMe
		req = httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)
		c.Set("user", authUser)

		err = userHandler.GetMe(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var profile handlers.UserProfileResponse
		json.Unmarshal(rec.Body.Bytes(), &profile)
		assert.Equal(t, fullName, profile.FullName)
		assert.Equal(t, email, profile.Email)

		// 3. UpdateMe
		newFullName := "Updated Name"
		newBio := "This is a new bio"
		updateReq := handlers.UpdateUserProfileRequest{
			FullName: &newFullName,
			Bio:      &newBio,
		}
		updateBody, _ := json.Marshal(updateReq)
		req = httptest.NewRequest(http.MethodPatch, "/api/v1/users/me", bytes.NewBuffer(updateBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)
		c.Set("user", authUser)

		err = userHandler.UpdateMe(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		json.Unmarshal(rec.Body.Bytes(), &profile)
		assert.Equal(t, newFullName, profile.FullName)
		assert.Equal(t, &newBio, profile.Bio)

		// 4. UpdatePassword
		newPassword := "newpassword123"
		passReq := handlers.UpdatePasswordRequest{
			OldPassword: password,
			NewPassword: newPassword,
		}
		passBody, _ := json.Marshal(passReq)
		req = httptest.NewRequest(http.MethodPut, "/api/v1/users/me/password", bytes.NewBuffer(passBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)
		c.Set("user", authUser)

		err = userHandler.UpdatePassword(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, rec.Code)

		// 5. Verify Login with new password
		loginReq := handlers.LoginRequest{
			Email:    email,
			Password: newPassword,
		}
		loginBody, _ := json.Marshal(loginReq)
		req = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(loginBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)

		err = authHandler.Login(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})
}
