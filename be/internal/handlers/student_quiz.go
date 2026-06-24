package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db/generated"
	internalMiddleware "github.com/shafins-course/backend/internal/middleware"
)

// StudentQuizResponse is the sanitized list of questions for active quiz participation
type StudentAnswerOption struct {
	ID      string `json:"id"`
	Content string `json:"content"`
}

type StudentQuestionResponse struct {
	ID           string                 `json:"id"`
	QuizID       string                 `json:"quiz_id"`
	Content      string                 `json:"content"`
	QuestionType string                 `json:"question_type"`
	Answers      []StudentAnswerOption  `json:"answers"`
}

type SubmitQuizRequest struct {
	Answers []SubmitAnswerItem `json:"answers" validate:"required"`
}

type SubmitAnswerItem struct {
	QuestionID string `json:"question_id" validate:"required"`
	AnswerID   string `json:"answer_id"` // Empty if unanswered
}

type AttemptDetailQuestion struct {
	ID            string                `json:"id"`
	Content       string                `json:"content"`
	QuestionType  string                `json:"question_type"`
	Explanation   string                `json:"explanation"`
	IsCorrect     bool                  `json:"is_correct"`
	UserAnswers   []string              `json:"user_answers"`   // Selected answer IDs
	AnswerOptions []AttemptAnswerOption `json:"answer_options"` // All options with correct tags
}

type AttemptAnswerOption struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	IsCorrect bool   `json:"is_correct"`
}

type SubmitQuizResponse struct {
	AttemptID    string                  `json:"attempt_id"`
	Score        int32                   `json:"score"`
	IsPassed     bool                    `json:"is_passed"`
	PassingScore int32                   `json:"passing_score"`
	CompletedAt  time.Time               `json:"completed_at"`
	Questions    []AttemptDetailQuestion `json:"questions"`
}

type StudentQuizAttemptSummary struct {
	ID          string    `json:"id"`
	Score       int32     `json:"score"`
	IsPassed    bool      `json:"is_passed"`
	CompletedAt time.Time `json:"completed_at"`
}

// StudentListQuizzesByNode retrieves quizzes linked to a lesson node for students
func (h *QuizHandler) StudentListQuizzesByNode(c echo.Context) error {
	nodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid node ID")
	}

	quizzes, err := h.store.GetQuizzesByNode(c.Request().Context(), nodeID)
	if err != nil {
		h.logger.Error("Failed to get quizzes for student node", "error", err, "node_id", nodeID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]QuizResponse, 0, len(quizzes))
	for _, q := range quizzes {
		resp = append(resp, QuizResponse{
			ID:           q.ID.String(),
			Title:        q.Title,
			PassingScore: q.PassingScore,
			CreatedAt:    q.CreatedAt.String(),
		})
	}

	return c.JSON(http.StatusOK, resp)
}

// StudentGetQuizQuestions retrieves quiz questions with is_correct stripped for security
func (h *QuizHandler) StudentGetQuizQuestions(c echo.Context) error {
	quizID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	questions, err := h.store.ListQuestionsByQuiz(c.Request().Context(), quizID)
	if err != nil {
		h.logger.Error("Failed to list quiz questions for student", "error", err, "quiz_id", quizID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]StudentQuestionResponse, 0, len(questions))
	for _, q := range questions {
		answers, err := h.store.ListAnswersByQuestion(c.Request().Context(), q.ID)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
		}

		opts := make([]StudentAnswerOption, 0, len(answers))
		for _, a := range answers {
			opts = append(opts, StudentAnswerOption{
				ID:      a.ID.String(),
				Content: a.Content,
			})
		}

		resp = append(resp, StudentQuestionResponse{
			ID:           q.ID.String(),
			QuizID:       q.QuizID.String(),
			Content:      q.Content,
			QuestionType: string(q.QuestionType),
			Answers:      opts,
		})
	}

	return c.JSON(http.StatusOK, resp)
}

