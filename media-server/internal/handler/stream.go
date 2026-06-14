package handler

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/shafin/course-platform/media-server/internal/middleware"
	"github.com/shafin/course-platform/media-server/internal/service"
)

type StreamHandler struct {
	transcodeService service.ITranscodeService
	cfg              *config.Config
}

func NewStreamHandler(transcodeService service.ITranscodeService, cfg *config.Config) *StreamHandler {
	return &StreamHandler{
		transcodeService: transcodeService,
		cfg:              cfg,
	}
}

// GetToken godoc
// @Summary Get HLS stream token
// @Description Generates a short-lived HMAC token for secure HLS playback
// @Tags Management
// @Param video_id path string true "ID of the video"
// @Security ApiKeyAuth
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /stream-token/{video_id} [get]
func (h *StreamHandler) GetToken(c echo.Context) error {
	videoID := c.Param("video_id")
	if videoID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "video_id required"})
	}

	token := middleware.GenerateStreamToken(videoID, h.cfg.StreamSecret, 1*time.Hour)
	return c.JSON(http.StatusOK, map[string]string{
		"token": token,
	})
}

// ServeStream handles all HLS related requests (manifest, segments, keys)
func (h *StreamHandler) ServeStream(c echo.Context) error {
	path := c.Param("*") // Get everything after /stream/
	parts := strings.Split(path, "/")

	if len(parts) < 2 {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid stream path"})
	}

	videoID := parts[0]
	fileName := parts[1]

	// Map virtual 'key' path to actual 'video.key' file
	if fileName == "key" {
		fileName = "video.key"
	}

	if err := h.validateAccess(c, videoID); err != nil {
		return err
	}

	return h.serveFile(c, videoID, fileName)
}

func (h *StreamHandler) validateAccess(c echo.Context, videoID string) error {
	if videoID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "video_id required"})
	}

	// 1. Try to get token from Query Param
	token := c.QueryParam("token")

	// 2. If not in Query, try Cookie
	if token == "" {
		cookie, err := c.Cookie("stream_token")
		if err == nil {
			token = cookie.Value
		}
	}

	if token == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Missing stream token"})
	}

	// Validate the token
	if err := middleware.ValidateStreamToken(token, videoID, h.cfg.StreamSecret); err != nil {
		fmt.Printf("[HLS ERROR] Token validation failed for video %s: %v\n", videoID, err)
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"message": "Access denied",
			"error":   err.Error(),
		})
	}

	// 3. If token was valid and came from URL, set/refresh the cookie for segments
	if c.QueryParam("token") != "" {
		cookie := new(http.Cookie)
		cookie.Name = "stream_token"
		cookie.Value = token
		cookie.Path = "/" // Important: accessible to all sub-requests
		cookie.Expires = time.Now().Add(2 * time.Hour)
		cookie.HttpOnly = true
		cookie.SameSite = http.SameSiteLaxMode
		c.SetCookie(cookie)
	}

	return nil
}

func (h *StreamHandler) serveFile(c echo.Context, videoID, fileName string) error {
	reader, size, contentType, err := h.transcodeService.GetStreamObject(c.Request().Context(), videoID, fileName)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "File not found"})
	}
	defer reader.Close()

	c.Response().Header().Set(echo.HeaderContentType, contentType)
	c.Response().Header().Set(echo.HeaderContentLength, fmt.Sprintf("%d", size))
	c.Response().WriteHeader(http.StatusOK)

	_, err = io.Copy(c.Response().Writer, reader)
	return err
}
