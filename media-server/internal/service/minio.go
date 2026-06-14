package service

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/shafin/course-platform/media-server/internal/config"
)

type MinioClient interface {
	BucketExists(ctx context.Context, bucketName string) (bool, error)
	MakeBucket(ctx context.Context, bucketName string, opts minio.MakeBucketOptions) error
	PresignedPutObject(ctx context.Context, bucketName, objectName string, expires time.Duration) (*url.URL, error)
	PresignedGetObject(ctx context.Context, bucketName, objectName string, expires time.Duration, reqParams url.Values) (*url.URL, error)
	PutObject(ctx context.Context, bucketName, objectName string, reader io.Reader, objectSize int64, opts minio.PutObjectOptions) (info minio.UploadInfo, err error)
	ListObjects(ctx context.Context, bucketName string, opts minio.ListObjectsOptions) <-chan minio.ObjectInfo
	RemoveObject(ctx context.Context, bucketName, objectName string, opts minio.RemoveObjectOptions) error
	GetObject(ctx context.Context, bucketName, objectName string, opts minio.GetObjectOptions) (io.ReadCloser, minio.ObjectInfo, error)
}

type RealMinioClient struct {
	*minio.Client
}

func (c *RealMinioClient) GetObject(ctx context.Context, bucketName, objectName string, opts minio.GetObjectOptions) (io.ReadCloser, minio.ObjectInfo, error) {
	obj, err := c.Client.GetObject(ctx, bucketName, objectName, opts)
	if err != nil {
		return nil, minio.ObjectInfo{}, err
	}
	stat, err := obj.Stat()
	if err != nil {
		return nil, minio.ObjectInfo{}, err
	}
	return obj, stat, nil
}

type IMinioService interface {
	GetPresignedPutURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error)
	GetPresignedGetURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error)
	UploadFile(ctx context.Context, bucket, objectName string, fileReader io.Reader, fileSize int64, contentType string) error
	ListObjects(ctx context.Context, bucket string) []string
	DeleteObject(ctx context.Context, bucket, objectName string) error
	GetObject(ctx context.Context, bucket, objectName string) (io.ReadCloser, int64, string, error)
}

type MinioService struct {
	client MinioClient
	signer MinioClient // Client configured with public endpoint for signing
	cfg    *config.Config
}

func NewMinioService(cfg *config.Config) (*MinioService, error) {
	client, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		return nil, err
	}

	// Create a signer client using the public endpoint
	signer, err := minio.New(cfg.MinioPublicEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		return nil, err
	}

	realClient := &RealMinioClient{Client: client}
	realSigner := &RealMinioClient{Client: signer}
	return NewMinioServiceWithClients(realClient, realSigner, cfg)
}

func NewMinioServiceWithClients(client MinioClient, signer MinioClient, cfg *config.Config) (*MinioService, error) {
	// Ensure all three buckets exist
	ctx := context.Background()
	buckets := []string{cfg.MinioBucketRaw, cfg.MinioBucketProcessed, cfg.MinioBucketPublic}

	for _, bucket := range buckets {
		exists, err := client.BucketExists(ctx, bucket)
		if err != nil {
			return nil, err
		}
		if !exists {
			err = client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
			if err != nil {
				return nil, err
			}
			log.Printf("Bucket %s created successfully\n", bucket)
		}
	}

	return &MinioService{
		client: client,
		signer: signer,
		cfg:    cfg,
	}, nil
}

func (s *MinioService) GetPresignedPutURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error) {
	presignedURL, err := s.signer.PresignedPutObject(ctx, bucket, objectName, expiry)
	if err != nil {
		return "", err
	}
	return presignedURL.String(), nil
}

func (s *MinioService) GetPresignedGetURL(ctx context.Context, bucket, objectName string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	presignedURL, err := s.signer.PresignedGetObject(ctx, bucket, objectName, expiry, reqParams)
	if err != nil {
		return "", err
	}
	return presignedURL.String(), nil
}

func (s *MinioService) UploadFile(ctx context.Context, bucket, objectName string, fileReader io.Reader, fileSize int64, contentType string) error {
	_, err := s.client.PutObject(ctx, bucket, objectName, fileReader, fileSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (s *MinioService) ListObjects(ctx context.Context, bucket string) []string {
	var objects []string
	objectCh := s.client.ListObjects(ctx, bucket, minio.ListObjectsOptions{
		Recursive: true,
	})
	for object := range objectCh {
		if object.Err != nil {
			fmt.Println(object.Err)
			return objects
		}
		objects = append(objects, object.Key)
	}
	return objects
}

func (s *MinioService) DeleteObject(ctx context.Context, bucket, objectName string) error {
	return s.client.RemoveObject(ctx, bucket, objectName, minio.RemoveObjectOptions{})
}

func (s *MinioService) GetObject(ctx context.Context, bucket, objectName string) (io.ReadCloser, int64, string, error) {
	obj, stat, err := s.client.GetObject(ctx, bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, 0, "", err
	}
	return obj, stat.Size, stat.ContentType, nil
}
