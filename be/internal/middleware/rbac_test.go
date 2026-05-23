package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

func TestRBACMiddleware(t *testing.T) {
	e := echo.New()
	h := func(c echo.Context) error {
		return c.String(http.StatusOK, "success")
	}

	t.Run("Admin accessing Admin route", func(t *testing.T) {
		mw := RequireAdmin()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(AuthUserContextKey, &AuthUser{ID: "1", Role: "ADMIN"})

		if assert.NoError(t, mw(h)(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
		}
	})

	t.Run("User accessing Admin route", func(t *testing.T) {
		mw := RequireAdmin()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(AuthUserContextKey, &AuthUser{ID: "2", Role: "USER"})

		err := mw(h)(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("Unauthenticated user accessing Admin route", func(t *testing.T) {
		mw := RequireAdmin()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := mw(h)(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("Admin accessing User route", func(t *testing.T) {
		mw := RequireUser()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(AuthUserContextKey, &AuthUser{ID: "1", Role: "ADMIN"})

		if assert.NoError(t, mw(h)(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
		}
	})

	t.Run("User accessing User route", func(t *testing.T) {
		mw := RequireUser()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(AuthUserContextKey, &AuthUser{ID: "2", Role: "USER"})

		if assert.NoError(t, mw(h)(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
		}
	})
}
