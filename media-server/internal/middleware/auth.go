package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func APIKeyAuth(apiKey string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			key := c.Request().Header.Get("X-API-KEY")
			if key == "" {
				key = c.QueryParam("api_key")
			}

			if key != apiKey {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"message": "Invalid or missing API key",
				})
			}
			return next(c)
		}
	}
}
