package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
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
	ID           string                `json:"id"`
	QuizID       string                `json:"quiz_id"`
	Content      string                `json:"content"`
	QuestionType string                `json:"question_type"`
	Answers      []StudentAnswerOption `json:"answers"`
}

type SubmitQuizRequest struct {
	Answers          []SubmitAnswerItem `json:"answers" validate:"required"`
	TimeSpentSeconds int32              `json:"time_spent_seconds"`
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
	AttemptID          string                  `json:"attempt_id"`
	Score              float64                 `json:"score"`
	IsPassed           bool                    `json:"is_passed"`
	PassingScore       int32                   `json:"passing_score"`
	TimeSpentSeconds   int32                   `json:"time_spent_seconds"`
	TotalQuestions     int32                   `json:"total_questions"`
	CorrectCount       int32                   `json:"correct_count"`
	WrongCount         int32                   `json:"wrong_count"`
	UnansweredCount    int32                   `json:"unanswered_count"`
	TotalNegativeMarks float64                 `json:"total_negative_marks"`
	IsFirstAttempt     bool                    `json:"is_first_attempt"`
	RankPosition       *int64                  `json:"rank_position,omitempty"`
	CompletedAt        time.Time               `json:"completed_at"`
	Questions          []AttemptDetailQuestion `json:"questions"`
}

type StudentQuizAttemptSummary struct {
	ID                 string    `json:"id"`
	Score              float64   `json:"score"`
	IsPassed           bool      `json:"is_passed"`
	TimeSpentSeconds   int32     `json:"time_spent_seconds"`
	TotalQuestions     int32     `json:"total_questions"`
	CorrectCount       int32     `json:"correct_count"`
	WrongCount         int32     `json:"wrong_count"`
	UnansweredCount    int32     `json:"unanswered_count"`
	TotalNegativeMarks float64   `json:"total_negative_marks"`
	IsFirstAttempt     bool      `json:"is_first_attempt"`
	CompletedAt        time.Time `json:"completed_at"`
}

type QuizLeaderboardEntry struct {
	RankPosition       int64     `json:"rank_position"`
	AttemptID          string    `json:"attempt_id"`
	UserID             string    `json:"user_id"`
	UserName           string    `json:"user_name"`
	AvatarURL          string    `json:"avatar_url,omitempty"`
	Score              float64   `json:"score"`
	CorrectCount       int32     `json:"correct_count"`
	WrongCount         int32     `json:"wrong_count"`
	UnansweredCount    int32     `json:"unanswered_count"`
	TotalNegativeMarks float64   `json:"total_negative_marks"`
	TimeSpentSeconds   int32     `json:"time_spent_seconds"`
	CompletedAt        time.Time `json:"completed_at"`
	IsCurrentUser      bool      `json:"is_current_user"`
}

type QuizLeaderboardResponse struct {
	QuizID            string                 `json:"quiz_id"`
	QuizTitle         string                 `json:"quiz_title"`
	TotalParticipants int64                  `json:"total_participants"`
	MyRank            *QuizLeaderboardEntry  `json:"my_rank,omitempty"`
	Entries           []QuizLeaderboardEntry `json:"entries"`
}

// StudentListQuizzesByNode retrieves quizzes linked to a lesson or model test node for students
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

