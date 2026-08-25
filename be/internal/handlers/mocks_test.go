package handlers

import (
	"context"
	"io"

	"github.com/google/uuid"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/services"
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

func (m *MockStore) GetUserByEmail(ctx context.Context, email string) (generated.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return generated.User{}, args.Error(1)
	}
	return args.Get(0).(generated.User), args.Error(1)
}

func (m *MockStore) GetUserProfile(ctx context.Context, userID uuid.UUID) (generated.UserProfile, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return generated.UserProfile{}, args.Error(1)
	}
	return args.Get(0).(generated.UserProfile), args.Error(1)
}

func (m *MockStore) CreateRefreshToken(ctx context.Context, arg generated.CreateRefreshTokenParams) (generated.RefreshToken, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.RefreshToken), args.Error(1)
}

func (m *MockStore) CreateUser(ctx context.Context, arg generated.CreateUserParams) (generated.User, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.User), args.Error(1)
}

func (m *MockStore) CreateUserProfile(ctx context.Context, arg generated.CreateUserProfileParams) (generated.UserProfile, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.UserProfile), args.Error(1)
}

func (m *MockStore) UpdateUser(ctx context.Context, arg generated.UpdateUserParams) (generated.User, error) {
	args := m.Called(ctx, arg)
	if args.Get(0) == nil {
		return generated.User{}, args.Error(1)
	}
	return args.Get(0).(generated.User), args.Error(1)
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

func (m *MockStore) CreateEnrollment(ctx context.Context, arg generated.CreateEnrollmentParams) (generated.Enrollment, error) {
	for _, call := range m.ExpectedCalls {
		if call.Method == "CreateEnrollment" {
			args := m.Called(ctx, arg)
			if args.Get(0) == nil {
				return generated.Enrollment{}, args.Error(1)
			}
			return args.Get(0).(generated.Enrollment), args.Error(1)
		}
	}
	return generated.Enrollment{
		UserID: arg.UserID,
		NodeID: arg.NodeID,
	}, nil
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

func (m *MockStore) GetQuizAttempt(ctx context.Context, id uuid.UUID) (generated.QuizAttempt, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(generated.QuizAttempt), args.Error(1)
}

func (m *MockStore) GetQuizAttemptAnswers(ctx context.Context, attemptID uuid.UUID) ([]generated.QuizAttemptAnswer, error) {
	args := m.Called(ctx, attemptID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.QuizAttemptAnswer), args.Error(1)
}

func (m *MockStore) ListQuestionsByQuiz(ctx context.Context, quizID uuid.UUID) ([]generated.Question, error) {
	args := m.Called(ctx, quizID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.Question), args.Error(1)
}

func (m *MockStore) ListAnswersByQuestion(ctx context.Context, questionID uuid.UUID) ([]generated.Answer, error) {
	args := m.Called(ctx, questionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.Answer), args.Error(1)
}

func (m *MockStore) CreateQuizAttempt(ctx context.Context, arg generated.CreateQuizAttemptParams) (generated.QuizAttempt, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.QuizAttempt), args.Error(1)
}

func (m *MockStore) CreateQuizAttemptAnswer(ctx context.Context, arg generated.CreateQuizAttemptAnswerParams) (generated.QuizAttemptAnswer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.QuizAttemptAnswer), args.Error(1)
}

func (m *MockStore) GetAttemptsByUserAndQuiz(ctx context.Context, arg generated.GetAttemptsByUserAndQuizParams) ([]generated.QuizAttempt, error) {
	args := m.Called(ctx, arg)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.QuizAttempt), args.Error(1)
}

func (m *MockStore) GetQuizzesByNodes(ctx context.Context, nodeIDs []uuid.UUID) ([]generated.GetQuizzesByNodesRow, error) {
	args := m.Called(ctx, nodeIDs)
	if len(args) == 0 {
		return nil, nil
	}
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.GetQuizzesByNodesRow), args.Error(1)
}

func (m *MockStore) GetUserQuizAttemptsForQuizzes(ctx context.Context, arg generated.GetUserQuizAttemptsForQuizzesParams) ([]generated.GetUserQuizAttemptsForQuizzesRow, error) {
	args := m.Called(ctx, arg)
	if len(args) == 0 {
		return nil, nil
	}
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.GetUserQuizAttemptsForQuizzesRow), args.Error(1)
}

func (m *MockStore) UpsertProgress(ctx context.Context, arg generated.UpsertProgressParams) (generated.Progress, error) {
	args := m.Called(ctx, arg)
	if len(args) == 0 {
		return generated.Progress{}, nil
	}
	return args.Get(0).(generated.Progress), args.Error(1)
}

func (m *MockStore) ListProgressByUser(ctx context.Context, userID uuid.UUID) ([]generated.Progress, error) {
	args := m.Called(ctx, userID)
	if len(args) == 0 {
		return nil, nil
	}
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.Progress), args.Error(1)
}

func (m *MockStore) CreateModelTest(ctx context.Context, arg generated.CreateModelTestParams) (generated.ModelTest, error) {
	args := m.Called(ctx, arg)
	if args.Get(0) == nil {
		return generated.ModelTest{}, args.Error(1)
	}
	return args.Get(0).(generated.ModelTest), args.Error(1)
}

