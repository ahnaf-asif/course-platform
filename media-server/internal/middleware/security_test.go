package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

func TestGenerateAndValidateStreamToken(t *testing.T) {
	secret := "test-secret"
	videoID := "test-video-123"
	expiry := 1 * time.Hour

	token := GenerateStreamToken(videoID, secret, expiry)
	assert.NotEmpty(t, token)

	// Valid token
	err := ValidateStreamToken(token, videoID, secret)
	assert.NoError(t, err)

	// Wrong video ID
	err = ValidateStreamToken(token, "wrong-video", secret)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "video ID mismatch")

	// Wrong secret
	err = ValidateStreamToken(token, videoID, "wrong-secret")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid token signature")

	// Expired token
	expiredToken := GenerateStreamToken(videoID, secret, -2*time.Minute)
	err = ValidateStreamToken(expiredToken, videoID, secret)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "token expired")

	// Invalid format
	err = ValidateStreamToken("invalid.token", videoID, secret)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid token format")

	// Invalid Base64 in token
	err = ValidateStreamToken("!!!.exp.sig", videoID, secret)
	assert.Error(t, err)

	// Malformed expiration - will fail signature check first
	tokenWithBadExp := GenerateStreamToken(videoID, secret, 1*time.Hour)
	parts := strings.Split(tokenWithBadExp, ".")
	parts[1] = "notanint"
	badExpToken := strings.Join(parts, ".")
	err = ValidateStreamToken(badExpToken, videoID, secret)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid token signature")
}

func TestHLSProtectionMiddleware(t *testing.T) {
	e := echo.New()
	secret := "test-secret"
	allowedOrigins := "http://localhost:3000,http://trusted.com"

	mw := HLSProtection(secret, allowedOrigins)
	h := mw(func(c echo.Context) error {
		return c.String(http.StatusOK, "success")
	})

	t.Run("Valid request", func(t *testing.T) {
		videoID := "video1"
		token := GenerateStreamToken(videoID, secret, 1*time.Hour)
		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/index.m3u8?token="+token, nil)
		req.Header.Set("Referer", "http://localhost:3000/course")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id")
		c.SetParamValues(videoID)

		err := h(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("Unauthorized Referer", func(t *testing.T) {
		videoID := "video1"
		token := GenerateStreamToken(videoID, secret, 1*time.Hour)
		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/index.m3u8?token="+token, nil)
		req.Header.Set("Referer", "http://malicious.com")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id")
		c.SetParamValues(videoID)

		err := h(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusForbidden, rec.Code)
		assert.Contains(t, rec.Body.String(), "Unauthorized referer")
	})

	t.Run("Missing Referer", func(t *testing.T) {
		videoID := "video1"
		token := GenerateStreamToken(videoID, secret, 1*time.Hour)
		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/index.m3u8?token="+token, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id")
		c.SetParamValues(videoID)

		err := h(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusForbidden, rec.Code)
		assert.Contains(t, rec.Body.String(), "Referer required")
	})

	t.Run("Missing Token", func(t *testing.T) {
		videoID := "video1"
		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/index.m3u8", nil)
		req.Header.Set("Referer", "http://localhost:3000")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id")
		c.SetParamValues(videoID)

		err := h(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Contains(t, rec.Body.String(), "Missing stream token")
	})

	t.Run("Wildcard Origin", func(t *testing.T) {
		mwWildcard := HLSProtection(secret, "*")
		hWildcard := mwWildcard(func(c echo.Context) error {
			return c.String(http.StatusOK, "success")
		})

		videoID := "video1"
		token := GenerateStreamToken(videoID, secret, 1*time.Hour)
		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/index.m3u8?token="+token, nil)
		// No referer
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id")
		c.SetParamValues(videoID)

		err := hWildcard(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})
}
