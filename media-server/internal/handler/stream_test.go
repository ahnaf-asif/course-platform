package handler

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type streamNopCloser struct {
	io.Reader
}

func (streamNopCloser) Close() error { return nil }

func TestStreamHandler(t *testing.T) {
	e := echo.New()
	mockTranscode := new(MockTranscodeService)
	cfg := &config.Config{StreamSecret: "secret"}
	sh := NewStreamHandler(mockTranscode, cfg)

	t.Run("GetToken Success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/stream-token/video1", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id")
		c.SetParamValues("video1")

		if assert.NoError(t, sh.GetToken(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Contains(t, rec.Body.String(), "token")
		}
	})

	t.Run("ServeManifest Success", func(t *testing.T) {
		content := "manifest content"
		reader := streamNopCloser{Reader: strings.NewReader(content)}
		mockTranscode.On("GetStreamObject", mock.Anything, "video1", "index.m3u8").Return(reader, int64(len(content)), "application/x-mpegURL", nil)

		req := httptest.NewRequest(http.MethodGet, "/stream/video1/index.m3u8", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id")
		c.SetParamValues("video1")

		if assert.NoError(t, sh.ServeManifest(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, content, rec.Body.String())
		}
	})

	t.Run("ServeSegment Success", func(t *testing.T) {
		content := "segment data"
		reader := streamNopCloser{Reader: strings.NewReader(content)}
		mockTranscode.On("GetStreamObject", mock.Anything, "video1", "seg1.ts").Return(reader, int64(len(content)), "video/MP2T", nil)

		req := httptest.NewRequest(http.MethodGet, "/stream/video1/seg1.ts", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id", "segment")
		c.SetParamValues("video1", "seg1.ts")

		if assert.NoError(t, sh.ServeSegment(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, "video/MP2T", rec.Header().Get(echo.HeaderContentType))
		}
	})

	t.Run("ServeKey Success", func(t *testing.T) {
		content := "keydata"
		reader := streamNopCloser{Reader: strings.NewReader(content)}
		mockTranscode.On("GetStreamObject", mock.Anything, "video1", "video.key").Return(reader, int64(len(content)), "application/octet-stream", nil)

		req := httptest.NewRequest(http.MethodGet, "/stream/video1/key", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("video_id")
		c.SetParamValues("video1")

		if assert.NoError(t, sh.ServeKey(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, content, rec.Body.String())
		}
	})
}