func (m *MockStore) GetModelTest(ctx context.Context, id uuid.UUID) (generated.GetModelTestRow, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return generated.GetModelTestRow{}, args.Error(1)
	}
	return args.Get(0).(generated.GetModelTestRow), args.Error(1)
}

func (m *MockStore) GetModelTestByQuizID(ctx context.Context, quizID uuid.UUID) (generated.ModelTest, error) {
	args := m.Called(ctx, quizID)
	if args.Get(0) == nil {
		return generated.ModelTest{}, args.Error(1)
	}
	return args.Get(0).(generated.ModelTest), args.Error(1)
}

func (m *MockStore) UpdateModelTest(ctx context.Context, arg generated.UpdateModelTestParams) (generated.ModelTest, error) {
	args := m.Called(ctx, arg)
	if args.Get(0) == nil {
		return generated.ModelTest{}, args.Error(1)
	}
	return args.Get(0).(generated.ModelTest), args.Error(1)
}

func (m *MockStore) DeleteModelTest(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockStore) GetQuizLeaderboard(ctx context.Context, quizID uuid.UUID) ([]generated.GetQuizLeaderboardRow, error) {
	args := m.Called(ctx, quizID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.GetQuizLeaderboardRow), args.Error(1)
}

func (m *MockStore) GetUserRankInQuiz(ctx context.Context, arg generated.GetUserRankInQuizParams) (generated.GetUserRankInQuizRow, error) {
	args := m.Called(ctx, arg)
	if args.Get(0) == nil {
		return generated.GetUserRankInQuizRow{}, args.Error(1)
	}
	return args.Get(0).(generated.GetUserRankInQuizRow), args.Error(1)
}

func (m *MockStore) CountQuizLeaderboardParticipants(ctx context.Context, quizID uuid.UUID) (int64, error) {
	args := m.Called(ctx, quizID)
	if len(args) == 0 {
		return 0, nil
	}
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockStore) CountUserAttemptsForQuiz(ctx context.Context, arg generated.CountUserAttemptsForQuizParams) (int64, error) {
	args := m.Called(ctx, arg)
	if len(args) == 0 {
		return 0, nil
	}
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockStore) CreateNode(ctx context.Context, arg generated.CreateNodeParams) (generated.Node, error) {
	args := m.Called(ctx, arg)
	if args.Get(0) == nil {
		return generated.Node{}, args.Error(1)
	}
	return args.Get(0).(generated.Node), args.Error(1)
}

func (m *MockStore) CreateQuiz(ctx context.Context, arg generated.CreateQuizParams) (generated.Quiz, error) {
	args := m.Called(ctx, arg)
	if args.Get(0) == nil {
		return generated.Quiz{}, args.Error(1)
	}
	return args.Get(0).(generated.Quiz), args.Error(1)
}

func (m *MockStore) AttachQuizToNode(ctx context.Context, arg generated.AttachQuizToNodeParams) error {
	args := m.Called(ctx, arg)
	return args.Error(0)
}

func (m *MockStore) GetQuizzesByNode(ctx context.Context, nodeID uuid.UUID) ([]generated.Quiz, error) {
	args := m.Called(ctx, nodeID)
	if len(args) == 0 {
		return nil, nil
	}
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.Quiz), args.Error(1)
}

func (m *MockStore) GetNodesByQuiz(ctx context.Context, quizID uuid.UUID) ([]uuid.UUID, error) {
	args := m.Called(ctx, quizID)
	if len(args) == 0 {
		return nil, nil
	}
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]uuid.UUID), args.Error(1)
}

func (m *MockStore) GetNodeAncestors(ctx context.Context, id uuid.UUID) ([]generated.GetNodeAncestorsRow, error) {
	args := m.Called(ctx, id)
	if len(args) == 0 {
		return nil, nil
	}
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]generated.GetNodeAncestorsRow), args.Error(1)
}

// MockEmailService for handler tests
type MockEmailService struct {
	mock.Mock
}

func (m *MockEmailService) SendEmail(ctx context.Context, req services.SendEmailRequest) (*services.SendEmailResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.SendEmailResponse), args.Error(1)
}

func (m *MockEmailService) SendWelcomeEmail(ctx context.Context, toEmail, recipientName string) error {
	args := m.Called(ctx, toEmail, recipientName)
	return args.Error(0)
}

func (m *MockEmailService) SendPasswordResetEmail(ctx context.Context, toEmail, recipientName, resetLink string) error {
	args := m.Called(ctx, toEmail, recipientName, resetLink)
	return args.Error(0)
}

func (m *MockEmailService) SendOrderConfirmationEmail(ctx context.Context, toEmail, recipientName, courseTitle, orderID, amount, currency string) error {
	args := m.Called(ctx, toEmail, recipientName, courseTitle, orderID, amount, currency)
	return args.Error(0)
}

func (m *MockEmailService) SendPayoutStatusEmail(ctx context.Context, toEmail, recipientName, status, amount, currency, trxID, adminNote string) error {
	args := m.Called(ctx, toEmail, recipientName, status, amount, currency, trxID, adminNote)
	return args.Error(0)
}