// StudentSubmitQuizAttempt grades the submission, calculates negative marking, persists results, and returns explanations
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
			isQuestionCorrect = len(userAns) == 0
		}

		gradedQuestions = append(gradedQuestions, GradedQuestion{
			Question:      q,
			IsCorrect:     isQuestionCorrect,
			UserAnswers:   userAns,
			AnswerOptions: answers,
		})
	}

	// Calculate counts: correct, wrong, unanswered
	correctCount := 0
	wrongCount := 0
	unansweredCount := 0

	for _, gq := range gradedQuestions {
		if len(gq.UserAnswers) == 0 {
			unansweredCount++
		} else if gq.IsCorrect {
			correctCount++
		} else {
			wrongCount++
		}
	}

	// Determine model test rules (if linked to a ModelTest node)
	var totalMarks float64 = 100.0
	var passMarks float64 = float64(quiz.PassingScore)
	var negativeMarkingRate float64 = 0.0

	if mt, errMT := h.store.GetModelTestByQuizID(ctx, quizID); errMT == nil {
		if tm, errParse := strconv.ParseFloat(mt.TotalMarks, 64); errParse == nil && tm > 0 {
			totalMarks = tm
		}
		if pm, errParse := strconv.ParseFloat(mt.PassMarks, 64); errParse == nil && pm > 0 {
			passMarks = pm
		}
		if nm, errParse := strconv.ParseFloat(mt.NegativeMarkingRate, 64); errParse == nil {
			negativeMarkingRate = nm
		}
	}

	markPerQuestion := 0.0
	if totalQuestions > 0 {
		markPerQuestion = totalMarks / float64(totalQuestions)
	}

	earnedMarks := float64(correctCount) * markPerQuestion
	deductedMarks := float64(wrongCount) * negativeMarkingRate
	finalScore := earnedMarks - deductedMarks
	if finalScore < 0 {
		finalScore = 0
	}
	isPassed := finalScore >= passMarks

	// Check if this is the user's first attempt for ranklist eligibility
	userAttemptsCount, _ := h.store.CountUserAttemptsForQuiz(ctx, generated.CountUserAttemptsForQuizParams{
		UserID: userID,
		QuizID: quizID,
	})
	isFirstAttempt := userAttemptsCount == 0

	// Persist attempt
	attempt, err := h.store.CreateQuizAttempt(ctx, generated.CreateQuizAttemptParams{
		UserID:             userID,
		QuizID:             quizID,
		Score:              fmt.Sprintf("%.2f", finalScore),
		IsPassed:           isPassed,
		TimeSpentSeconds:   req.TimeSpentSeconds,
		TotalQuestions:     int32(totalQuestions),
		CorrectCount:       int32(correctCount),
		WrongCount:         int32(wrongCount),
		UnansweredCount:    int32(unansweredCount),
		TotalNegativeMarks: fmt.Sprintf("%.2f", deductedMarks),
		IsFirstAttempt:     isFirstAttempt,
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

	// Mark all attached nodes as COMPLETED in student progress and invalidate tree caches
	if linkedNodes, errNodes := h.store.GetNodesByQuiz(ctx, quizID); errNodes == nil {
		for _, nID := range linkedNodes {
			_, _ = h.store.UpsertProgress(ctx, generated.UpsertProgressParams{
				UserID: userID,
				NodeID: nID,
				Status: generated.ProgressStatusCOMPLETED,
			})
			if h.cacheService != nil {
				_ = h.cacheService.Delete(ctx, "course:tree:id:"+nID.String())
				if ancestors, errA := h.store.GetCourseTree(ctx, nID); errA == nil {
					for _, a := range ancestors {
						if a.NodeType == generated.NodeTypeCOURSE {
							_ = h.cacheService.Delete(ctx, "course:tree:id:"+a.ID.String())
							if course, errC := h.store.GetCourse(ctx, a.ID); errC == nil {
								_ = h.cacheService.Delete(ctx, "course:tree:slug:"+course.Slug)
							}
							break
						}
					}
				}
			}
		}
	}

	// Optional rank lookup
	var rankPos *int64
	if userRank, errR := h.store.GetUserRankInQuiz(ctx, generated.GetUserRankInQuizParams{
		QuizID: quizID,
		UserID: userID,
	}); errR == nil {
		rankPos = &userRank.RankPosition
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
		AttemptID:          attempt.ID.String(),
		Score:              finalScore,
		IsPassed:           attempt.IsPassed,
		PassingScore:       quiz.PassingScore,
		TimeSpentSeconds:   attempt.TimeSpentSeconds,
		TotalQuestions:     attempt.TotalQuestions,
		CorrectCount:       attempt.CorrectCount,
		WrongCount:         attempt.WrongCount,
		UnansweredCount:    attempt.UnansweredCount,
		TotalNegativeMarks: deductedMarks,
		IsFirstAttempt:     attempt.IsFirstAttempt,
		RankPosition:       rankPos,
		CompletedAt:        attempt.CompletedAt,
		Questions:          detailQuestions,
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
		scoreVal, _ := strconv.ParseFloat(a.Score, 64)
		negVal, _ := strconv.ParseFloat(a.TotalNegativeMarks, 64)

		resp = append(resp, StudentQuizAttemptSummary{
			ID:                 a.ID.String(),
			Score:              scoreVal,
			IsPassed:           a.IsPassed,
			TimeSpentSeconds:   a.TimeSpentSeconds,
			TotalQuestions:     a.TotalQuestions,
			CorrectCount:       a.CorrectCount,
			WrongCount:         a.WrongCount,
			UnansweredCount:    a.UnansweredCount,
			TotalNegativeMarks: negVal,
			IsFirstAttempt:     a.IsFirstAttempt,
			CompletedAt:        a.CompletedAt,
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
			ID:            gqQuestionID(q),
			Content:       q.Content,
			QuestionType:  string(q.QuestionType),
			Explanation:   explanation,
			IsCorrect:     isQuestionCorrect,
			UserAnswers:   userAnsStrs,
			AnswerOptions: opts,
		})
	}

	scoreVal, _ := strconv.ParseFloat(attempt.Score, 64)
	negVal, _ := strconv.ParseFloat(attempt.TotalNegativeMarks, 64)

	var rankPos *int64
	if userRank, errR := h.store.GetUserRankInQuiz(ctx, generated.GetUserRankInQuizParams{
		QuizID: attempt.QuizID,
		UserID: userID,
	}); errR == nil {
		rankPos = &userRank.RankPosition
	}

	resp := SubmitQuizResponse{
		AttemptID:          attempt.ID.String(),
		Score:              scoreVal,
		IsPassed:           attempt.IsPassed,
		PassingScore:       quiz.PassingScore,
		TimeSpentSeconds:   attempt.TimeSpentSeconds,
		TotalQuestions:     attempt.TotalQuestions,
		CorrectCount:       attempt.CorrectCount,
		WrongCount:         attempt.WrongCount,
		UnansweredCount:    attempt.UnansweredCount,
		TotalNegativeMarks: negVal,
		IsFirstAttempt:     attempt.IsFirstAttempt,
		RankPosition:       rankPos,
		CompletedAt:        attempt.CompletedAt,
		Questions:          detailQuestions,
	}

	return c.JSON(http.StatusOK, resp)
}

func gqQuestionID(q generated.Question) string {
	return q.ID.String()
}

// StudentGetQuizLeaderboard returns the competitive ranklist (only first attempts counted)
func (h *QuizHandler) StudentGetQuizLeaderboard(c echo.Context) error {
	quizID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	ctx := c.Request().Context()
	quiz, err := h.store.GetQuizByID(ctx, quizID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Quiz not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	var activeUserID uuid.UUID
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID != "" {
		if uid, errU := uuid.Parse(authUser.ID); errU == nil {
			activeUserID = uid
		}
	}

	rows, err := h.store.GetQuizLeaderboard(ctx, quizID)
	if err != nil {
		h.logger.Error("Failed to fetch leaderboard", "error", err, "quiz_id", quizID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	totalParticipants, _ := h.store.CountQuizLeaderboardParticipants(ctx, quizID)

	entries := make([]QuizLeaderboardEntry, 0, len(rows))
	for _, r := range rows {
		scoreVal, _ := strconv.ParseFloat(r.Score, 64)
		negVal, _ := strconv.ParseFloat(r.TotalNegativeMarks, 64)
		avatar := ""
		if r.AvatarUrl.Valid {
			avatar = r.AvatarUrl.String
		}

		entries = append(entries, QuizLeaderboardEntry{
			RankPosition:       r.RankPosition,
			AttemptID:          r.AttemptID.String(),
			UserID:             r.UserID.String(),
			UserName:           r.UserName,
			AvatarURL:          avatar,
			Score:              scoreVal,
			CorrectCount:       r.CorrectCount,
			WrongCount:         r.WrongCount,
			UnansweredCount:    r.UnansweredCount,
			TotalNegativeMarks: negVal,
			TimeSpentSeconds:   r.TimeSpentSeconds,
			CompletedAt:        r.CompletedAt,
			IsCurrentUser:      activeUserID != uuid.Nil && r.UserID == activeUserID,
		})
	}

	var myRankEntry *QuizLeaderboardEntry
	if activeUserID != uuid.Nil {
		if userRankRow, errRank := h.store.GetUserRankInQuiz(ctx, generated.GetUserRankInQuizParams{
			QuizID: quizID,
			UserID: activeUserID,
		}); errRank == nil {
			scoreVal, _ := strconv.ParseFloat(userRankRow.Score, 64)
			negVal, _ := strconv.ParseFloat(userRankRow.TotalNegativeMarks, 64)
			myRankEntry = &QuizLeaderboardEntry{
				RankPosition:       userRankRow.RankPosition,
				AttemptID:          userRankRow.AttemptID.String(),
				UserID:             userRankRow.UserID.String(),
				UserName:           authUser.Email,
				Score:              scoreVal,
				CorrectCount:       userRankRow.CorrectCount,
				WrongCount:         userRankRow.WrongCount,
				UnansweredCount:    userRankRow.UnansweredCount,
				TotalNegativeMarks: negVal,
				TimeSpentSeconds:   userRankRow.TimeSpentSeconds,
				CompletedAt:        userRankRow.CompletedAt,
				IsCurrentUser:      true,
			}
		}
	}

	return c.JSON(http.StatusOK, QuizLeaderboardResponse{
		QuizID:            quiz.ID.String(),
		QuizTitle:         quiz.Title,
		TotalParticipants: totalParticipants,
		MyRank:            myRankEntry,
		Entries:           entries,
	})
}
