package handlers

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
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
			ID:                 attemptID,
			UserID:             otherUserID,
			QuizID:             uuid.New(),
			Score:              "80.00",
			IsPassed:           true,
			TimeSpentSeconds:   600,
			TotalQuestions:     10,
			CorrectCount:       8,
			WrongCount:         2,
			UnansweredCount:    0,
			TotalNegativeMarks: "1.00",
			IsFirstAttempt:     true,
			CompletedAt:        time.Now(),
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
			ID:                 attemptID,
			UserID:             userID,
			QuizID:             quizID,
			Score:              "100.00",
			IsPassed:           true,
			TimeSpentSeconds:   350,
			TotalQuestions:     1,
			CorrectCount:       1,
			WrongCount:         0,
			UnansweredCount:    0,
			TotalNegativeMarks: "0.00",
			IsFirstAttempt:     true,
			CompletedAt:        time.Now(),
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

		mockStore.On("GetUserRankInQuiz", mock.Anything, mock.Anything).Return(generated.GetUserRankInQuizRow{
			RankPosition: 1,
			AttemptID:    attemptID,
			UserID:       userID,
			Score:        "100.00",
		}, nil)

		err := h.StudentGetAttemptDetails(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp SubmitQuizResponse
		err = json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.NoError(t, err)
		assert.Equal(t, attemptID.String(), resp.AttemptID)
		assert.Equal(t, float64(100), resp.Score)
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

func TestQuizHandler_StudentSubmitQuizAttempt_NegativeMarking(t *testing.T) {
	e := echo.New()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	userID := uuid.New()
	authUser := &internalMiddleware.AuthUser{
		ID:    userID.String(),
		Email: "student@example.com",
		Role:  "student",
	}

	mockStore := new(MockStore)
	h := NewQuizHandler(mockStore, nil, nil, nil, logger)

	quizID := uuid.New()
	q1ID := uuid.New()
	q2ID := uuid.New()
	q1CorrectAns := uuid.New()
	q1WrongAns := uuid.New()
	q2CorrectAns := uuid.New()
	q2WrongAns := uuid.New()

	bodyJSON := `{"answers":[{"question_id":"` + q1ID.String() + `","answer_id":"` + q1CorrectAns.String() + `"},{"question_id":"` + q2ID.String() + `","answer_id":"` + q2WrongAns.String() + `"}],"time_spent_seconds":120}`
	req := httptest.NewRequest(http.MethodPost, "/quizzes/"+quizID.String()+"/attempts", strings.NewReader(bodyJSON))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(quizID.String())
	c.Set("user", authUser)

	mockStore.On("GetQuizByID", mock.Anything, quizID).Return(generated.Quiz{
		ID:           quizID,
		Title:        "BCS Model Test 1",
		PassingScore: 40,
	}, nil)

	// Linked Model Test with 0.50 negative marking and 100 total marks for 2 questions (50 each)
	mockStore.On("GetModelTestByQuizID", mock.Anything, quizID).Return(generated.ModelTest{
		NodeID:              uuid.New(),
		Title:               "BCS Model Test 1",
		TotalMarks:          "100.00",
		PassMarks:           "40.00",
		NegativeMarkingRate: "0.50",
	}, nil)

	mockStore.On("ListQuestionsByQuiz", mock.Anything, quizID).Return([]generated.Question{
		{ID: q1ID, QuizID: quizID, Content: "Question 1", QuestionType: generated.QuestionTypeSINGLE},
		{ID: q2ID, QuizID: quizID, Content: "Question 2", QuestionType: generated.QuestionTypeSINGLE},
	}, nil)

	mockStore.On("ListAnswersByQuestion", mock.Anything, q1ID).Return([]generated.Answer{
		{ID: q1CorrectAns, QuestionID: q1ID, Content: "Correct", IsCorrect: true},
		{ID: q1WrongAns, QuestionID: q1ID, Content: "Wrong", IsCorrect: false},
	}, nil)

	mockStore.On("ListAnswersByQuestion", mock.Anything, q2ID).Return([]generated.Answer{
		{ID: q2CorrectAns, QuestionID: q2ID, Content: "Correct", IsCorrect: true},
		{ID: q2WrongAns, QuestionID: q2ID, Content: "Wrong", IsCorrect: false},
	}, nil)

	mockStore.On("CountUserAttemptsForQuiz", mock.Anything, mock.Anything).Return(int64(0), nil)

	attemptID := uuid.New()
	mockStore.On("CreateQuizAttempt", mock.Anything, mock.MatchedBy(func(params generated.CreateQuizAttemptParams) bool {
		// 1 correct (50 marks) - 1 wrong (0.50 marks) = 49.50
		return params.Score == "49.50" && params.IsFirstAttempt == true && params.TimeSpentSeconds == 120
	})).Return(generated.QuizAttempt{
		ID:                 attemptID,
		UserID:             userID,
		QuizID:             quizID,
		Score:              "49.50",
		IsPassed:           true,
		TimeSpentSeconds:   120,
		TotalQuestions:     2,
		CorrectCount:       1,
		WrongCount:         1,
		UnansweredCount:    0,
		TotalNegativeMarks: "0.50",
		IsFirstAttempt:     true,
		CompletedAt:        time.Now(),
	}, nil)

	mockStore.On("CreateQuizAttemptAnswer", mock.Anything, mock.Anything).Return(generated.QuizAttemptAnswer{}, nil)
	mockStore.On("GetNodesByQuiz", mock.Anything, mock.Anything).Return([]uuid.UUID{}, nil).Maybe()
	mockStore.On("UpsertProgress", mock.Anything, mock.Anything).Return(generated.Progress{}, nil).Maybe()
	mockStore.On("GetUserRankInQuiz", mock.Anything, mock.Anything).Return(generated.GetUserRankInQuizRow{
		RankPosition: 1,
	}, nil)

	err := h.StudentSubmitQuizAttempt(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var resp SubmitQuizResponse
	err = json.Unmarshal(rec.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, 49.5, resp.Score)
	assert.Equal(t, int32(1), resp.CorrectCount)
	assert.Equal(t, int32(1), resp.WrongCount)
	assert.Equal(t, 0.50, resp.TotalNegativeMarks)
	assert.True(t, resp.IsFirstAttempt)
}

func TestQuizHandler_StudentGetQuizLeaderboard(t *testing.T) {
	e := echo.New()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	userID := uuid.New()
	authUser := &internalMiddleware.AuthUser{
		ID:    userID.String(),
		Email: "student@example.com",
		Role:  "student",
	}

	mockStore := new(MockStore)
	h := NewQuizHandler(mockStore, nil, nil, nil, logger)

	quizID := uuid.New()
	req := httptest.NewRequest(http.MethodGet, "/quizzes/"+quizID.String()+"/leaderboard", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(quizID.String())
	c.Set("user", authUser)

	mockStore.On("GetQuizByID", mock.Anything, quizID).Return(generated.Quiz{
		ID:    quizID,
		Title: "Model Test Leaderboard",
	}, nil)

	mockStore.On("GetQuizLeaderboard", mock.Anything, quizID).Return([]generated.GetQuizLeaderboardRow{
		{
			RankPosition:     1,
			AttemptID:        uuid.New(),
			UserID:           userID,
			UserName:         "Student Ahnaf",
			Score:            "95.50",
			CorrectCount:     96,
			WrongCount:       1,
			TimeSpentSeconds: 1500,
			CompletedAt:      time.Now(),
		},
		{
			RankPosition:     2,
			AttemptID:        uuid.New(),
			UserID:           uuid.New(),
			UserName:         "Student Shafin",
			Score:            "92.00",
			CorrectCount:     93,
			WrongCount:       2,
			TimeSpentSeconds: 1800,
			CompletedAt:      time.Now(),
		},
	}, nil)

	mockStore.On("CountQuizLeaderboardParticipants", mock.Anything, quizID).Return(int64(2), nil)
	mockStore.On("GetUserRankInQuiz", mock.Anything, mock.Anything).Return(generated.GetUserRankInQuizRow{
		RankPosition:     1,
		AttemptID:        uuid.New(),
		UserID:           userID,
		Score:            "95.50",
		CorrectCount:     96,
		WrongCount:       1,
		TimeSpentSeconds: 1500,
		CompletedAt:      time.Now(),
	}, nil)

	err := h.StudentGetQuizLeaderboard(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var resp QuizLeaderboardResponse
	err = json.Unmarshal(rec.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), resp.TotalParticipants)
	assert.Len(t, resp.Entries, 2)
	assert.Equal(t, int64(1), resp.Entries[0].RankPosition)
	assert.True(t, resp.Entries[0].IsCurrentUser)
	assert.Equal(t, 95.5, resp.Entries[0].Score)
}
