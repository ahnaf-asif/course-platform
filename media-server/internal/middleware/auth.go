package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func APIKeyAuth(apiKey, streamSecret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			key := c.Request().Header.Get("X-API-KEY")
			if key == "" {
				key = c.QueryParam("api_key")
			}

			// 1. Check permanent API Key
			if key != "" && key == apiKey {
				return next(c)
			}

			// 2. Check for temporary Upload Token
			uploadToken := c.QueryParam("upload_token")
			if uploadToken != "" {
				// Validate it as a generic stream token but for "upload" action
				if err := ValidateStreamToken(uploadToken, "upload", streamSecret); err == nil {
					return next(c)
				}
			}

			return c.JSON(http.StatusUnauthorized, map[string]string{
				"message": "Invalid or missing authorization",
			})
		}
	}
}
