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
	"github.com/shafins-course/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthIntegration(t *testing.T) {
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
	authHandler := handlers.NewAuthHandler(store, tokenService, logger)

	e := echo.New()

	t.Run("Register and Login", func(t *testing.T) {
		// 1. Register
		regReq := handlers.RegisterRequest{
			Email:    "integration@example.com",
			Password: "password123",
			FullName: "Integration Test",
		}
		regBody, _ := json.Marshal(regReq)
		req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBuffer(regBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := authHandler.Register(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var userResp handlers.UserResponse
		json.Unmarshal(rec.Body.Bytes(), &userResp)
		assert.Equal(t, regReq.Email, userResp.Email)

		// 2. Login
		loginReq := handlers.LoginRequest{
			Email:    "integration@example.com",
			Password: "password123",
		}
		loginBody, _ := json.Marshal(loginReq)
		req = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(loginBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)

		err = authHandler.Login(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var loginResp handlers.LoginResponse
		json.Unmarshal(rec.Body.Bytes(), &loginResp)
		assert.NotEmpty(t, loginResp.AccessToken)
		assert.NotEmpty(t, loginResp.RefreshToken)
	})

	t.Run("Login with wrong password", func(t *testing.T) {
		loginReq := handlers.LoginRequest{
			Email:    "integration@example.com",
			Password: "wrongpassword",
		}
		loginBody, _ := json.Marshal(loginReq)
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(loginBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := authHandler.Login(c)
		// Handlers return HTTPError which is handled by Echo, but here we call it directly
		// authHandler.Login returns echo.NewHTTPError which contains status and message
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
	})
}
