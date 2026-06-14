package handlers

import (
	"context"
	"io"

	"github.com/google/uuid"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/stretchr/testify/mock"
)

// MockStore is a shared mock implementation of db.Store for handler tests
type MockStore struct {
	mock.Mock
	generated.Querier // Satisfies the Querier interface
}

func (m *MockStore) GetRefreshToken(ctx context.Context, hash string) (generated.RefreshToken, error) {
	args := m.Called(ctx, hash)
	return args.Get(0).(generated.RefreshToken), args.Error(1)
}

func (m *MockStore) RevokeRefreshToken(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockStore) RevokeAllTokensByFamily(ctx context.Context, familyID uuid.UUID) error {
	args := m.Called(ctx, familyID)
	return args.Error(0)
}

func (m *MockStore) GetUserByID(ctx context.Context, id uuid.UUID) (generated.User, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(generated.User), args.Error(1)
}

func (m *MockStore) CreateRefreshToken(ctx context.Context, arg generated.CreateRefreshTokenParams) (generated.RefreshToken, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.RefreshToken), args.Error(1)
}

func (m *MockStore) GetQuizByID(ctx context.Context, id uuid.UUID) (generated.Quiz, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(generated.Quiz), args.Error(1)
}

func (m *MockStore) WithTx(_ context.Context, fn func(generated.Querier) error) error {
	return fn(m)
}

// MockMinio is a shared mock for MinioService
type MockMinio struct {
	mock.Mock
}

func (m *MockMinio) UploadFile(ctx context.Context, bucket, objectName string, fileReader io.Reader, fileSize int64, contentType string) error {
	args := m.Called(ctx, bucket, objectName, fileReader, fileSize, contentType)
	return args.Error(0)
}

func (m *MockMinio) GetObject(ctx context.Context, bucket, objectName string) (io.ReadCloser, int64, string, error) {
	args := m.Called(ctx, bucket, objectName)
	return args.Get(0).(io.ReadCloser), args.Get(1).(int64), args.String(2), args.Error(3)
}

func (m *MockMinio) DeleteObject(ctx context.Context, bucket, objectName string) error {
	args := m.Called(ctx, bucket, objectName)
	return args.Error(0)
}

// MockTaskService is a shared mock for Asynq tasks
type MockTaskService struct {
	mock.Mock
}

func (m *MockTaskService) EnqueueQuizBulkUpload(quizID, filePath, bucket string) error {
	args := m.Called(quizID, filePath, bucket)
	return args.Error(0)
}
