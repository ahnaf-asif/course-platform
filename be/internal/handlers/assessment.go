package handlers

import (
	"database/sql"
	"fmt"
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
	minioService services.IMinioService
	taskService  *services.TaskService
	validate     *validator.Validate
	logger       *slog.Logger
	isProduction bool
}

func NewQuizHandler(store db.Store, cacheService *services.CacheService, minioService services.IMinioService, taskService *services.TaskService, logger *slog.Logger) *QuizHandler {
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
		minioService: minioService,
		taskService:  taskService,
		validate:     v,
		logger:       logger,
		isProduction: env == "production",
	}
}

func (h *QuizHandler) BulkUploadCSV(c echo.Context) error {
	quizID := c.Param("id")
	if _, err := uuid.Parse(quizID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "CSV file is required")
	}

	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	// 1. Upload CSV to Minio (temporary)
	objectName := fmt.Sprintf("bulkupload/quiz/%s/%s_%s", quizID, uuid.New().String(), file.Filename)
	bucket := os.Getenv("MINIO_BUCKET_TEMP")
	if bucket == "" {
		bucket = "temp-imports"
	}

	err = h.minioService.UploadFile(c.Request().Context(), bucket, objectName, src, file.Size, "text/csv")
	if err != nil {
		h.logger.Error("Failed to upload CSV to Minio", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to stage import file")
	}

	// 2. Enqueue Task for Background Processing
	taskID, err := h.taskService.EnqueueQuizBulkUpload(quizID, objectName, bucket)
	if err != nil {
		h.logger.Error("Failed to enqueue bulk upload task", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to start background import")
	}

	return c.JSON(http.StatusAccepted, map[string]string{
		"message": "Bulk upload started in background",
		"task_id": taskID,
	})
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

func (h *QuizHandler) ListQuizzes(c echo.Context) error {
	quizzes, err := h.store.ListQuizzes(c.Request().Context())
	if err != nil {
		h.logger.Error("Failed to list quizzes", "error", err)
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
	Explanation   *string        `json:"explanation,omitempty"`
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
	Explanation   *string        `json:"explanation,omitempty"`
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
			params := generated.CreateQuestionParams{
				QuizID:        quizID,
				Content:       qReq.Content,
				QuestionType:  generated.QuestionType(qReq.QuestionType),
				SequenceOrder: qReq.SequenceOrder,
			}
			if qReq.Explanation != nil {
				params.Explanation = sql.NullString{String: *qReq.Explanation, Valid: true}
			}

			question, err := q.CreateQuestion(c.Request().Context(), params)
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

		var explanation *string
		if q.Explanation.Valid {
			explanation = &q.Explanation.String
		}

		resp = append(resp, QuestionResponse{
			ID:            q.ID.String(),
			QuizID:        q.QuizID.String(),
			Content:       q.Content,
			QuestionType:  string(q.QuestionType),
			SequenceOrder: q.SequenceOrder,
			Explanation:   explanation,
			Answers:       aOpts,
		})
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *QuizHandler) UpdateQuestion(c echo.Context) error {
	quizID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	qID, err := uuid.Parse(c.Param("qId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid question ID")
	}

	var req QuestionRequest
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

	var updatedQuestion generated.Question
	err = h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		params := generated.UpdateQuestionParams{
			ID:            qID,
			Content:       sql.NullString{String: req.Content, Valid: true},
			QuestionType:  generated.NullQuestionType{QuestionType: generated.QuestionType(req.QuestionType), Valid: true},
			SequenceOrder: sql.NullInt32{Int32: req.SequenceOrder, Valid: true},
		}
		if req.Explanation != nil {
			params.Explanation = sql.NullString{String: *req.Explanation, Valid: true}
		}

		updatedQuestion, err = q.UpdateQuestion(c.Request().Context(), params)
		if err != nil {
			return err
		}

		// Update answers: delete and recreate
		if err := q.DeleteAnswersByQuestion(c.Request().Context(), qID); err != nil {
			return err
		}

		for _, aReq := range req.Answers {
			_, err = q.CreateAnswer(c.Request().Context(), generated.CreateAnswerParams{
				QuestionID: qID,
				Content:    aReq.Content,
				IsCorrect:  aReq.IsCorrect,
			})
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Question not found")
		}
		h.logger.Error("Failed to update question", "error", err, "question_id", qID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Return full response with answers
	answers, err := h.store.ListAnswersByQuestion(c.Request().Context(), updatedQuestion.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve answers")
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

	var explanation *string
	if updatedQuestion.Explanation.Valid {
		explanation = &updatedQuestion.Explanation.String
	}

	return c.JSON(http.StatusOK, QuestionResponse{
		ID:            updatedQuestion.ID.String(),
		QuizID:        updatedQuestion.QuizID.String(),
		Content:       updatedQuestion.Content,
		QuestionType:  string(updatedQuestion.QuestionType),
		SequenceOrder: updatedQuestion.SequenceOrder,
		Explanation:   explanation,
		Answers:       aOpts,
	})
}

func (h *QuizHandler) DeleteQuestion(c echo.Context) error {
	id, err := uuid.Parse(c.Param("qId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid question ID")
	}

	if err := h.store.DeleteQuestion(c.Request().Context(), id); err != nil {
		h.logger.Error("Failed to delete question", "error", err, "question_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
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

	if h.cacheService != nil {
		if ancestors, err := h.store.GetCourseTree(c.Request().Context(), nodeID); err == nil {
			for _, a := range ancestors {
				if a.NodeType == generated.NodeTypeCOURSE {
					_ = h.cacheService.Delete(c.Request().Context(), "course:tree:id:"+a.ID.String())
					if course, err := h.store.GetCourse(c.Request().Context(), a.ID); err == nil {
						_ = h.cacheService.Delete(c.Request().Context(), "course:tree:slug:"+course.Slug)
					}
					break
				}
			}
		}
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

func (h *QuizHandler) DetachQuizFromNode(c echo.Context) error {
	nodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid node ID")
	}

	quizID, err := uuid.Parse(c.Param("quizId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid quiz ID")
	}

	err = h.store.DetachQuizFromNode(c.Request().Context(), generated.DetachQuizFromNodeParams{
		NodeID: nodeID,
		QuizID: quizID,
	})
	if err != nil {
		h.logger.Error("Failed to detach quiz from node", "error", err, "node_id", nodeID, "quiz_id", quizID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	if h.cacheService != nil {
		if ancestors, err := h.store.GetCourseTree(c.Request().Context(), nodeID); err == nil {
			for _, a := range ancestors {
				if a.NodeType == generated.NodeTypeCOURSE {
					_ = h.cacheService.Delete(c.Request().Context(), "course:tree:id:"+a.ID.String())
					if course, err := h.store.GetCourse(c.Request().Context(), a.ID); err == nil {
						_ = h.cacheService.Delete(c.Request().Context(), "course:tree:slug:"+course.Slug)
					}
					break
				}
			}
		}
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *QuizHandler) GetTaskStatus(c echo.Context) error {
	taskID := c.Param("taskID")
	status, err := h.taskService.GetTaskStatus(taskID)
	if err != nil {
		h.logger.Error("Failed to get task status", "error", err, "task_id", taskID)
		return echo.NewHTTPError(http.StatusNotFound, "Task not found")
	}

	return c.JSON(http.StatusOK, status)
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