// StudentSubmitQuizAttempt grades the submission, persists results, and returns explanations
func (h *QuizHandler) StudentSubmitQuizAttempt(c echo.Context) error {
	quizID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	var req SubmitQuizRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	quiz, err := h.store.GetQuizByID(ctx, quizID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Quiz not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	questions, err := h.store.ListQuestionsByQuiz(ctx, quizID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Create user answers map
	userAnswersMap := make(map[uuid.UUID][]uuid.UUID)
	for _, item := range req.Answers {
		qID, errQ := uuid.Parse(item.QuestionID)
		if errQ != nil {
			continue
		}
		if item.AnswerID == "" {
			continue
		}
		aID, errA := uuid.Parse(item.AnswerID)
		if errA != nil {
			continue
		}
		userAnswersMap[qID] = append(userAnswersMap[qID], aID)
	}

	// Grade questions
	correctCount := 0
	totalQuestions := len(questions)

	type GradedQuestion struct {
		Question      generated.Question
		IsCorrect     bool
		UserAnswers   []uuid.UUID
		AnswerOptions []generated.Answer
	}
	gradedQuestions := make([]GradedQuestion, 0, totalQuestions)

	for _, q := range questions {
		answers, err := h.store.ListAnswersByQuestion(ctx, q.ID)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
		}

		correctAnswers := make([]uuid.UUID, 0)
		for _, a := range answers {
			if a.IsCorrect {
				correctAnswers = append(correctAnswers, a.ID)
			}
		}

		userAns := userAnswersMap[q.ID]
		isQuestionCorrect := false

		if len(correctAnswers) > 0 {
			if len(userAns) == len(correctAnswers) {
				matchedAll := true
				for _, ca := range correctAnswers {
					found := false
					for _, ua := range userAns {
						if ua == ca {
							found = true
							break
						}
					}
					if !found {
						matchedAll = false
						break
					}
				}
				isQuestionCorrect = matchedAll
			}
		} else {
			// If no correct answers are designated in DB, mark it true if user selected nothing
			isQuestionCorrect = len(userAns) == 0
		}

		if isQuestionCorrect {
			correctCount++
		}

		gradedQuestions = append(gradedQuestions, GradedQuestion{
			Question:      q,
			IsCorrect:     isQuestionCorrect,
			UserAnswers:   userAns,
			AnswerOptions: answers,
		})
	}

	score := int32(0)
	if totalQuestions > 0 {
		score = int32((correctCount * 100) / totalQuestions)
	}
	isPassed := score >= quiz.PassingScore

	// Persist attempt
	attempt, err := h.store.CreateQuizAttempt(ctx, generated.CreateQuizAttemptParams{
		UserID:   userID,
		QuizID:   quizID,
		Score:    score,
		IsPassed: isPassed,
	})
	if err != nil {
		h.logger.Error("Failed to save quiz attempt", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save attempt")
	}

	// Persist attempt answers
	for _, item := range req.Answers {
		qID, errQ := uuid.Parse(item.QuestionID)
		if errQ != nil {
			continue
		}

		var ansID uuid.NullUUID
		if item.AnswerID != "" {
			if aID, errA := uuid.Parse(item.AnswerID); errA == nil {
				ansID = uuid.NullUUID{UUID: aID, Valid: true}
			}
		}

		_, _ = h.store.CreateQuizAttemptAnswer(ctx, generated.CreateQuizAttemptAnswerParams{
			AttemptID:  attempt.ID,
			QuestionID: qID,
			AnswerID:   ansID,
		})
	}

	// Format response with explanations
	detailQuestions := make([]AttemptDetailQuestion, 0, len(gradedQuestions))
	for _, gq := range gradedQuestions {
		opts := make([]AttemptAnswerOption, 0, len(gq.AnswerOptions))
		for _, a := range gq.AnswerOptions {
			opts = append(opts, AttemptAnswerOption{
				ID:        a.ID.String(),
				Content:   a.Content,
				IsCorrect: a.IsCorrect,
			})
		}

		userAnsStrs := make([]string, 0, len(gq.UserAnswers))
		for _, ua := range gq.UserAnswers {
			userAnsStrs = append(userAnsStrs, ua.String())
		}

		explanation := ""
		if gq.Question.Explanation.Valid {
			explanation = gq.Question.Explanation.String
		}

		detailQuestions = append(detailQuestions, AttemptDetailQuestion{
			ID:            gq.Question.ID.String(),
			Content:       gq.Question.Content,
			QuestionType:  string(gq.Question.QuestionType),
			Explanation:   explanation,
			IsCorrect:     gq.IsCorrect,
			UserAnswers:   userAnsStrs,
			AnswerOptions: opts,
		})
	}

	resp := SubmitQuizResponse{
		AttemptID:    attempt.ID.String(),
		Score:        attempt.Score,
		IsPassed:     attempt.IsPassed,
		PassingScore: quiz.PassingScore,
		CompletedAt:  attempt.CompletedAt,
		Questions:    detailQuestions,
	}

	return c.JSON(http.StatusOK, resp)
}

// StudentListQuizAttempts lists attempts history for the active student on the quiz
func (h *QuizHandler) StudentListQuizAttempts(c echo.Context) error {
	quizID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	attempts, err := h.store.GetAttemptsByUserAndQuiz(ctx, generated.GetAttemptsByUserAndQuizParams{
		UserID: userID,
		QuizID: quizID,
	})
	if err != nil {
		h.logger.Error("Failed to list student attempts", "error", err, "quiz_id", quizID, "user_id", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]StudentQuizAttemptSummary, 0, len(attempts))
	for _, a := range attempts {
		resp = append(resp, StudentQuizAttemptSummary{
			ID:          a.ID.String(),
			Score:       a.Score,
			IsPassed:    a.IsPassed,
			CompletedAt: a.CompletedAt,
		})
	}

	return c.JSON(http.StatusOK, resp)
}

// StudentGetAttemptDetails retrieves the full details and answers for a specific past quiz attempt
func (h *QuizHandler) StudentGetAttemptDetails(c echo.Context) error {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid attempt ID")
	}

	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	// 1. Fetch the attempt record
	attempt, err := h.store.GetQuizAttempt(ctx, attemptID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Attempt not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Security check: Make sure this attempt belongs to the active authenticated user
	if attempt.UserID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden")
	}

	// 2. Fetch the quiz record to get PassingScore
	quiz, err := h.store.GetQuizByID(ctx, attempt.QuizID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// 3. Fetch questions linked to the quiz
	questions, err := h.store.ListQuestionsByQuiz(ctx, attempt.QuizID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// 4. Fetch attempt answers to know which ones the user selected
	attemptAnswers, err := h.store.GetQuizAttemptAnswers(ctx, attemptID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Create user answers map
	userAnswersMap := make(map[uuid.UUID][]uuid.UUID)
	for _, aa := range attemptAnswers {
		if aa.AnswerID.Valid {
			userAnswersMap[aa.QuestionID] = append(userAnswersMap[aa.QuestionID], aa.AnswerID.UUID)
		}
	}

	// 5. Structure the graded review response
	detailQuestions := make([]AttemptDetailQuestion, 0, len(questions))
	for _, q := range questions {
		answers, err := h.store.ListAnswersByQuestion(ctx, q.ID)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
		}

		opts := make([]AttemptAnswerOption, 0, len(answers))
		correctAnswers := make([]uuid.UUID, 0)
		for _, a := range answers {
			if a.IsCorrect {
				correctAnswers = append(correctAnswers, a.ID)
			}
			opts = append(opts, AttemptAnswerOption{
				ID:        a.ID.String(),
				Content:   a.Content,
				IsCorrect: a.IsCorrect,
			})
		}

		userAns := userAnswersMap[q.ID]
		isQuestionCorrect := false

		if len(correctAnswers) > 0 {
			if len(userAns) == len(correctAnswers) {
				matchedAll := true
				for _, ca := range correctAnswers {
					found := false
					for _, ua := range userAns {
						if ua == ca {
							found = true
							break
						}
					}
					if !found {
						matchedAll = false
						break
					}
				}
				isQuestionCorrect = matchedAll
			}
		} else {
			isQuestionCorrect = len(userAns) == 0
		}

		userAnsStrs := make([]string, 0, len(userAns))
		for _, ua := range userAns {
			userAnsStrs = append(userAnsStrs, ua.String())
		}

		explanation := ""
		if q.Explanation.Valid {
			explanation = q.Explanation.String
		}

		detailQuestions = append(detailQuestions, AttemptDetailQuestion{
			ID:            q.ID.String(),
			Content:       q.Content,
			QuestionType:  string(q.QuestionType),
			Explanation:   explanation,
			IsCorrect:     isQuestionCorrect,
			UserAnswers:   userAnsStrs,
			AnswerOptions: opts,
		})
	}

	resp := SubmitQuizResponse{
		AttemptID:    attempt.ID.String(),
		Score:        attempt.Score,
		IsPassed:     attempt.IsPassed,
		PassingScore: quiz.PassingScore,
		CompletedAt:  attempt.CompletedAt,
		Questions:    detailQuestions,
	}

	return c.JSON(http.StatusOK, resp)
}
