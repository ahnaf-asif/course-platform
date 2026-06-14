package handler

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/shafin/course-platform/media-server/internal/middleware"
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

	t.Run("ServeStream Manifest Success", func(t *testing.T) {
		videoID := "video1"
		token := middleware.GenerateStreamToken(videoID, cfg.StreamSecret, 1*time.Hour)
		content := "manifest content"
		reader := streamNopCloser{Reader: strings.NewReader(content)}
		mockTranscode.On("GetStreamObject", mock.Anything, videoID, "index.m3u8").Return(reader, int64(len(content)), "application/x-mpegURL", nil)

		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/index.m3u8?token="+token, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("*")
		c.SetParamValues(videoID + "/index.m3u8")

		if assert.NoError(t, sh.ServeStream(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, content, rec.Body.String())
			// Verify cookie was set
			cookies := rec.Result().Cookies()
			found := false
			for _, cookie := range cookies {
				if cookie.Name == "stream_token" {
					found = true
					assert.Equal(t, token, cookie.Value)
				}
			}
			assert.True(t, found, "stream_token cookie should be set")
		}
	})

	t.Run("ServeStream Segment Success via Cookie", func(t *testing.T) {
		videoID := "video1"
		token := middleware.GenerateStreamToken(videoID, cfg.StreamSecret, 1*time.Hour)
		content := "segment data"
		reader := streamNopCloser{Reader: strings.NewReader(content)}
		mockTranscode.On("GetStreamObject", mock.Anything, videoID, "seg1.ts").Return(reader, int64(len(content)), "video/MP2T", nil)

		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/seg1.ts", nil)
		req.AddCookie(&http.Cookie{Name: "stream_token", Value: token})
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("*")
		c.SetParamValues(videoID + "/seg1.ts")

		if assert.NoError(t, sh.ServeStream(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, "video/MP2T", rec.Header().Get(echo.HeaderContentType))
		}
	})

	t.Run("ServeStream Key Success", func(t *testing.T) {
		videoID := "video1"
		token := middleware.GenerateStreamToken(videoID, cfg.StreamSecret, 1*time.Hour)
		content := "keydata"
		reader := streamNopCloser{Reader: strings.NewReader(content)}
		mockTranscode.On("GetStreamObject", mock.Anything, videoID, "video.key").Return(reader, int64(len(content)), "application/octet-stream", nil)

		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/key?token="+token, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("*")
		c.SetParamValues(videoID + "/key")

		if assert.NoError(t, sh.ServeStream(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, content, rec.Body.String())
		}
	})

	t.Run("ServeStream Unauthorized", func(t *testing.T) {
		videoID := "video1"
		req := httptest.NewRequest(http.MethodGet, "/stream/"+videoID+"/index.m3u8", nil) // No token
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("*")
		c.SetParamValues(videoID + "/index.m3u8")

		if assert.NoError(t, sh.ServeStream(c)) {
			assert.Equal(t, http.StatusUnauthorized, rec.Code)
		}
	})
}
