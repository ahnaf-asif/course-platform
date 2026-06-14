package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

const (
	// ClockDriftAllowance allows for 1 minute of clock difference between servers
	ClockDriftAllowance = 1 * time.Minute
)

// GenerateStreamToken generates a production-grade HMAC token for a video ID
// Format: base64(videoID).expiration.signature
func GenerateStreamToken(videoID, secret string, expiry time.Duration) string {
	expiration := time.Now().Add(expiry).Unix()
	b64VideoID := base64.RawURLEncoding.EncodeToString([]byte(videoID))

	payload := fmt.Sprintf("%s.%d", b64VideoID, expiration)

	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	signature := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	return fmt.Sprintf("%s.%s", payload, signature)
}

// ValidateStreamToken verifies the token's signature and expiration
func ValidateStreamToken(token, expectedVideoID, secret string) error {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return fmt.Errorf("invalid token format: expected 3 parts, got %d", len(parts))
	}

	b64VideoID := parts[0]
	expiresStr := parts[1]
	providedSignature := parts[2]

	// 1. Verify Video ID matches
	decodedVideoID, err := base64.RawURLEncoding.DecodeString(b64VideoID)
	if err != nil {
		return fmt.Errorf("failed to decode video ID from token: %v", err)
	}
	if string(decodedVideoID) != expectedVideoID {
		return fmt.Errorf("token video ID mismatch: got %s, expected %s", string(decodedVideoID), expectedVideoID)
	}

	// 2. Verify Signature
	payload := fmt.Sprintf("%s.%s", b64VideoID, expiresStr)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	expectedSignature := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	// Use ConstantTimeCompare to prevent timing attacks
	if subtle.ConstantTimeCompare([]byte(providedSignature), []byte(expectedSignature)) != 1 {
		return fmt.Errorf("invalid token signature: mismatch between provided and expected")
	}

	// 3. Verify Expiration
	expiresAt, err := strconv.ParseInt(expiresStr, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid expiration format in token")
	}

	if time.Now().Unix() > (expiresAt + int64(ClockDriftAllowance.Seconds())) {
		return fmt.Errorf("token expired: expires at %d, current time %d", expiresAt, time.Now().Unix())
	}

	return nil
}

func HLSProtection(secret, allowedOriginsStr string) echo.MiddlewareFunc {
	allowedOrigins := strings.Split(allowedOriginsStr, ",")
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// 1. Referer Validation
			referer := c.Request().Referer()
			isAllowed := false

			if allowedOriginsStr == "*" {
				isAllowed = true
			} else if referer != "" {
				for _, origin := range allowedOrigins {
					if strings.HasPrefix(referer, origin) {
						isAllowed = true
						break
					}
				}
			} else {
				// If referer is missing, we check if localhost is allowed
				// This is common for HEAD requests or programmatic checks from the browser
				for _, origin := range allowedOrigins {
					if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
						isAllowed = true
						break
					}
				}
			}

			if !isAllowed && allowedOriginsStr != "*" {
				return c.JSON(http.StatusForbidden, map[string]string{
					"message": "Referer unauthorized", 
					"referer": referer,
				})
			}

			// 2. Token Validation
			token := c.QueryParam("token")
			if token == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Missing stream token"})
			}

			videoID := c.Param("video_id")
			if err := ValidateStreamToken(token, videoID, secret); err != nil {
				// LOG THE FAILURE REASON
				fmt.Printf("[HLS ERROR] Token validation failed for video %s: %v\n", videoID, err)
				
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"message": "Access denied",
					"error":   err.Error(),
				})
			}

			return next(c)
		}
	}
}
