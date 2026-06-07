package handler

import (
	"fmt"
	"io"
	"net/http"
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

// ServeManifest godoc
// @Summary Serve HLS manifest
// @Description Serves the .m3u8 playlist file. Requires valid token and referer.
// @Tags Streaming
// @Param video_id path string true "ID of the video"
// @Param token query string true "Session token"
// @Success 200
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /stream/{video_id}/index.m3u8 [get]
func (h *StreamHandler) ServeManifest(c echo.Context) error {
	videoID := c.Param("video_id")
	return h.serveFile(c, videoID, "index.m3u8")
}

// ServeSegment godoc
// @Summary Serve HLS segment
// @Description Serves encrypted .ts video segments. Requires valid token and referer.
// @Tags Streaming
// @Param video_id path string true "ID of the video"
// @Param segment path string true "Segment filename"
// @Param token query string true "Session token"
// @Success 200
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /stream/{video_id}/{segment} [get]
func (h *StreamHandler) ServeSegment(c echo.Context) error {
	videoID := c.Param("video_id")
	segment := c.Param("segment")
	return h.serveFile(c, videoID, segment)
}

// ServeKey godoc
// @Summary Serve AES decryption key
// @Description Serves the AES-128 key for segment decryption. Requires valid token and referer.
// @Tags Streaming
// @Param video_id path string true "ID of the video"
// @Param token query string true "Session token"
// @Success 200
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /stream/{video_id}/key [get]
func (h *StreamHandler) ServeKey(c echo.Context) error {
	videoID := c.Param("video_id")
	return h.serveFile(c, videoID, "video.key")
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
