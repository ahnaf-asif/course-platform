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

func TestTokenReuseDetection(t *testing.T) {
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

	// 1. Register a user
	regReq := handlers.RegisterRequest{
		Email:    "reuse@example.com",
		Password: "password123",
		FullName: "Reuse Test",
	}
	regBody, _ := json.Marshal(regReq)
	req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBuffer(regBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	require.NoError(t, authHandler.Register(c))

	// 2. Login
	loginReq := handlers.LoginRequest{
		Email:    "reuse@example.com",
		Password: "password123",
	}
	loginBody, _ := json.Marshal(loginReq)
	req = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(loginBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec = httptest.NewRecorder()
	c = e.NewContext(req, rec)
	require.NoError(t, authHandler.Login(c))

	// Get refresh token from cookie
	cookies := rec.Result().Cookies()
	var originalRefreshToken string
	for _, cookie := range cookies {
		if cookie.Name == "refresh_token" {
			originalRefreshToken = cookie.Value
		}
	}
	require.NotEmpty(t, originalRefreshToken)

	// 3. Refresh once
	req = httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: originalRefreshToken})
	rec = httptest.NewRecorder()
	c = e.NewContext(req, rec)
	require.NoError(t, authHandler.Refresh(c))

	// Get new refresh token from cookie
	cookies = rec.Result().Cookies()
	var newRefreshToken string
	for _, cookie := range cookies {
		if cookie.Name == "refresh_token" {
			newRefreshToken = cookie.Value
		}
	}
	require.NotEmpty(t, newRefreshToken)
	assert.NotEqual(t, originalRefreshToken, newRefreshToken)

	// 4. Refresh again with the SAME original token (REUSE)
	req = httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: originalRefreshToken})
	rec = httptest.NewRecorder()
	c = e.NewContext(req, rec)

	err = authHandler.Refresh(c)
	require.Error(t, err)
	httpErr, ok := err.(*echo.HTTPError)
	require.True(t, ok)
	assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
	assert.Equal(t, "session compromised, please log in again", httpErr.Message)

	// 5. Verify that the NEW refresh token is also revoked
	req = httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: newRefreshToken})
	rec = httptest.NewRecorder()
	c = e.NewContext(req, rec)

	err = authHandler.Refresh(c)
	require.Error(t, err)
	httpErr, ok = err.(*echo.HTTPError)
	require.True(t, ok)
	assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
}
