package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/services"
	"github.com/stretchr/testify/assert"
)

func TestJWTMiddleware(t *testing.T) {
	secret := "testsecret"
	mw := JWTMiddleware(secret)

	h := func(c echo.Context) error {
		user := GetAuthUser(c)
		return c.JSON(http.StatusOK, user)
	}

	t.Run("Valid Token", func(t *testing.T) {
		e := echo.New()
		claims := &services.AuthClaims{
			RegisteredClaims: jwt.RegisteredClaims{
				Subject:   "user-123",
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			},
			Email: "test@example.com",
			Role:  "USER",
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(secret))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		if assert.NoError(t, mw(h)(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			var user AuthUser
			json.Unmarshal(rec.Body.Bytes(), &user)
			assert.Equal(t, "user-123", user.ID)
			assert.Equal(t, "test@example.com", user.Email)
			assert.Equal(t, "USER", user.Role)
		}
	})

	t.Run("Expired Token", func(t *testing.T) {
		e := echo.New()
		claims := &services.AuthClaims{
			RegisteredClaims: jwt.RegisteredClaims{
				Subject:   "user-123",
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(secret))

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := mw(h)(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Contains(t, rec.Body.String(), "unauthorized")
	})

	t.Run("Malformed Token", func(t *testing.T) {
		e := echo.New()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer not-a-token")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := mw(h)(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("Missing Header", func(t *testing.T) {
		e := echo.New()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := mw(h)(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})
}
