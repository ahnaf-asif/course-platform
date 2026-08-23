package worker

import (
	"context"
	"encoding/json"
	"io"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockMinio
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

// MockStore
type MockStore struct {
	mock.Mock
	generated.Querier // Embed to implement interface
}

func (m *MockStore) WithTx(_ context.Context, fn func(generated.Querier) error) error {
	return fn(m)
}

func (m *MockStore) CreateQuestion(ctx context.Context, arg generated.CreateQuestionParams) (generated.Question, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.Question), args.Error(1)
}

func (m *MockStore) CreateAnswer(ctx context.Context, arg generated.CreateAnswerParams) (generated.Answer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.Answer), args.Error(1)
}

func (m *MockStore) ListQuestionsByQuiz(ctx context.Context, quizID uuid.UUID) ([]generated.Question, error) {
	args := m.Called(ctx, quizID)
	return args.Get(0).([]generated.Question), args.Error(1)
}

func TestProcessQuizBulkUpload(t *testing.T) {
	mockStore := new(MockStore)
	mockMinio := new(MockMinio)
	worker := NewQuizWorker(mockStore, mockMinio)

	quizID := uuid.New()
	csvContent := `question,type,explanation,correct_answers,incorrect_answers
"Question 1","SINGLE","Expl 1","Ans 1","Ans 2|Ans 3"
"Question 2","MULTIPLE","Expl 2","Ans A|Ans B","Ans C"`

	payload := services.QuizBulkUploadPayload{
		QuizID:   quizID.String(),
		FilePath: "test.csv",
		Bucket:   "test-bucket",
	}
	payloadBytes, _ := json.Marshal(payload)
	task := asynq.NewTask(services.TypeQuizBulkUpload, payloadBytes)

	// Mock Minio GetObject
	mockMinio.On("GetObject", mock.Anything, "test-bucket", "test.csv").Return(
		io.NopCloser(strings.NewReader(csvContent)),
		int64(len(csvContent)),
		"text/csv",
		nil,
	)

	// Mock Store ListQuestions
	mockStore.On("ListQuestionsByQuiz", mock.Anything, quizID).Return([]generated.Question{}, nil)

	// Mock Store CreateQuestion & CreateAnswer
	mockStore.On("CreateQuestion", mock.Anything, mock.MatchedBy(func(p generated.CreateQuestionParams) bool {
		return p.QuizID == quizID
	})).Return(generated.Question{ID: uuid.New()}, nil).Times(2)

	mockStore.On("CreateAnswer", mock.Anything, mock.Anything).Return(generated.Answer{}, nil).Times(6)

	// Mock Minio DeleteObject
	mockMinio.On("DeleteObject", mock.Anything, "test-bucket", "test.csv").Return(nil)

	err := worker.ProcessQuizBulkUpload(context.Background(), task)
	assert.NoError(t, err)

	mockMinio.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}

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

func TestProcessSendEmail(t *testing.T) {
	mockEmail := new(MockEmailService)
	worker := NewEmailWorker(mockEmail)

	payload := services.SendEmailPayload{
		To:      []string{"student@example.com"},
		Subject: "Test Email",
		HTML:    "<p>Hello</p>",
		Text:    "Hello",
	}
	payloadBytes, _ := json.Marshal(payload)
	task := asynq.NewTask(services.TypeSendEmail, payloadBytes)

	mockEmail.On("SendEmail", mock.Anything, services.SendEmailRequest{
		To:      []string{"student@example.com"},
		Subject: "Test Email",
		HTML:    "<p>Hello</p>",
		Text:    "Hello",
	}).Return(&services.SendEmailResponse{ID: "email-123"}, nil)

	err := worker.ProcessSendEmail(context.Background(), task)
	assert.NoError(t, err)

	mockEmail.AssertExpectations(t)
}
