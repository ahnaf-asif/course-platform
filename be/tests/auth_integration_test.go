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

		// Verify cookies
		cookies := rec.Result().Cookies()
		var accessToken, refreshToken string
		for _, cookie := range cookies {
			if cookie.Name == "access_token" {
				accessToken = cookie.Value
				assert.True(t, cookie.HttpOnly)
			}
			if cookie.Name == "refresh_token" {
				refreshToken = cookie.Value
				assert.True(t, cookie.HttpOnly)
			}
		}
		assert.NotEmpty(t, accessToken)
		assert.NotEmpty(t, refreshToken)

		var loginResp handlers.LoginResponse
		json.Unmarshal(rec.Body.Bytes(), &loginResp)
		assert.Equal(t, accessToken, loginResp.AccessToken)
		assert.Equal(t, refreshToken, loginResp.RefreshToken)
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
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
	})

	t.Run("Register with duplicate email", func(t *testing.T) {
		regReq := handlers.RegisterRequest{
			Email:    "integration@example.com", // Already registered in first test
			Password: "password123",
			FullName: "Duplicate Test",
		}
		regBody, _ := json.Marshal(regReq)
		req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBuffer(regBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := authHandler.Register(c)
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusConflict, httpErr.Code)
	})

	t.Run("Login with non-existent user", func(t *testing.T) {
		loginReq := handlers.LoginRequest{
			Email:    "nonexistent@example.com",
			Password: "password123",
		}
		loginBody, _ := json.Marshal(loginReq)
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(loginBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := authHandler.Login(c)
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
	})

	t.Run("Refresh Success", func(t *testing.T) {
		// 1. Login to get tokens
		loginReq := handlers.LoginRequest{
			Email:    "integration@example.com",
			Password: "password123",
		}
		loginBody, _ := json.Marshal(loginReq)
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(loginBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := authHandler.Login(c)
		require.NoError(t, err)

		cookies := rec.Result().Cookies()
		var refreshToken string
		for _, cookie := range cookies {
			if cookie.Name == "refresh_token" {
				refreshToken = cookie.Value
			}
		}
		require.NotEmpty(t, refreshToken)

		// 2. Refresh
		req = httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
		req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)

		err = authHandler.Refresh(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		// Verify new cookies
		newCookies := rec.Result().Cookies()
		var newRefreshToken string
		for _, cookie := range newCookies {
			if cookie.Name == "refresh_token" {
				newRefreshToken = cookie.Value
			}
		}
		assert.NotEmpty(t, newRefreshToken)
		assert.NotEqual(t, refreshToken, newRefreshToken)
	})

	t.Run("Token Reuse Detection", func(t *testing.T) {
		// 1. Login to get tokens
		loginReq := handlers.LoginRequest{
			Email:    "integration@example.com",
			Password: "password123",
		}
		loginBody, _ := json.Marshal(loginReq)
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(loginBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		authHandler.Login(c)

		oldRefreshToken := rec.Result().Cookies()[1].Value // Assuming second cookie is refresh_token

		// 2. Refresh (First time - Success)
		req = httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
		req.AddCookie(&http.Cookie{Name: "refresh_token", Value: oldRefreshToken})
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)
		authHandler.Refresh(c)
		assert.Equal(t, http.StatusOK, rec.Code)

		// 3. Refresh with OLD token (Reuse - Failure)
		req = httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
		req.AddCookie(&http.Cookie{Name: "refresh_token", Value: oldRefreshToken})
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)

		err := authHandler.Refresh(c)
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
		assert.Contains(t, httpErr.Message, "session compromised")
	})
}
