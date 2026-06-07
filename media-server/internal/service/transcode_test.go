package service

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockExecutor struct {
	mock.Mock
}

func (m *MockExecutor) Execute(name string, arg ...string) ([]byte, error) {
	args := m.Called(name, arg)
	return args.Get(0).([]byte), args.Error(1)
}

type MockMinioServiceForTranscode struct {
	mock.Mock
}

func (m *MockMinioServiceForTranscode) GetPresignedPutURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error) {
	return "", nil
}
func (m *MockMinioServiceForTranscode) GetPresignedGetURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error) {
	return "", nil
}
func (m *MockMinioServiceForTranscode) UploadFile(ctx context.Context, bucket, objectName string, fileReader io.Reader, fileSize int64, contentType string) error {
	args := m.Called(ctx, bucket, objectName, fileReader, fileSize, contentType)
	return args.Error(0)
}
func (m *MockMinioServiceForTranscode) ListObjects(ctx context.Context, bucket string) []string {
	return nil
}
func (m *MockMinioServiceForTranscode) DeleteObject(ctx context.Context, bucket, objectName string) error {
	return nil
}
func (m *MockMinioServiceForTranscode) GetObject(ctx context.Context, bucket, objectName string) (io.ReadCloser, int64, string, error) {
	args := m.Called(ctx, bucket, objectName)
	var r io.ReadCloser
	if args.Get(0) != nil {
		r = args.Get(0).(io.ReadCloser)
	}
	return r, args.Get(1).(int64), args.String(2), args.Error(3)
}

func TestRealExecutor(t *testing.T) {
	e := &RealExecutor{}
	t.Run("Success", func(t *testing.T) {
		out, _ := e.Execute("echo", "hello")
		assert.Contains(t, string(out), "hello")
	})
}

func TestNewTranscodeService(t *testing.T) {
	svc := NewTranscodeService(nil, &config.Config{})
	assert.NotNil(t, svc)
}

func TestTranscodeService(t *testing.T) {
	mockMinio := new(MockMinioServiceForTranscode)
	mockExecutor := new(MockExecutor)
	cfg := &config.Config{
		PublicBaseURL:        "http://test",
		MinioBucketRaw:       "raw",
		MinioBucketProcessed: "processed",
	}
	svc := &TranscodeService{
		minioService: mockMinio,
		cfg:          cfg,
		executor:     mockExecutor,
	}

	t.Run("ProcessVideo Success", func(t *testing.T) {
		videoID := "v1"
		inputPath := filepath.Join(t.TempDir(), "in.mp4")
		_ = os.WriteFile(inputPath, []byte("data"), 0644)

		mockExecutor.On("Execute", "ffmpeg", mock.Anything).Return([]byte("ok"), nil).Run(func(args mock.Arguments) {
			workDir := filepath.Join(os.TempDir(), "transcode-"+videoID)
			_ = os.MkdirAll(workDir, 0755)
			_ = os.WriteFile(filepath.Join(workDir, "index.m3u8"), []byte("m3u8"), 0644)
		})

		mockMinio.On("UploadFile", mock.Anything, "processed", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

		svc.ProcessVideo(videoID, inputPath, nil)
	})

	t.Run("ProcessVideo Download from Minio", func(t *testing.T) {
		videoID := "v2"
		content := "video data"
		mockMinio.On("GetObject", mock.Anything, "raw", videoID).Return(minioNopCloser{Reader: strings.NewReader(content)}, int64(len(content)), "video/mp4", nil)

		mockExecutor.On("Execute", "ffmpeg", mock.Anything).Return([]byte("ok"), nil).Run(func(args mock.Arguments) {
			workDir := filepath.Join(os.TempDir(), "transcode-"+videoID)
			_ = os.MkdirAll(workDir, 0755)
			_ = os.WriteFile(filepath.Join(workDir, "index.m3u8"), []byte("m3u8"), 0644)
		})
		mockMinio.On("UploadFile", mock.Anything, "processed", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

		svc.ProcessVideo(videoID, "", nil)
	})

	t.Run("ProcessVideo Minio Download Error", func(t *testing.T) {
		videoID := "v3"
		mockMinio.On("GetObject", mock.Anything, "raw", videoID).Return(nil, int64(0), "", io.EOF)
		svc.ProcessVideo(videoID, "", nil)
	})

	t.Run("GetStreamObject Success", func(t *testing.T) {
		content := "m3u8 data"
		mockMinio.On("GetObject", mock.Anything, "processed", "hls/v1/index.m3u8").Return(minioNopCloser{Reader: strings.NewReader(content)}, int64(len(content)), "application/x-mpegURL", nil)

		reader, size, contentType, err := svc.GetStreamObject(context.Background(), "v1", "index.m3u8")
		assert.NoError(t, err)
		assert.Equal(t, int64(len(content)), size)
		assert.Equal(t, "application/x-mpegURL", contentType)
		reader.Close()
	})
}
