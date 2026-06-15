package handler

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/shafin/course-platform/media-server/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockMinioService
type MockMinioService struct {
	mock.Mock
}

func (m *MockMinioService) GetPresignedPutURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error) {
	args := m.Called(ctx, bucket, objectName, expiry)
	return args.String(0), args.Error(1)
}

func (m *MockMinioService) GetPresignedGetURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error) {
	args := m.Called(ctx, bucket, objectName, expiry)
	return args.String(0), args.Error(1)
}

func (m *MockMinioService) UploadFile(ctx context.Context, bucket, objectName string, fileReader io.Reader, fileSize int64, contentType string) error {
	args := m.Called(ctx, bucket, objectName, fileReader, fileSize, contentType)
	return args.Error(0)
}

func (m *MockMinioService) ListObjects(ctx context.Context, bucket string) []string {
	args := m.Called(ctx, bucket)
	return args.Get(0).([]string)
}

func (m *MockMinioService) DeleteObject(ctx context.Context, bucket, objectName string) error {
	args := m.Called(ctx, bucket, objectName)
	return args.Error(0)
}

func (m *MockMinioService) GetObject(ctx context.Context, bucket, objectName string) (io.ReadCloser, int64, string, error) {
	args := m.Called(ctx, bucket, objectName)
	var r io.ReadCloser
	if args.Get(0) != nil {
		r = args.Get(0).(io.ReadCloser)
	}
	return r, args.Get(1).(int64), args.String(2), args.Error(3)
}

// MockTranscodeService
type MockTranscodeService struct {
	mock.Mock
}

func (m *MockTranscodeService) ProcessVideo(videoID string, inputPath string, opts *service.TranscodeOptions) {
	m.Called(videoID, inputPath, opts)
}

func (m *MockTranscodeService) GetStreamObject(ctx context.Context, videoID, fileName string) (io.ReadCloser, int64, string, error) {
	args := m.Called(ctx, videoID, fileName)
	var r io.ReadCloser
	if args.Get(0) != nil {
		r = args.Get(0).(io.ReadCloser)
	}
	return r, args.Get(1).(int64), args.String(2), args.Error(3)
}

// MockTaskProcessor
type MockTaskProcessor struct {
	mock.Mock
}

func (m *MockTaskProcessor) EnqueueTranscode(videoID string, inputPath string, opts *service.TranscodeOptions) (string, error) {
	args := m.Called(videoID, inputPath, opts)
	return args.String(0), args.Error(1)
}
func (m *MockTaskProcessor) GetTaskStatus(taskID string) (string, error) {
	args := m.Called(taskID)
	return args.String(0), args.Error(1)
}
func (m *MockTaskProcessor) Start() error { return nil }
func (m *MockTaskProcessor) Stop()        {}

type testNopCloser struct {
	io.Reader
}

func (testNopCloser) Close() error { return nil }

