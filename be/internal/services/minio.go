package services

import (
	"context"
	"io"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinioConfig struct {
	Endpoint     string
	AccessKey    string
	SecretKey    string
	UseSSL       bool
	ImportBucket string
}

type IMinioService interface {
	UploadFile(ctx context.Context, bucket, objectName string, fileReader io.Reader, fileSize int64, contentType string) error
	GetObject(ctx context.Context, bucket, objectName string) (io.ReadCloser, int64, string, error)
	DeleteObject(ctx context.Context, bucket, objectName string) error
}

type MinioService struct {
	client *minio.Client
	cfg    *MinioConfig
}

func NewMinioService(cfg *MinioConfig) (*MinioService, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}

	// Ensure import bucket exists
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, cfg.ImportBucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		err = client.MakeBucket(ctx, cfg.ImportBucket, minio.MakeBucketOptions{})
		if err != nil {
			return nil, err
		}
		log.Printf("Bucket %s created successfully\n", cfg.ImportBucket)
	}

	return &MinioService{
		client: client,
		cfg:    cfg,
	}, nil
}

func (s *MinioService) UploadFile(ctx context.Context, bucket, objectName string, fileReader io.Reader, fileSize int64, contentType string) error {
	_, err := s.client.PutObject(ctx, bucket, objectName, fileReader, fileSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (s *MinioService) GetObject(ctx context.Context, bucket, objectName string) (io.ReadCloser, int64, string, error) {
	obj, err := s.client.GetObject(ctx, bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, 0, "", err
	}
	stat, err := obj.Stat()
	if err != nil {
		return nil, 0, "", err
	}
	return obj, stat.Size, stat.ContentType, nil
}

func (s *MinioService) DeleteObject(ctx context.Context, bucket, objectName string) error {
	return s.client.RemoveObject(ctx, bucket, objectName, minio.RemoveObjectOptions{})
}
