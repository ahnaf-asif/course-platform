package handlers

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db/generated"
	internalMiddleware "github.com/shafins-course/backend/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestQuizHandler_StudentGetAttemptDetails(t *testing.T) {
	e := echo.New()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	userID := uuid.New()
	authUser := &internalMiddleware.AuthUser{
		ID:    userID.String(),
		Email: "student@example.com",
		Role:  "student",
	}

	t.Run("Unauthorized if no auth user context", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewQuizHandler(mockStore, nil, nil, nil, logger)

		attemptID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/attempts/"+attemptID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(attemptID.String())

		err := h.StudentGetAttemptDetails(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, he.Code)
	})

	t.Run("Forbidden if attempt does not belong to user", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewQuizHandler(mockStore, nil, nil, nil, logger)

		attemptID := uuid.New()
		otherUserID := uuid.New()

		req := httptest.NewRequest(http.MethodGet, "/attempts/"+attemptID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(attemptID.String())
		c.Set("user", authUser) // Logged in user

		// Return an attempt belonging to otherUserID
		mockStore.On("GetQuizAttempt", mock.Anything, attemptID).Return(generated.QuizAttempt{
			ID:          attemptID,
			UserID:      otherUserID,
			QuizID:      uuid.New(),
			Score:       80,
			IsPassed:    true,
			CompletedAt: time.Now(),
		}, nil)

		err := h.StudentGetAttemptDetails(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusForbidden, he.Code)
	})

	t.Run("Success returns details with correct answers matching", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewQuizHandler(mockStore, nil, nil, nil, logger)

		attemptID := uuid.New()
		quizID := uuid.New()
		questionID := uuid.New()
		correctAnswerID := uuid.New()
		incorrectAnswerID := uuid.New()

		req := httptest.NewRequest(http.MethodGet, "/attempts/"+attemptID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(attemptID.String())
		c.Set("user", authUser)

		// 1. Mock GetQuizAttempt
		mockStore.On("GetQuizAttempt", mock.Anything, attemptID).Return(generated.QuizAttempt{
			ID:          attemptID,
			UserID:      userID,
			QuizID:      quizID,
			Score:       100,
			IsPassed:    true,
			CompletedAt: time.Now(),
		}, nil)

		// 2. Mock GetQuizByID
		mockStore.On("GetQuizByID", mock.Anything, quizID).Return(generated.Quiz{
			ID:           quizID,
			Title:        "Sample Quiz",
			PassingScore: 70,
		}, nil)

		// 3. Mock ListQuestionsByQuiz
		mockStore.On("ListQuestionsByQuiz", mock.Anything, quizID).Return([]generated.Question{
			{
				ID:           questionID,
				QuizID:       quizID,
				Content:      "What is 2+2?",
				QuestionType: generated.QuestionTypeSINGLE,
				Explanation:  sql.NullString{String: "2+2 is 4", Valid: true},
			},
		}, nil)

		// 4. Mock GetQuizAttemptAnswers
		mockStore.On("GetQuizAttemptAnswers", mock.Anything, attemptID).Return([]generated.QuizAttemptAnswer{
			{
				AttemptID:  attemptID,
				QuestionID: questionID,
				AnswerID:   uuid.NullUUID{UUID: correctAnswerID, Valid: true},
			},
		}, nil)

		// 5. Mock ListAnswersByQuestion
		mockStore.On("ListAnswersByQuestion", mock.Anything, questionID).Return([]generated.Answer{
			{
				ID:         correctAnswerID,
				QuestionID: questionID,
				Content:    "4",
				IsCorrect:  true,
			},
			{
				ID:         incorrectAnswerID,
				QuestionID: questionID,
				Content:    "5",
				IsCorrect:  false,
			},
		}, nil)

		err := h.StudentGetAttemptDetails(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp SubmitQuizResponse
		err = json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.NoError(t, err)
		assert.Equal(t, attemptID.String(), resp.AttemptID)
		assert.Equal(t, int32(100), resp.Score)
		assert.True(t, resp.IsPassed)
		assert.Equal(t, int32(70), resp.PassingScore)
		assert.Len(t, resp.Questions, 1)

		q := resp.Questions[0]
		assert.Equal(t, questionID.String(), q.ID)
		assert.Equal(t, "What is 2+2?", q.Content)
		assert.Equal(t, "2+2 is 4", q.Explanation)
		assert.True(t, q.IsCorrect)
		assert.Contains(t, q.UserAnswers, correctAnswerID.String())
		assert.Len(t, q.AnswerOptions, 2)
	})
}
