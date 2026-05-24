package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/services"
)

type AuthUser struct {
	ID    string
	Email string
	Role  string
}

const AuthUserContextKey = "user"

func GetAuthUser(c echo.Context) AuthUser {
	user, ok := c.Get(AuthUserContextKey).(*AuthUser)
	if !ok {
		return AuthUser{}
	}
	return *user
}

func JWTMiddleware(secret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			var tokenString string

			// 1. Try to get token from Authorization header
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
					tokenString = parts[1]
				}
			}

			// 2. If not in header, try to get from cookie
			if tokenString == "" {
				cookie, err := c.Cookie("access_token")
				if err == nil {
					tokenString = cookie.Value
				}
			}

			if tokenString == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			}

			claims := &services.AuthClaims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(secret), nil
			})

			if err != nil || !token.Valid {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			}

			// Store typed AuthUser in context
			authUser := &AuthUser{
				ID:    claims.Subject,
				Email: claims.Email,
				Role:  claims.Role,
			}
			c.Set(AuthUserContextKey, authUser)

			return next(c)
		}
	}
}
