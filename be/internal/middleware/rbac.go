package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func RequireRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user := GetAuthUser(c)
			if user.ID == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			}

			found := false
			for _, role := range roles {
				if user.Role == role {
					found = true
					break
				}
			}

			if !found {
				return c.JSON(http.StatusForbidden, map[string]string{"error": "forbidden"})
			}

			return next(c)
		}
	}
}

func RequireAdmin() echo.MiddlewareFunc {
	return RequireRole("ADMIN")
}

func RequireUser() echo.MiddlewareFunc {
	return RequireRole("USER", "ADMIN")
}