func TestHandler(t *testing.T) {
	e := echo.New()
	cfg := &config.Config{
		MinioBucketRaw:    "raw",
		MinioBucketPublic: "public",
		PublicBaseURL:     "http://test",
	}

	t.Run("HealthCheck", func(t *testing.T) {
		h := NewHandler(nil, nil, nil, cfg)
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		if assert.NoError(t, h.HealthCheck(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
		}
	})

	t.Run("GetUploadURL Success", func(t *testing.T) {
		m := new(MockMinioService)
		h := NewHandler(m, nil, nil, cfg)
		m.On("GetPresignedPutURL", mock.Anything, "raw", mock.Anything, mock.Anything).Return("http://url", nil)

		req := httptest.NewRequest(http.MethodGet, "/upload-url?file_name=test.mp4", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		if assert.NoError(t, h.GetUploadURL(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Contains(t, rec.Body.String(), "http://url")
		}
	})

	t.Run("GetPublicFile Success", func(t *testing.T) {
		m := new(MockMinioService)
		h := NewHandler(m, nil, nil, cfg)
		content := "public data"
		m.On("GetObject", mock.Anything, "public", "test.jpg").Return(testNopCloser{Reader: strings.NewReader(content)}, int64(len(content)), "image/jpeg", nil)

		req := httptest.NewRequest(http.MethodGet, "/p/test.jpg", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("file_name")
		c.SetParamValues("test.jpg")

		if assert.NoError(t, h.GetPublicFile(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, content, rec.Body.String())
		}
	})

	t.Run("GetDownloadURL Success", func(t *testing.T) {
		m := new(MockMinioService)
		h := NewHandler(m, nil, nil, cfg)
		m.On("GetPresignedGetURL", mock.Anything, "raw", "test.mp4", mock.Anything).Return("http://down", nil)

		req := httptest.NewRequest(http.MethodGet, "/files/test.mp4", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("file_name")
		c.SetParamValues("test.mp4")

		if assert.NoError(t, h.GetDownloadURL(c)) {
			assert.Equal(t, http.StatusTemporaryRedirect, rec.Code)
			assert.Equal(t, "http://down", rec.Header().Get(echo.HeaderLocation))
		}
	})

	t.Run("ListFiles Success", func(t *testing.T) {
		m := new(MockMinioService)
		h := NewHandler(m, nil, nil, cfg)
		m.On("ListObjects", mock.Anything, "raw").Return([]string{"f1", "f2"})

		req := httptest.NewRequest(http.MethodGet, "/files", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		if assert.NoError(t, h.ListFiles(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Contains(t, rec.Body.String(), "f1")
		}
	})

	t.Run("DeleteFile Success", func(t *testing.T) {
		m := new(MockMinioService)
		h := NewHandler(m, nil, nil, cfg)
		m.On("DeleteObject", mock.Anything, "raw", "test.txt").Return(nil)

		req := httptest.NewRequest(http.MethodDelete, "/files/test.txt", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("file_name")
		c.SetParamValues("test.txt")

		if assert.NoError(t, h.DeleteFile(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
		}
	})

	t.Run("UploadFile Private Success", func(t *testing.T) {
		m := new(MockMinioService)
		tp := new(MockTaskProcessor)
		h := NewHandler(m, nil, tp, cfg)

		body := new(bytes.Buffer)
		writer := multipart.NewWriter(body)
		part, _ := writer.CreateFormFile("file", "video.mp4")
		_, _ = part.Write([]byte("mp4"))
		writer.Close()

		m.On("UploadFile", mock.Anything, "raw", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
		tp.On("EnqueueTranscode", mock.Anything, mock.Anything, mock.Anything).Return("task-123", nil)

		req := httptest.NewRequest(http.MethodPost, "/upload", body)
		req.Header.Set(echo.HeaderContentType, writer.FormDataContentType())
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		if assert.NoError(t, h.UploadFile(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
		}
	})

	t.Run("TriggerTranscode Success", func(t *testing.T) {
		tp := new(MockTaskProcessor)
		h := NewHandler(nil, nil, tp, cfg)
		tp.On("EnqueueTranscode", "test.mp4", "", mock.Anything).Return("task-456", nil)

		jsonBody := `{"file_name": "test.mp4", "options": {"video_bitrate": "1M"}}`
		req := httptest.NewRequest(http.MethodPost, "/transcode", strings.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		if assert.NoError(t, h.TriggerTranscode(c)) {
			assert.Equal(t, http.StatusAccepted, rec.Code)
		}
	})

	t.Run("Readme Success", func(t *testing.T) {
		// Create a dummy README.md for the test
		err := os.WriteFile("README.md", []byte("# Test README"), 0644)
		assert.NoError(t, err)
		defer os.Remove("README.md")

		h := NewHandler(nil, nil, nil, cfg)
		req := httptest.NewRequest(http.MethodGet, "/docs/readme", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		if assert.NoError(t, h.Readme(c)) {
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Contains(t, rec.Body.String(), "<title>README - Media Server</title>")
			assert.Contains(t, rec.Body.String(), "marked.parse")
		}
	})
}
