package service

import (
	"context"
	"io"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockMinioClient struct {
	mock.Mock
}

func (m *MockMinioClient) BucketExists(ctx context.Context, bucketName string) (bool, error) {
	args := m.Called(ctx, bucketName)
	return args.Bool(0), args.Error(1)
}

func (m *MockMinioClient) MakeBucket(ctx context.Context, bucketName string, opts minio.MakeBucketOptions) error {
	args := m.Called(ctx, bucketName, opts)
	return args.Error(0)
}

func (m *MockMinioClient) PresignedPutObject(ctx context.Context, bucketName, objectName string, expires time.Duration) (*url.URL, error) {
	args := m.Called(ctx, bucketName, objectName, expires)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*url.URL), args.Error(1)
}

func (m *MockMinioClient) PresignedGetObject(ctx context.Context, bucketName, objectName string, expires time.Duration, reqParams url.Values) (*url.URL, error) {
	args := m.Called(ctx, bucketName, objectName, expires, reqParams)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*url.URL), args.Error(1)
}

func (m *MockMinioClient) PutObject(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, opts minio.PutObjectOptions) (info minio.UploadInfo, err error) {
	args := m.Called(ctx, bucketName, objectName, reader, objectSize, opts)
	return args.Get(0).(minio.UploadInfo), args.Error(1)
}

func (m *MockMinioClient) ListObjects(ctx context.Context, bucketName string, opts minio.ListObjectsOptions) <-chan minio.ObjectInfo {
	args := m.Called(ctx, bucketName, opts)
	return args.Get(0).(<-chan minio.ObjectInfo)
}

func (m *MockMinioClient) RemoveObject(ctx context.Context, bucketName, objectName string, opts minio.RemoveObjectOptions) error {
	args := m.Called(ctx, bucketName, objectName, opts)
	return args.Error(0)
}

func (m *MockMinioClient) GetObject(ctx context.Context, bucketName, objectName string, opts minio.GetObjectOptions) (io.ReadCloser, minio.ObjectInfo, error) {
	args := m.Called(ctx, bucketName, objectName, opts)
	var r io.ReadCloser
	if args.Get(0) != nil {
		r = args.Get(0).(io.ReadCloser)
	}
	return r, args.Get(1).(minio.ObjectInfo), args.Error(2)
}

type minioNopCloser struct {
	io.Reader
}

func (minioNopCloser) Close() error { return nil }

func TestMinioService(t *testing.T) {
	mockClient := new(MockMinioClient)
	cfg := &config.Config{
		MinioBucketRaw:       "raw",
		MinioBucketProcessed: "processed",
		MinioBucketPublic:    "public",
	}
	ctx := context.Background()

	t.Run("NewMinioServiceWithClient Bucket Creation", func(t *testing.T) {
		m := new(MockMinioClient)
		m.On("BucketExists", mock.Anything, "raw").Return(false, nil)
		m.On("MakeBucket", mock.Anything, "raw", mock.Anything).Return(nil)
		m.On("BucketExists", mock.Anything, "processed").Return(false, nil)
		m.On("MakeBucket", mock.Anything, "processed", mock.Anything).Return(nil)
		m.On("BucketExists", mock.Anything, "public").Return(false, nil)
		m.On("MakeBucket", mock.Anything, "public", mock.Anything).Return(nil)

		svc, err := NewMinioServiceWithClients(m, m, cfg)
		assert.NoError(t, err)
		assert.NotNil(t, svc)
		m.AssertExpectations(t)
	})

	t.Run("NewMinioServiceWithClient BucketExists Error", func(t *testing.T) {
		m := new(MockMinioClient)
		m.On("BucketExists", mock.Anything, "raw").Return(false, io.EOF)

		svc, err := NewMinioServiceWithClients(m, m, cfg)
		assert.Error(t, err)
		assert.Nil(t, svc)
	})

	t.Run("NewMinioServiceWithClient MakeBucket Error", func(t *testing.T) {
		m := new(MockMinioClient)
		m.On("BucketExists", mock.Anything, "raw").Return(false, nil)
		m.On("MakeBucket", mock.Anything, "raw", mock.Anything).Return(io.EOF)

		svc, err := NewMinioServiceWithClients(m, m, cfg)
		assert.Error(t, err)
		assert.Nil(t, svc)
	})

	svc := &MinioService{
		client: mockClient,
		signer: mockClient,
		cfg:    cfg,
	}

	t.Run("GetObject Error", func(t *testing.T) {
		mockClient.On("GetObject", ctx, "raw", "missing.txt", mock.Anything).Return(nil, minio.ObjectInfo{}, io.EOF)
		_, _, _, err := svc.GetObject(ctx, "raw", "missing.txt")
		assert.Error(t, err)
	})

	t.Run("GetPresignedPutURL", func(t *testing.T) {
		u, _ := url.Parse("http://test.url")
		mockClient.On("PresignedPutObject", ctx, "raw", "test.mp4", mock.Anything).Return(u, nil)
		res, err := svc.GetPresignedPutURL(ctx, "raw", "test.mp4", 15*time.Minute)
		assert.NoError(t, err)
		assert.Equal(t, u.String(), res)
	})

	t.Run("GetPresignedGetURL", func(t *testing.T) {
		u, _ := url.Parse("http://test.url")
		mockClient.On("PresignedGetObject", ctx, "raw", "test.mp4", mock.Anything, mock.Anything).Return(u, nil)
		res, err := svc.GetPresignedGetURL(ctx, "raw", "test.mp4", 1*time.Hour)
		assert.NoError(t, err)
		assert.Equal(t, u.String(), res)
	})

	t.Run("GetObject Success", func(t *testing.T) {
		content := "data"
		reader := minioNopCloser{Reader: strings.NewReader(content)}
		info := minio.ObjectInfo{Size: 4, ContentType: "text/plain"}
		mockClient.On("GetObject", ctx, "raw", "test.txt", mock.Anything).Return(reader, info, nil)
		resReader, size, contentType, err := svc.GetObject(ctx, "raw", "test.txt")
		assert.NoError(t, err)
		assert.Equal(t, int64(4), size)
		assert.Equal(t, "text/plain", contentType)
		resReader.Close()
	})

	t.Run("UploadFile Success", func(t *testing.T) {
		reader := strings.NewReader("content")
		mockClient.On("PutObject", ctx, "raw", "test.txt", mock.Anything, mock.Anything, mock.Anything).Return(minio.UploadInfo{}, nil)
		err := svc.UploadFile(ctx, "raw", "test.txt", reader, 7, "text/plain")
		assert.NoError(t, err)
	})

	t.Run("ListObjects Success", func(t *testing.T) {
		ch := make(chan minio.ObjectInfo, 1)
		ch <- minio.ObjectInfo{Key: "test.mp4"}
		close(ch)
		mockClient.On("ListObjects", ctx, "raw", mock.Anything).Return((<-chan minio.ObjectInfo)(ch))
		res := svc.ListObjects(ctx, "raw")
		assert.Len(t, res, 1)
		assert.Equal(t, "test.mp4", res[0])
	})

	t.Run("DeleteObject Success", func(t *testing.T) {
		mockClient.On("RemoveObject", ctx, "raw", "test.txt", mock.Anything).Return(nil)
		err := svc.DeleteObject(ctx, "raw", "test.txt")
		assert.NoError(t, err)
	})
}
