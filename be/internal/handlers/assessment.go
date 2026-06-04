package handlers

import (
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/services"
)

type QuizHandler struct {
	store        db.Store
	cacheService *services.CacheService
	validate     *validator.Validate
	logger       *slog.Logger
	isProduction bool
}

func NewQuizHandler(store db.Store, cacheService *services.CacheService, logger *slog.Logger) *QuizHandler {
	v := validator.New()
	env := os.Getenv("ENV")

	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &QuizHandler{
		store:        store,
		cacheService: cacheService,
		validate:     v,
		logger:       logger,
		isProduction: env == "production",
	}
}

// Quiz CRUD

type QuizResponse struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	PassingScore int32  `json:"passing_score"`
	CreatedAt    string `json:"created_at"`
}

type CreateQuizRequest struct {
	Title        string `json:"title" validate:"required,min=3,max=255"`
	PassingScore int32  `json:"passing_score" validate:"min=0,max=100"`
}

func (h *QuizHandler) CreateQuiz(c echo.Context) error {
	var req CreateQuizRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	quiz, err := h.store.CreateQuiz(c.Request().Context(), generated.CreateQuizParams{
		Title:        req.Title,
		PassingScore: req.PassingScore,
	})
	if err != nil {
		h.logger.Error("Failed to create quiz", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.JSON(http.StatusCreated, QuizResponse{
		ID:           quiz.ID.String(),
		Title:        quiz.Title,
		PassingScore: quiz.PassingScore,
		CreatedAt:    quiz.CreatedAt.String(),
	})
}

type UpdateQuizRequest struct {
	Title        *string `json:"title" validate:"omitempty,min=3,max=255"`
	PassingScore *int32  `json:"passing_score" validate:"omitempty,min=0,max=100"`
}

func (h *QuizHandler) UpdateQuiz(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	var req UpdateQuizRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	params := generated.UpdateQuizParams{ID: id}
	if req.Title != nil {
		params.Title = sql.NullString{String: *req.Title, Valid: true}
	}
	if req.PassingScore != nil {
		params.PassingScore = sql.NullInt32{Int32: *req.PassingScore, Valid: true}
	}

	quiz, err := h.store.UpdateQuiz(c.Request().Context(), params)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Quiz not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.JSON(http.StatusOK, QuizResponse{
		ID:           quiz.ID.String(),
		Title:        quiz.Title,
		PassingScore: quiz.PassingScore,
		CreatedAt:    quiz.CreatedAt.String(),
	})
}

func (h *QuizHandler) DeleteQuiz(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	if err := h.store.DeleteQuiz(c.Request().Context(), id); err != nil {
		h.logger.Error("Failed to delete quiz", "error", err, "quiz_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

// Questions & Answers

type AnswerOption struct {
	ID        *string `json:"id,omitempty"`
	Content   string  `json:"content" validate:"required"`
	IsCorrect bool    `json:"is_correct"`
}

type QuestionRequest struct {
	Content       string         `json:"content" validate:"required"`
	QuestionType  string         `json:"question_type" validate:"required,oneof=SINGLE MULTIPLE"`
	SequenceOrder int32          `json:"sequence_order" validate:"min=0"`
	Answers       []AnswerOption `json:"answers" validate:"required,min=2"`
}

type BulkQuestionsRequest struct {
	Questions []QuestionRequest `json:"questions" validate:"required,dive"`
}

type QuestionResponse struct {
	ID            string         `json:"id"`
	QuizID        string         `json:"quiz_id"`
	Content       string         `json:"content"`
	QuestionType  string         `json:"question_type"`
	SequenceOrder int32          `json:"sequence_order"`
	Answers       []AnswerOption `json:"answers"`
}

func (h *QuizHandler) AddBulkQuestions(c echo.Context) error {
	quizID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	var req BulkQuestionsRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	// Verify quiz exists
	_, err = h.store.GetQuizByID(c.Request().Context(), quizID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Quiz not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	err = h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		for _, qReq := range req.Questions {
			question, err := q.CreateQuestion(c.Request().Context(), generated.CreateQuestionParams{
				QuizID:        quizID,
				Content:       qReq.Content,
				QuestionType:  generated.QuestionType(qReq.QuestionType),
				SequenceOrder: qReq.SequenceOrder,
			})
			if err != nil {
				return err
			}

			for _, aReq := range qReq.Answers {
				_, err = q.CreateAnswer(c.Request().Context(), generated.CreateAnswerParams{
					QuestionID: question.ID,
					Content:    aReq.Content,
					IsCorrect:  aReq.IsCorrect,
				})
				if err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		h.logger.Error("Failed to add bulk questions", "error", err, "quiz_id", quizID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusCreated)
}

func (h *QuizHandler) ListQuestions(c echo.Context) error {
	quizID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	questions, err := h.store.ListQuestionsByQuiz(c.Request().Context(), quizID)
	if err != nil {
		h.logger.Error("Failed to list questions", "error", err, "quiz_id", quizID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]QuestionResponse, 0, len(questions))
	for _, q := range questions {
		answers, err := h.store.ListAnswersByQuestion(c.Request().Context(), q.ID)
		if err != nil {
			return err
		}

		aOpts := make([]AnswerOption, 0, len(answers))
		for _, a := range answers {
			idStr := a.ID.String()
			aOpts = append(aOpts, AnswerOption{
				ID:        &idStr,
				Content:   a.Content,
				IsCorrect: a.IsCorrect,
			})
		}

		resp = append(resp, QuestionResponse{
			ID:            q.ID.String(),
			QuizID:        q.QuizID.String(),
			Content:       q.Content,
			QuestionType:  string(q.QuestionType),
			SequenceOrder: q.SequenceOrder,
			Answers:       aOpts,
		})
	}

	return c.JSON(http.StatusOK, resp)
}

// Node-Quiz Association

type AttachQuizRequest struct {
	QuizID string `json:"quiz_id" validate:"required,uuid"`
}

func (h *QuizHandler) AttachQuizToNode(c echo.Context) error {
	nodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid node ID")
	}

	var req AttachQuizRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	quizID, _ := uuid.Parse(req.QuizID)

	// Verify quiz exists
	_, err = h.store.GetQuizByID(c.Request().Context(), quizID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Quiz not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Verify node exists
	_, err = h.store.GetNodeWithType(c.Request().Context(), nodeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Node not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	err = h.store.AttachQuizToNode(c.Request().Context(), generated.AttachQuizToNodeParams{
		NodeID: nodeID,
		QuizID: quizID,
	})
	if err != nil {
		h.logger.Error("Failed to attach quiz to node", "error", err, "node_id", nodeID, "quiz_id", quizID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *QuizHandler) GetQuizzesByNode(c echo.Context) error {
	nodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid node ID")
	}

	// Verify node exists
	_, err = h.store.GetNodeWithType(c.Request().Context(), nodeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Node not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	quizzes, err := h.store.GetQuizzesByNode(c.Request().Context(), nodeID)
	if err != nil {
		h.logger.Error("Failed to get quizzes by node", "error", err, "node_id", nodeID)
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

func (h *QuizHandler) formatValidationErrors(err error) []map[string]string {
	errors := make([]map[string]string, 0)
	for _, err := range err.(validator.ValidationErrors) {
		errors = append(errors, map[string]string{
			"field":   err.Field(),
			"message": err.Tag(),
		})
	}
	return errors
}
