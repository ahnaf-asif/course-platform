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

func (m *MockStore) GetActiveOrderByUserAndNode(ctx context.Context, arg generated.GetActiveOrderByUserAndNodeParams) (generated.Order, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.Order), args.Error(1)
}

func (m *MockStore) GetPaymentGateByNode(ctx context.Context, nodeID uuid.UUID) (generated.PaymentGate, error) {
	args := m.Called(ctx, nodeID)
	return args.Get(0).(generated.PaymentGate), args.Error(1)
}

func (m *MockStore) DeletePaymentGate(ctx context.Context, nodeID uuid.UUID) error {
	args := m.Called(ctx, nodeID)
	return args.Error(0)
}

func (m *MockStore) UpsertPaymentGate(ctx context.Context, arg generated.UpsertPaymentGateParams) (generated.PaymentGate, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.PaymentGate), args.Error(1)
}

func (m *MockStore) CreateOrder(ctx context.Context, arg generated.CreateOrderParams) (generated.Order, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.Order), args.Error(1)
}

func (m *MockStore) GetCouponByCode(ctx context.Context, code string) (generated.Coupon, error) {
	args := m.Called(ctx, code)
	return args.Get(0).(generated.Coupon), args.Error(1)
}

func (m *MockStore) IncrementCouponUsage(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockStore) GetCourse(ctx context.Context, id uuid.UUID) (generated.GetCourseRow, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(generated.GetCourseRow), args.Error(1)
}

func (m *MockStore) GetOrderByTranID(ctx context.Context, id uuid.UUID) (generated.Order, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(generated.Order), args.Error(1)
}

func (m *MockStore) UpdateOrderReferenceAndStatus(ctx context.Context, arg generated.UpdateOrderReferenceAndStatusParams) (generated.Order, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.Order), args.Error(1)
}

func (m *MockStore) UpdateOrderStatus(ctx context.Context, arg generated.UpdateOrderStatusParams) (generated.Order, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.Order), args.Error(1)
}

func (m *MockStore) GetCourseBySlug(ctx context.Context, slug string) (generated.GetCourseBySlugRow, error) {
	args := m.Called(ctx, slug)
	return args.Get(0).(generated.GetCourseBySlugRow), args.Error(1)
}

func (m *MockStore) CheckUserAccessToNode(ctx context.Context, arg generated.CheckUserAccessToNodeParams) (bool, error) {
	args := m.Called(ctx, arg)
	return args.Bool(0), args.Error(1)
}

func (m *MockStore) GetLesson(ctx context.Context, id uuid.UUID) (generated.GetLessonRow, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(generated.GetLessonRow), args.Error(1)
}

func (m *MockStore) GetCourseTree(ctx context.Context, id uuid.UUID) ([]generated.GetCourseTreeRow, error) {
	args := m.Called(ctx, id)
	return args.Get(0).([]generated.GetCourseTreeRow), args.Error(1)
}

func (m *MockStore) GetCourseTreeHydrated(ctx context.Context, id uuid.UUID) ([]generated.GetCourseTreeHydratedRow, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.GetCourseTreeHydratedRow), args.Error(1)
}

func (m *MockStore) GetCourseTreeHydratedBySlug(ctx context.Context, slug string) ([]generated.GetCourseTreeHydratedBySlugRow, error) {
	args := m.Called(ctx, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.GetCourseTreeHydratedBySlugRow), args.Error(1)
}

func (m *MockStore) GetEnrolledCoursesByUser(ctx context.Context, userID uuid.UUID) ([]generated.GetEnrolledCoursesByUserRow, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.GetEnrolledCoursesByUserRow), args.Error(1)
}

func (m *MockStore) ListPublishedCourses(ctx context.Context) ([]generated.ListPublishedCoursesRow, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.ListPublishedCoursesRow), args.Error(1)
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
