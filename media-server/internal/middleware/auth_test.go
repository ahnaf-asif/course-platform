package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

func TestAPIKeyAuthMiddleware(t *testing.T) {
	e := echo.New()
	apiKey := "test-api-key"

	mw := APIKeyAuth(apiKey)
	h := mw(func(c echo.Context) error {
		return c.String(http.StatusOK, "success")
	})

	t.Run("Valid API Key in Header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("X-API-KEY", apiKey)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("Valid API Key in Query Param", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/?api_key="+apiKey, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("Invalid API Key", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("X-API-KEY", "wrong-key")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("Missing API Key", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})
}
