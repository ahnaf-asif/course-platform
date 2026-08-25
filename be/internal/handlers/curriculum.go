package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/db/generated"
	internalMiddleware "github.com/shafins-course/backend/internal/middleware"
	"github.com/shafins-course/backend/internal/services"
)

type CurriculumHandler struct {
	store        db.Store
	cacheService *services.CacheService
	validate     *validator.Validate
	logger       *slog.Logger
	isProduction bool
}

func NewCurriculumHandler(store db.Store, cacheService *services.CacheService, logger *slog.Logger) *CurriculumHandler {
	v := validator.New()
	env := os.Getenv("ENV")

	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &CurriculumHandler{
		store:        store,
		cacheService: cacheService,
		validate:     v,
		logger:       logger,
		isProduction: env == "production",
	}
}

// Subjects

type SubjectResponse struct {
	ID            string `json:"id"`
	ParentID      string `json:"parent_id"`
	NodeType      string `json:"node_type"`
	Title         string `json:"title"`
	SequenceOrder int32  `json:"sequence_order"`
	CreatedAt     string `json:"created_at"`
}

type CreateSubjectRequest struct {
	ParentID      string `json:"parent_id" validate:"required,uuid"`
	Title         string `json:"title" validate:"required,min=3,max=255"`
	SequenceOrder int32  `json:"sequence_order" validate:"min=0"`
}

func (h *CurriculumHandler) CreateSubject(c echo.Context) error {
	var req CreateSubjectRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	parentID, _ := uuid.Parse(req.ParentID)

	var subjectRow generated.GetSubjectRow
	err := h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		node, err := q.CreateNode(c.Request().Context(), generated.CreateNodeParams{
			ParentID: uuid.NullUUID{UUID: parentID, Valid: true},
			NodeType: generated.NodeTypeSUBJECT,
		})
		if err != nil {
			return err
		}

		_, err = q.CreateSubject(c.Request().Context(), generated.CreateSubjectParams{
			NodeID:        node.ID,
			Title:         req.Title,
			SequenceOrder: req.SequenceOrder,
		})
		if err != nil {
			return err
		}

		subjectRow, err = q.GetSubject(c.Request().Context(), node.ID)
		return err
	})

	if err != nil {
		h.logger.Error("Failed to create subject", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateCourseTreeCache(c.Request().Context(), parentID)

	return c.JSON(http.StatusCreated, SubjectResponse{
		ID:            subjectRow.ID.String(),
		ParentID:      subjectRow.ParentID.UUID.String(),
		NodeType:      string(subjectRow.NodeType),
		Title:         subjectRow.Title,
		SequenceOrder: subjectRow.SequenceOrder,
		CreatedAt:     subjectRow.CreatedAt.String(),
	})
}

type UpdateSubjectRequest struct {
	Title         *string `json:"title" validate:"omitempty,min=3,max=255"`
	SequenceOrder *int32  `json:"sequence_order" validate:"omitempty,min=0"`
}

func (h *CurriculumHandler) UpdateSubject(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid subject ID")
	}

	var req UpdateSubjectRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	params := generated.UpdateSubjectParams{NodeID: id}
	if req.Title != nil {
		params.Title = sql.NullString{String: *req.Title, Valid: true}
	}
	if req.SequenceOrder != nil {
		params.SequenceOrder = sql.NullInt32{Int32: *req.SequenceOrder, Valid: true}
	}

	_, err = h.store.UpdateSubject(c.Request().Context(), params)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Subject not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), id)

	row, _ := h.store.GetSubject(c.Request().Context(), id)
	return c.JSON(http.StatusOK, SubjectResponse{
		ID:            row.ID.String(),
		ParentID:      row.ParentID.UUID.String(),
		NodeType:      string(row.NodeType),
		Title:         row.Title,
		SequenceOrder: row.SequenceOrder,
		CreatedAt:     row.CreatedAt.String(),
	})
}

func (h *CurriculumHandler) DeleteSubject(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid subject ID")
	}

	_, err = h.store.GetSubject(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Subject not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), id)

	if err := h.store.DeleteSubject(c.Request().Context(), id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

// Chapters

type ChapterResponse struct {
	ID            string `json:"id"`
	ParentID      string `json:"parent_id"`
	NodeType      string `json:"node_type"`
	Title         string `json:"title"`
	SequenceOrder int32  `json:"sequence_order"`
	CreatedAt     string `json:"created_at"`
}

type CreateChapterRequest struct {
	ParentID      string `json:"parent_id" validate:"required,uuid"`
	Title         string `json:"title" validate:"required,min=3,max=255"`
	SequenceOrder int32  `json:"sequence_order" validate:"min=0"`
}

func (h *CurriculumHandler) CreateChapter(c echo.Context) error {
	var req CreateChapterRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	parentID, _ := uuid.Parse(req.ParentID)

	var chapterRow generated.GetChapterRow
	err := h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		node, err := q.CreateNode(c.Request().Context(), generated.CreateNodeParams{
			ParentID: uuid.NullUUID{UUID: parentID, Valid: true},
			NodeType: generated.NodeTypeCHAPTER,
		})
		if err != nil {
			return err
		}

		_, err = q.CreateChapter(c.Request().Context(), generated.CreateChapterParams{
			NodeID:        node.ID,
			Title:         req.Title,
			SequenceOrder: req.SequenceOrder,
		})
		if err != nil {
			return err
		}

		chapterRow, err = q.GetChapter(c.Request().Context(), node.ID)
		return err
	})

	if err != nil {
		h.logger.Error("Failed to create chapter", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), parentID)

	return c.JSON(http.StatusCreated, ChapterResponse{
		ID:            chapterRow.ID.String(),
		ParentID:      chapterRow.ParentID.UUID.String(),
		NodeType:      string(chapterRow.NodeType),
		Title:         chapterRow.Title,
		SequenceOrder: chapterRow.SequenceOrder,
		CreatedAt:     chapterRow.CreatedAt.String(),
	})
}

type UpdateChapterRequest struct {
	Title         *string `json:"title" validate:"omitempty,min=3,max=255"`
	SequenceOrder *int32  `json:"sequence_order" validate:"omitempty,min=0"`
}

func (h *CurriculumHandler) UpdateChapter(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid chapter ID")
	}

	var req UpdateChapterRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	params := generated.UpdateChapterParams{NodeID: id}
	if req.Title != nil {
		params.Title = sql.NullString{String: *req.Title, Valid: true}
	}
	if req.SequenceOrder != nil {
		params.SequenceOrder = sql.NullInt32{Int32: *req.SequenceOrder, Valid: true}
	}

	_, err = h.store.UpdateChapter(c.Request().Context(), params)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Chapter not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), id)

	row, _ := h.store.GetChapter(c.Request().Context(), id)
	return c.JSON(http.StatusOK, ChapterResponse{
		ID:            row.ID.String(),
		ParentID:      row.ParentID.UUID.String(),
		NodeType:      string(row.NodeType),
		Title:         row.Title,
		SequenceOrder: row.SequenceOrder,
		CreatedAt:     row.CreatedAt.String(),
	})
}

func (h *CurriculumHandler) DeleteChapter(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid chapter ID")
	}

	_, err = h.store.GetChapter(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Chapter not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), id)

	if err := h.store.DeleteChapter(c.Request().Context(), id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

// Lessons

type LessonResponse struct {
	ID            string  `json:"id"`
	ParentID      string  `json:"parent_id"`
	NodeType      string  `json:"node_type"`
	Title         string  `json:"title"`
	TextContent   *string `json:"text_content"`
	VideoURL      *string `json:"video_url"`
	SequenceOrder int32   `json:"sequence_order"`
	CreatedAt     string  `json:"created_at"`
}

type CreateLessonRequest struct {
	ParentID      string  `json:"parent_id" validate:"required,uuid"`
	Title         string  `json:"title" validate:"required,min=3,max=255"`
	TextContent   *string `json:"text_content"`
	VideoURL      *string `json:"video_url" validate:"omitempty"`
	SequenceOrder int32   `json:"sequence_order" validate:"min=0"`
}

func (h *CurriculumHandler) CreateLesson(c echo.Context) error {
	var req CreateLessonRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	parentID, _ := uuid.Parse(req.ParentID)

	var lessonRow generated.GetLessonRow
	err := h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		node, err := q.CreateNode(c.Request().Context(), generated.CreateNodeParams{
			ParentID: uuid.NullUUID{UUID: parentID, Valid: true},
			NodeType: generated.NodeTypeLESSON,
		})
		if err != nil {
			return err
		}

		params := generated.CreateLessonParams{
			NodeID:        node.ID,
			Title:         req.Title,
			SequenceOrder: req.SequenceOrder,
		}
		if req.TextContent != nil {
			params.TextContent = sql.NullString{String: *req.TextContent, Valid: true}
		}
		if req.VideoURL != nil {
			params.VideoUrl = sql.NullString{String: *req.VideoURL, Valid: true}
		}

		_, err = q.CreateLesson(c.Request().Context(), params)
		if err != nil {
			return err
		}

		lessonRow, err = q.GetLesson(c.Request().Context(), node.ID)
		return err
	})

	if err != nil {
		h.logger.Error("Failed to create lesson", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), parentID)

	resp := LessonResponse{
		ID:            lessonRow.ID.String(),
		ParentID:      lessonRow.ParentID.UUID.String(),
		NodeType:      string(lessonRow.NodeType),
		Title:         lessonRow.Title,
		SequenceOrder: lessonRow.SequenceOrder,
		CreatedAt:     lessonRow.CreatedAt.String(),
	}
	if lessonRow.TextContent.Valid {
		resp.TextContent = &lessonRow.TextContent.String
	}
	if lessonRow.VideoUrl.Valid {
		resp.VideoURL = &lessonRow.VideoUrl.String
	}

	return c.JSON(http.StatusCreated, resp)
}

type UpdateLessonRequest struct {
	Title         *string `json:"title" validate:"omitempty,min=3,max=255"`
	TextContent   *string `json:"text_content"`
	VideoURL      *string `json:"video_url" validate:"omitempty"`
	SequenceOrder *int32  `json:"sequence_order" validate:"omitempty,min=0"`
}

func (h *CurriculumHandler) UpdateLesson(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid lesson ID")
	}

	var req UpdateLessonRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	params := generated.UpdateLessonParams{NodeID: id}
	if req.Title != nil {
		params.Title = sql.NullString{String: *req.Title, Valid: true}
	}
	if req.TextContent != nil {
		params.TextContent = sql.NullString{String: *req.TextContent, Valid: true}
	}
	if req.VideoURL != nil {
		params.VideoUrl = sql.NullString{String: *req.VideoURL, Valid: true}
	}
	if req.SequenceOrder != nil {
		params.SequenceOrder = sql.NullInt32{Int32: *req.SequenceOrder, Valid: true}
	}

	_, err = h.store.UpdateLesson(c.Request().Context(), params)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Lesson not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), id)

	row, _ := h.store.GetLesson(c.Request().Context(), id)
	resp := LessonResponse{
		ID:            row.ID.String(),
		ParentID:      row.ParentID.UUID.String(),
		NodeType:      string(row.NodeType),
		Title:         row.Title,
		SequenceOrder: row.SequenceOrder,
		CreatedAt:     row.CreatedAt.String(),
	}
	if row.TextContent.Valid {
		resp.TextContent = &row.TextContent.String
	}
	if row.VideoUrl.Valid {
		resp.VideoURL = &row.VideoUrl.String
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *CurriculumHandler) GetLesson(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid lesson ID")
	}

	row, err := h.store.GetLesson(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Lesson not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := LessonResponse{
		ID:            row.ID.String(),
		ParentID:      row.ParentID.UUID.String(),
		NodeType:      string(row.NodeType),
		Title:         row.Title,
		SequenceOrder: row.SequenceOrder,
		CreatedAt:     row.CreatedAt.String(),
	}
	if row.TextContent.Valid {
		resp.TextContent = &row.TextContent.String
	}
	if row.VideoUrl.Valid {
		resp.VideoURL = &row.VideoUrl.String
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *CurriculumHandler) DeleteLesson(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid lesson ID")
	}

	_, err = h.store.GetLesson(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Lesson not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), id)

	if err := h.store.DeleteLesson(c.Request().Context(), id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

// Model Tests

type ModelTestSummaryResponse struct {
	DurationMinutes     int32   `json:"duration_minutes"`
	TotalMarks          float64 `json:"total_marks"`
	PassMarks           float64 `json:"pass_marks"`
	NegativeMarkingRate float64 `json:"negative_marking_rate"`
}

type ModelTestResponse struct {
	ID                  string  `json:"id"`
	ParentID            string  `json:"parent_id"`
	NodeType            string  `json:"node_type"`
	Title               string  `json:"title"`
	Description         string  `json:"description"`
	DurationMinutes     int32   `json:"duration_minutes"`
	TotalMarks          float64 `json:"total_marks"`
	PassMarks           float64 `json:"pass_marks"`
	NegativeMarkingRate float64 `json:"negative_marking_rate"`
	SequenceOrder       int32   `json:"sequence_order"`
	CreatedAt           string  `json:"created_at"`
	QuizID              *string `json:"quiz_id,omitempty"`
}

type CreateModelTestRequest struct {
	ParentID            string  `json:"parent_id" validate:"required,uuid"`
	Title               string  `json:"title" validate:"required,min=3,max=255"`
	Description         string  `json:"description"`
	DurationMinutes     int32   `json:"duration_minutes" validate:"min=1"`
	TotalMarks          float64 `json:"total_marks" validate:"min=1"`
	PassMarks           float64 `json:"pass_marks" validate:"min=0"`
	NegativeMarkingRate float64 `json:"negative_marking_rate" validate:"min=0"`
	SequenceOrder       int32   `json:"sequence_order" validate:"min=0"`
}

type UpdateModelTestRequest struct {
	Title               string   `json:"title" validate:"omitempty,min=3,max=255"`
	Description         *string  `json:"description"`
	DurationMinutes     *int32   `json:"duration_minutes" validate:"omitempty,min=1"`
	TotalMarks          *float64 `json:"total_marks" validate:"omitempty,min=1"`
	PassMarks           *float64 `json:"pass_marks" validate:"omitempty,min=0"`
	NegativeMarkingRate *float64 `json:"negative_marking_rate" validate:"omitempty,min=0"`
	SequenceOrder       *int32   `json:"sequence_order" validate:"omitempty,min=0"`
}

func (h *CurriculumHandler) CreateModelTest(c echo.Context) error {
	var req CreateModelTestRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	parentID, _ := uuid.Parse(req.ParentID)

	var mtRow generated.GetModelTestRow
	var quizID uuid.UUID
	err := h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		node, err := q.CreateNode(c.Request().Context(), generated.CreateNodeParams{
			ParentID: uuid.NullUUID{UUID: parentID, Valid: true},
			NodeType: generated.NodeTypeMODELTEST,
		})
		if err != nil {
			return err
		}

		duration := req.DurationMinutes
		if duration <= 0 {
			duration = 60
		}
		totalMarks := req.TotalMarks
		if totalMarks <= 0 {
			totalMarks = 100.0
		}
		passMarks := req.PassMarks
		if passMarks <= 0 {
			passMarks = 40.0
		}
		negRate := req.NegativeMarkingRate
		if negRate < 0 {
			negRate = 0.50
		}

		_, err = q.CreateModelTest(c.Request().Context(), generated.CreateModelTestParams{
			NodeID:              node.ID,
			Title:               req.Title,
			Description:         req.Description,
			DurationMinutes:     duration,
			TotalMarks:          fmt.Sprintf("%.2f", totalMarks),
			PassMarks:           fmt.Sprintf("%.2f", passMarks),
			NegativeMarkingRate: fmt.Sprintf("%.2f", negRate),
			SequenceOrder:       req.SequenceOrder,
		})
		if err != nil {
			return err
		}

		// Create linked quiz for question management
		quiz, err := q.CreateQuiz(c.Request().Context(), generated.CreateQuizParams{
			Title:        req.Title,
			PassingScore: int32(passMarks),
		})
		if err != nil {
			return err
		}
		quizID = quiz.ID

		if err := q.AttachQuizToNode(c.Request().Context(), generated.AttachQuizToNodeParams{
			NodeID: node.ID,
			QuizID: quiz.ID,
		}); err != nil {
			return err
		}

		mtRow, err = q.GetModelTest(c.Request().Context(), node.ID)
		return err
	})

	if err != nil {
		h.logger.Error("Failed to create model test", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), parentID)

	tm, _ := strconv.ParseFloat(mtRow.TotalMarks, 64)
	pm, _ := strconv.ParseFloat(mtRow.PassMarks, 64)
	nm, _ := strconv.ParseFloat(mtRow.NegativeMarkingRate, 64)
	quizIDStr := quizID.String()

	resp := ModelTestResponse{
		ID:                  mtRow.ID.String(),
		ParentID:            mtRow.ParentID.UUID.String(),
		NodeType:            string(mtRow.NodeType),
		Title:               mtRow.Title,
		Description:         mtRow.Description,
		DurationMinutes:     mtRow.DurationMinutes,
		TotalMarks:          tm,
		PassMarks:           pm,
		NegativeMarkingRate: nm,
		SequenceOrder:       mtRow.SequenceOrder,
		CreatedAt:           mtRow.CreatedAt.String(),
		QuizID:              &quizIDStr,
	}

	return c.JSON(http.StatusCreated, resp)
}

func (h *CurriculumHandler) GetModelTest(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid model test ID")
	}

	mtRow, err := h.store.GetModelTest(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Model test not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	tm, _ := strconv.ParseFloat(mtRow.TotalMarks, 64)
	pm, _ := strconv.ParseFloat(mtRow.PassMarks, 64)
	nm, _ := strconv.ParseFloat(mtRow.NegativeMarkingRate, 64)

	var quizIDStr *string
	quizzes, _ := h.store.GetQuizzesByNode(c.Request().Context(), id)
	if len(quizzes) > 0 {
		qStr := quizzes[0].ID.String()
		quizIDStr = &qStr
	}

	resp := ModelTestResponse{
		ID:                  mtRow.ID.String(),
		ParentID:            mtRow.ParentID.UUID.String(),
		NodeType:            string(mtRow.NodeType),
		Title:               mtRow.Title,
		Description:         mtRow.Description,
		DurationMinutes:     mtRow.DurationMinutes,
		TotalMarks:          tm,
		PassMarks:           pm,
		NegativeMarkingRate: nm,
		SequenceOrder:       mtRow.SequenceOrder,
		CreatedAt:           mtRow.CreatedAt.String(),
		QuizID:              quizIDStr,
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *CurriculumHandler) UpdateModelTest(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid model test ID")
	}

	var req UpdateModelTestRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	_, err = h.store.GetModelTest(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Model test not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	params := generated.UpdateModelTestParams{
		NodeID: id,
	}
	if req.Title != "" {
		params.Title = sql.NullString{String: req.Title, Valid: true}
	}
	if req.Description != nil {
		params.Description = sql.NullString{String: *req.Description, Valid: true}
	}
	if req.DurationMinutes != nil {
		params.DurationMinutes = sql.NullInt32{Int32: *req.DurationMinutes, Valid: true}
	}
	if req.TotalMarks != nil {
		params.TotalMarks = sql.NullString{String: fmt.Sprintf("%.2f", *req.TotalMarks), Valid: true}
	}
	if req.PassMarks != nil {
		params.PassMarks = sql.NullString{String: fmt.Sprintf("%.2f", *req.PassMarks), Valid: true}
	}
	if req.NegativeMarkingRate != nil {
		params.NegativeMarkingRate = sql.NullString{String: fmt.Sprintf("%.2f", *req.NegativeMarkingRate), Valid: true}
	}
	if req.SequenceOrder != nil {
		params.SequenceOrder = sql.NullInt32{Int32: *req.SequenceOrder, Valid: true}
	}

	if _, err := h.store.UpdateModelTest(c.Request().Context(), params); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), id)

	mtRow, err := h.store.GetModelTest(c.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	tm, _ := strconv.ParseFloat(mtRow.TotalMarks, 64)
	pm, _ := strconv.ParseFloat(mtRow.PassMarks, 64)
	nm, _ := strconv.ParseFloat(mtRow.NegativeMarkingRate, 64)

	var quizIDStr *string
	quizzes, _ := h.store.GetQuizzesByNode(c.Request().Context(), id)
	if len(quizzes) > 0 {
		qStr := quizzes[0].ID.String()
		quizIDStr = &qStr
	}

	resp := ModelTestResponse{
		ID:                  mtRow.ID.String(),
		ParentID:            mtRow.ParentID.UUID.String(),
		NodeType:            string(mtRow.NodeType),
		Title:               mtRow.Title,
		Description:         mtRow.Description,
		DurationMinutes:     mtRow.DurationMinutes,
		TotalMarks:          tm,
		PassMarks:           pm,
		NegativeMarkingRate: nm,
		SequenceOrder:       mtRow.SequenceOrder,
		CreatedAt:           mtRow.CreatedAt.String(),
		QuizID:              quizIDStr,
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *CurriculumHandler) DeleteModelTest(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid model test ID")
	}

	_, err = h.store.GetModelTest(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Model test not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	h.invalidateNodeCache(c.Request().Context(), id)

	if err := h.store.DeleteModelTest(c.Request().Context(), id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

// Tree

type CourseTreeResponse struct {
	ID             string                    `json:"id"`
	ParentID       *string                   `json:"parent_id"`
	NodeType       string                    `json:"node_type"`
	Level          int32                     `json:"level"`
	Title          string                    `json:"title"`
	SequenceOrder  *int32                    `json:"sequence_order,omitempty"`
	VideoURL       *string                   `json:"video_url,omitempty"`
	TextContent    *string                   `json:"text_content,omitempty"`
	HasQuizzes     bool                      `json:"has_quizzes"`
	Quizzes        []CourseQuizResponse      `json:"quizzes,omitempty"`
	ProgressStatus *string                   `json:"progress_status,omitempty"`
	ModelTest      *ModelTestSummaryResponse `json:"model_test,omitempty"`
}

type CourseQuizResponse struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	PassingScore int32  `json:"passing_score"`
	IsPassed     bool   `json:"is_passed"`
}

type CachedCourseTree struct {
	CourseID  string               `json:"course_id"`
	IsPaid    bool                 `json:"is_paid"`
	TreeNodes []CourseTreeResponse `json:"tree_nodes"`
}

type UpsertProgressRequest struct {
	Status string `json:"status" validate:"required,oneof=STARTED COMPLETED"`
}

type ProgressResponse struct {
	UserID    string    `json:"user_id"`
	NodeID    string    `json:"node_id"`
	Status    string    `json:"status"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (h *CurriculumHandler) invalidateCourseTreeCache(ctx context.Context, courseID uuid.UUID) {
	if h.cacheService == nil {
		return
	}
	_ = h.cacheService.Delete(ctx, "course:tree:id:"+courseID.String())
	if course, err := h.store.GetCourse(ctx, courseID); err == nil {
		_ = h.cacheService.Delete(ctx, "course:tree:slug:"+course.Slug)
		_ = h.cacheService.Delete(ctx, "course:public:slug:"+course.Slug)
	}
}

func (h *CurriculumHandler) invalidateNodeCache(ctx context.Context, nodeID uuid.UUID) {
	if h.cacheService == nil {
		return
	}
	_ = h.cacheService.Delete(ctx, "lesson:content:"+nodeID.String())
	ancestors, err := h.store.GetNodeAncestors(ctx, nodeID)
	if err == nil {
		for _, a := range ancestors {
			if a.NodeType == generated.NodeTypeCOURSE {
				h.invalidateCourseTreeCache(ctx, a.ID)
				break
			}
		}
	}
}

func (h *CurriculumHandler) GetCourseTree(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid course ID")
	}

	ctx := c.Request().Context()
	var cachedTree CachedCourseTree
	var courseID uuid.UUID = id
	var isPaid bool
	var baseTree []CourseTreeResponse
	cacheHit := false

	if h.cacheService != nil {
		cacheKey := "course:tree:id:" + id.String()
		if err := h.cacheService.Get(ctx, cacheKey, &cachedTree); err == nil && len(cachedTree.TreeNodes) > 0 {
			isPaid = cachedTree.IsPaid
			baseTree = cachedTree.TreeNodes
			cacheHit = true
		}
	}

	if !cacheHit {
		rows, err := h.store.GetCourseTreeHydrated(ctx, id)
		if err != nil {
			h.logger.Error("Failed to get hydrated course tree", "error", err, "course_id", id)
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
		}

		if len(rows) == 0 {
			return echo.NewHTTPError(http.StatusNotFound, "Course not found")
		}

		courseID = rows[0].ID
		pg, pgErr := h.store.GetPaymentGateByNode(ctx, courseID)
		isPaid = pgErr == nil && pg.Price != "0.00"

		lessonIDs := make([]uuid.UUID, 0)
		for _, row := range rows {
			if row.NodeType == generated.NodeTypeLESSON || row.NodeType == generated.NodeTypeMODELTEST {
				lessonIDs = append(lessonIDs, row.ID)
			}
		}

		quizzesMap := make(map[uuid.UUID][]CourseQuizResponse)
		if len(lessonIDs) > 0 {
			quizzes, err := h.store.GetQuizzesByNodes(ctx, lessonIDs)
			if err == nil {
				for _, q := range quizzes {
					quizzesMap[q.NodeID] = append(quizzesMap[q.NodeID], CourseQuizResponse{
						ID:           q.QuizID.String(),
						Title:        q.Title,
						PassingScore: q.PassingScore,
					})
				}
			} else {
				h.logger.Error("Failed to get quizzes for nodes in course tree", "error", err)
			}
		}

		baseTree = h.mapToCourseTreeResponse(rows, true, quizzesMap, nil)

		if h.cacheService != nil {
			cachedData := CachedCourseTree{
				CourseID:  courseID.String(),
				IsPaid:    isPaid,
				TreeNodes: baseTree,
			}
			_ = h.cacheService.Set(ctx, "course:tree:id:"+id.String(), cachedData, 24*time.Hour)
			if course, err := h.store.GetCourse(ctx, courseID); err == nil {
				_ = h.cacheService.Set(ctx, "course:tree:slug:"+course.Slug, cachedData, 24*time.Hour)
			}
		}
	}

	// Access control check and auth extraction
	hasAccess := false
	var userID uuid.UUID
	var isUserLoggedIn bool
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID != "" {
		if uID, err := uuid.Parse(authUser.ID); err == nil {
			userID = uID
			isUserLoggedIn = true
		}
	}

	if !isPaid {
		hasAccess = true
	} else {
		if authUser.Role == "ADMIN" {
			hasAccess = true
		} else if isUserLoggedIn {
			ok, _ := h.store.CheckUserAccessToNode(ctx, generated.CheckUserAccessToNodeParams{
				ID:     courseID,
				UserID: userID,
			})
			hasAccess = ok
		}
	}

	progressMap := make(map[uuid.UUID]string)
	passedQuizzesMap := make(map[uuid.UUID]bool)
	nodeQuizMap := make(map[uuid.UUID][]uuid.UUID)

	if isUserLoggedIn {
		progressList, err := h.store.ListProgressByUser(ctx, userID)
		if err == nil {
			for _, p := range progressList {
				progressMap[p.NodeID] = string(p.Status)
			}
		}

		allQuizIDs := make([]uuid.UUID, 0)
		allNodeIDs := make([]uuid.UUID, 0, len(baseTree))

		for _, node := range baseTree {
			if nID, err := uuid.Parse(node.ID); err == nil {
				allNodeIDs = append(allNodeIDs, nID)
			}
			for _, q := range node.Quizzes {
				if qID, err := uuid.Parse(q.ID); err == nil {
					allQuizIDs = append(allQuizIDs, qID)
					nID, _ := uuid.Parse(node.ID)
					nodeQuizMap[nID] = append(nodeQuizMap[nID], qID)
				}
			}
		}

		if len(allNodeIDs) > 0 {
			if quizzes, err := h.store.GetQuizzesByNodes(ctx, allNodeIDs); err == nil {
				for _, q := range quizzes {
					allQuizIDs = append(allQuizIDs, q.QuizID)
					nodeQuizMap[q.NodeID] = append(nodeQuizMap[q.NodeID], q.QuizID)
				}
			}
		}

		if len(allQuizIDs) > 0 {
			attempts, err := h.store.GetUserQuizAttemptsForQuizzes(ctx, generated.GetUserQuizAttemptsForQuizzesParams{
				UserID:  userID,
				QuizIds: allQuizIDs,
			})
			if err == nil {
				for _, a := range attempts {
					passedQuizzesMap[a.QuizID] = true
				}
			}
		}
	}

	resp := make([]CourseTreeResponse, len(baseTree))
	for i, node := range baseTree {
		item := node
		nodeID, _ := uuid.Parse(node.ID)

		hasCompletedQuiz := false
		for _, qID := range nodeQuizMap[nodeID] {
			if passedQuizzesMap[qID] {
				hasCompletedQuiz = true
				break
			}
		}
		if !hasCompletedQuiz {
			for _, q := range node.Quizzes {
				qID, _ := uuid.Parse(q.ID)
				if passedQuizzesMap[qID] {
					hasCompletedQuiz = true
					break
				}
			}
		}

		if status, ok := progressMap[nodeID]; ok && status == "COMPLETED" {
			statusStr := "COMPLETED"
			item.ProgressStatus = &statusStr
		} else if hasCompletedQuiz {
			statusStr := "COMPLETED"
			item.ProgressStatus = &statusStr
		} else if status, ok := progressMap[nodeID]; ok {
			statusStr := status
			item.ProgressStatus = &statusStr
		} else {
			item.ProgressStatus = nil
		}

		if !hasAccess {
			item.VideoURL = nil
			item.TextContent = nil
		}

		if len(node.Quizzes) > 0 {
			quizzes := make([]CourseQuizResponse, len(node.Quizzes))
			for j, q := range node.Quizzes {
				qCopy := q
				qID, _ := uuid.Parse(q.ID)
				qCopy.IsPassed = passedQuizzesMap[qID]
				quizzes[j] = qCopy
			}
			item.Quizzes = quizzes
		} else if len(nodeQuizMap[nodeID]) > 0 {
			quizzes := make([]CourseQuizResponse, len(nodeQuizMap[nodeID]))
			for j, qID := range nodeQuizMap[nodeID] {
				quizzes[j] = CourseQuizResponse{
					ID:       qID.String(),
					IsPassed: passedQuizzesMap[qID],
				}
			}
			item.Quizzes = quizzes
		}

		resp[i] = item
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *CurriculumHandler) GetCourseTreeBySlug(c echo.Context) error {
	slug := c.Param("slug")
	ctx := c.Request().Context()

	var cachedTree CachedCourseTree
	var courseID uuid.UUID
	var isPaid bool
	var baseTree []CourseTreeResponse
	cacheHit := false

	if h.cacheService != nil {
		cacheKey := "course:tree:slug:" + slug
		if err := h.cacheService.Get(ctx, cacheKey, &cachedTree); err == nil && len(cachedTree.TreeNodes) > 0 {
			if parsedID, err := uuid.Parse(cachedTree.CourseID); err == nil {
				courseID = parsedID
				isPaid = cachedTree.IsPaid
				baseTree = cachedTree.TreeNodes
				cacheHit = true
			}
		}
	}

	if !cacheHit {
		rows, err := h.store.GetCourseTreeHydratedBySlug(ctx, slug)
		if err != nil {
			h.logger.Error("Failed to get hydrated course tree by slug", "error", err, "slug", slug)
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
		}

		if len(rows) == 0 {
			return echo.NewHTTPError(http.StatusNotFound, "Course not found")
		}

		courseID = rows[0].ID
		pg, pgErr := h.store.GetPaymentGateByNode(ctx, courseID)
		isPaid = pgErr == nil && pg.Price != "0.00"

		lessonIDs := make([]uuid.UUID, 0)
		for _, row := range rows {
			if row.NodeType == generated.NodeTypeLESSON || row.NodeType == generated.NodeTypeMODELTEST {
				lessonIDs = append(lessonIDs, row.ID)
			}
		}

		quizzesMap := make(map[uuid.UUID][]CourseQuizResponse)
		if len(lessonIDs) > 0 {
			quizzes, err := h.store.GetQuizzesByNodes(ctx, lessonIDs)
			if err == nil {
				for _, q := range quizzes {
					quizzesMap[q.NodeID] = append(quizzesMap[q.NodeID], CourseQuizResponse{
						ID:           q.QuizID.String(),
						Title:        q.Title,
						PassingScore: q.PassingScore,
					})
				}
			} else {
				h.logger.Error("Failed to get quizzes for nodes in course tree", "error", err)
			}
		}

		baseTree = h.mapToCourseTreeResponseBySlug(rows, true, quizzesMap, nil)

		if h.cacheService != nil {
			cachedData := CachedCourseTree{
				CourseID:  courseID.String(),
				IsPaid:    isPaid,
				TreeNodes: baseTree,
			}
			_ = h.cacheService.Set(ctx, "course:tree:slug:"+slug, cachedData, 24*time.Hour)
			_ = h.cacheService.Set(ctx, "course:tree:id:"+courseID.String(), cachedData, 24*time.Hour)
		}
	}

	// Access control check and auth extraction
	hasAccess := false
	var userID uuid.UUID
	var isUserLoggedIn bool
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID != "" {
		if uID, err := uuid.Parse(authUser.ID); err == nil {
			userID = uID
			isUserLoggedIn = true
		}
	}

	if !isPaid {
		hasAccess = true
	} else {
		if authUser.Role == "ADMIN" {
			hasAccess = true
		} else if isUserLoggedIn {
			ok, _ := h.store.CheckUserAccessToNode(ctx, generated.CheckUserAccessToNodeParams{
				ID:     courseID,
				UserID: userID,
			})
			hasAccess = ok
		}
	}

	progressMap := make(map[uuid.UUID]string)
	passedQuizzesMap := make(map[uuid.UUID]bool)
	nodeQuizMap := make(map[uuid.UUID][]uuid.UUID)

	if isUserLoggedIn {
		progressList, err := h.store.ListProgressByUser(ctx, userID)
		if err == nil {
			for _, p := range progressList {
				progressMap[p.NodeID] = string(p.Status)
			}
		}

		allQuizIDs := make([]uuid.UUID, 0)
		allNodeIDs := make([]uuid.UUID, 0, len(baseTree))

		for _, node := range baseTree {
			if nID, err := uuid.Parse(node.ID); err == nil {
				allNodeIDs = append(allNodeIDs, nID)
			}
			for _, q := range node.Quizzes {
				if qID, err := uuid.Parse(q.ID); err == nil {
					allQuizIDs = append(allQuizIDs, qID)
					nID, _ := uuid.Parse(node.ID)
					nodeQuizMap[nID] = append(nodeQuizMap[nID], qID)
				}
			}
		}

		if len(allNodeIDs) > 0 {
			if quizzes, err := h.store.GetQuizzesByNodes(ctx, allNodeIDs); err == nil {
				for _, q := range quizzes {
					allQuizIDs = append(allQuizIDs, q.QuizID)
					nodeQuizMap[q.NodeID] = append(nodeQuizMap[q.NodeID], q.QuizID)
				}
			}
		}

		if len(allQuizIDs) > 0 {
			attempts, err := h.store.GetUserQuizAttemptsForQuizzes(ctx, generated.GetUserQuizAttemptsForQuizzesParams{
				UserID:  userID,
				QuizIds: allQuizIDs,
			})
			if err == nil {
				for _, a := range attempts {
					passedQuizzesMap[a.QuizID] = true
				}
			}
		}
	}

	resp := make([]CourseTreeResponse, len(baseTree))
	for i, node := range baseTree {
		item := node
		nodeID, _ := uuid.Parse(node.ID)

		hasCompletedQuiz := false
		for _, qID := range nodeQuizMap[nodeID] {
			if passedQuizzesMap[qID] {
				hasCompletedQuiz = true
				break
			}
		}
		if !hasCompletedQuiz {
			for _, q := range node.Quizzes {
				qID, _ := uuid.Parse(q.ID)
				if passedQuizzesMap[qID] {
					hasCompletedQuiz = true
					break
				}
			}
		}

		if status, ok := progressMap[nodeID]; ok && status == "COMPLETED" {
			statusStr := "COMPLETED"
			item.ProgressStatus = &statusStr
		} else if hasCompletedQuiz {
			statusStr := "COMPLETED"
			item.ProgressStatus = &statusStr
		} else if status, ok := progressMap[nodeID]; ok {
			statusStr := status
			item.ProgressStatus = &statusStr
		} else {
			item.ProgressStatus = nil
		}

		if !hasAccess {
			item.VideoURL = nil
			item.TextContent = nil
		}

		if len(node.Quizzes) > 0 {
			quizzes := make([]CourseQuizResponse, len(node.Quizzes))
			for j, q := range node.Quizzes {
				qCopy := q
				qID, _ := uuid.Parse(q.ID)
				qCopy.IsPassed = passedQuizzesMap[qID]
				quizzes[j] = qCopy
			}
			item.Quizzes = quizzes
		} else if len(nodeQuizMap[nodeID]) > 0 {
			quizzes := make([]CourseQuizResponse, len(nodeQuizMap[nodeID]))
			for j, qID := range nodeQuizMap[nodeID] {
				quizzes[j] = CourseQuizResponse{
					ID:       qID.String(),
					IsPassed: passedQuizzesMap[qID],
				}
			}
			item.Quizzes = quizzes
		}

		resp[i] = item
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *CurriculumHandler) GetUserLesson(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid lesson ID")
	}

	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID in token")
	}

	// Fetch Lesson info to find parent chapter and course
	row, err := h.store.GetLesson(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Lesson not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Check access
	hasAccess := false
	if authUser.Role == "ADMIN" {
		hasAccess = true
	} else {
		ok, err := h.store.CheckUserAccessToNode(ctx, generated.CheckUserAccessToNodeParams{
			ID:     id,
			UserID: userID,
		})
		if err == nil && ok {
			hasAccess = true
		}
	}

	// If no explicit order, check if parent course is free (no price or price == 0)
	if !hasAccess {
		ancestors, err := h.store.GetCourseTree(ctx, id)
		if err == nil {
			var courseID uuid.UUID
			for _, a := range ancestors {
				if a.NodeType == generated.NodeTypeCOURSE {
					courseID = a.ID
					break
				}
			}
			pg, pgErr := h.store.GetPaymentGateByNode(ctx, courseID)
			if pgErr == sql.ErrNoRows || (pgErr == nil && pg.Price == "0.00") {
				hasAccess = true
			}
		}
	}

	if !hasAccess {
		return echo.NewHTTPError(http.StatusForbidden, "Course purchase required to access this content")
	}

	// Check Redis cache for lesson content
	if h.cacheService != nil {
		var cachedResp LessonResponse
		cacheKey := "lesson:content:" + id.String()
		if err := h.cacheService.Get(ctx, cacheKey, &cachedResp); err == nil && cachedResp.ID != "" {
			return c.JSON(http.StatusOK, cachedResp)
		}
	}

	resp := LessonResponse{
		ID:            row.ID.String(),
		ParentID:      row.ParentID.UUID.String(),
		NodeType:      string(row.NodeType),
		Title:         row.Title,
		SequenceOrder: row.SequenceOrder,
		CreatedAt:     row.CreatedAt.String(),
	}
	if row.TextContent.Valid {
		resp.TextContent = &row.TextContent.String
	}
	if row.VideoUrl.Valid {
		resp.VideoURL = &row.VideoUrl.String
	}

	if h.cacheService != nil {
		cacheKey := "lesson:content:" + id.String()
		_ = h.cacheService.Set(ctx, cacheKey, resp, 24*time.Hour)
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *CurriculumHandler) mapToCourseTreeResponse(rows []generated.GetCourseTreeHydratedRow, hasAccess bool, quizzesMap map[uuid.UUID][]CourseQuizResponse, progressMap map[uuid.UUID]string) []CourseTreeResponse {
	resp := make([]CourseTreeResponse, 0, len(rows))
	for _, row := range rows {
		item := CourseTreeResponse{
			ID:         row.ID.String(),
			NodeType:   string(row.NodeType),
			Level:      row.Level,
			HasQuizzes: row.HasQuizzes,
		}

		if row.ParentID.Valid {
			pID := row.ParentID.UUID.String()
			item.ParentID = &pID
		}

		if status, ok := progressMap[row.ID]; ok {
			statusStr := status
			item.ProgressStatus = &statusStr
		}

		// Hydrate title and sequence order based on type
		switch row.NodeType {
		case generated.NodeTypeCOURSE:
			item.Title = row.CourseTitle.String
		case generated.NodeTypeSUBJECT:
			item.Title = row.SubjectTitle.String
			if row.SubjectOrder.Valid {
				item.SequenceOrder = &row.SubjectOrder.Int32
			}
		case generated.NodeTypeCHAPTER:
			item.Title = row.ChapterTitle.String
			if row.ChapterOrder.Valid {
				item.SequenceOrder = &row.ChapterOrder.Int32
			}
		case generated.NodeTypeLESSON:
			item.Title = row.LessonTitle.String
			if row.LessonOrder.Valid {
				item.SequenceOrder = &row.LessonOrder.Int32
			}
			if hasAccess && row.LessonVideoUrl.Valid {
				vURL := row.LessonVideoUrl.String
				item.VideoURL = &vURL
			}
			if hasAccess && row.LessonTextContent.Valid {
				tContent := row.LessonTextContent.String
				item.TextContent = &tContent
			}
			if qList, ok := quizzesMap[row.ID]; ok {
				item.Quizzes = qList
			} else {
				item.Quizzes = make([]CourseQuizResponse, 0)
			}
		case generated.NodeTypeMODELTEST:
			item.Title = row.ModelTestTitle.String
			if row.ModelTestOrder.Valid {
				item.SequenceOrder = &row.ModelTestOrder.Int32
			}
			dur := row.ModelTestDuration.Int32
			tm, _ := strconv.ParseFloat(row.ModelTestTotalMarks.String, 64)
			pm, _ := strconv.ParseFloat(row.ModelTestPassMarks.String, 64)
			nm, _ := strconv.ParseFloat(row.ModelTestNegativeMark.String, 64)
			item.ModelTest = &ModelTestSummaryResponse{
				DurationMinutes:     dur,
				TotalMarks:          tm,
				PassMarks:           pm,
				NegativeMarkingRate: nm,
			}
			if qList, ok := quizzesMap[row.ID]; ok {
				item.Quizzes = qList
			} else {
				item.Quizzes = make([]CourseQuizResponse, 0)
			}
		}

		resp = append(resp, item)
	}
	return resp
}

func (h *CurriculumHandler) mapToCourseTreeResponseBySlug(rows []generated.GetCourseTreeHydratedBySlugRow, hasAccess bool, quizzesMap map[uuid.UUID][]CourseQuizResponse, progressMap map[uuid.UUID]string) []CourseTreeResponse {
	resp := make([]CourseTreeResponse, 0, len(rows))
	for _, row := range rows {
		item := CourseTreeResponse{
			ID:         row.ID.String(),
			NodeType:   string(row.NodeType),
			Level:      row.Level,
			HasQuizzes: row.HasQuizzes,
		}

		if row.ParentID.Valid {
			pID := row.ParentID.UUID.String()
			item.ParentID = &pID
		}

		if status, ok := progressMap[row.ID]; ok {
			statusStr := status
			item.ProgressStatus = &statusStr
		}

		// Hydrate title and sequence order based on type
		switch row.NodeType {
		case generated.NodeTypeCOURSE:
			item.Title = row.CourseTitle.String
		case generated.NodeTypeSUBJECT:
			item.Title = row.SubjectTitle.String
			if row.SubjectOrder.Valid {
				item.SequenceOrder = &row.SubjectOrder.Int32
			}
		case generated.NodeTypeCHAPTER:
			item.Title = row.ChapterTitle.String
			if row.ChapterOrder.Valid {
				item.SequenceOrder = &row.ChapterOrder.Int32
			}
		case generated.NodeTypeLESSON:
			item.Title = row.LessonTitle.String
			if row.LessonOrder.Valid {
				item.SequenceOrder = &row.LessonOrder.Int32
			}
			if hasAccess && row.LessonVideoUrl.Valid {
				vURL := row.LessonVideoUrl.String
				item.VideoURL = &vURL
			}
			if hasAccess && row.LessonTextContent.Valid {
				tContent := row.LessonTextContent.String
				item.TextContent = &tContent
			}
			if qList, ok := quizzesMap[row.ID]; ok {
				item.Quizzes = qList
			} else {
				item.Quizzes = make([]CourseQuizResponse, 0)
			}
		case generated.NodeTypeMODELTEST:
			item.Title = row.ModelTestTitle.String
			if row.ModelTestOrder.Valid {
				item.SequenceOrder = &row.ModelTestOrder.Int32
			}
			dur := row.ModelTestDuration.Int32
			tm, _ := strconv.ParseFloat(row.ModelTestTotalMarks.String, 64)
			pm, _ := strconv.ParseFloat(row.ModelTestPassMarks.String, 64)
			nm, _ := strconv.ParseFloat(row.ModelTestNegativeMark.String, 64)
			item.ModelTest = &ModelTestSummaryResponse{
				DurationMinutes:     dur,
				TotalMarks:          tm,
				PassMarks:           pm,
				NegativeMarkingRate: nm,
			}
			if qList, ok := quizzesMap[row.ID]; ok {
				item.Quizzes = qList
			} else {
				item.Quizzes = make([]CourseQuizResponse, 0)
			}
		}

		resp = append(resp, item)
	}
	return resp
}

func (h *CurriculumHandler) GetMediaUploadToken(c echo.Context) error {
	mediaServerURL := os.Getenv("MEDIA_SERVER_URL")
	apiKey := os.Getenv("MEDIA_SERVER_API_KEY")

	// Call Media Server to get a temporary token for the "upload" action
	req, _ := http.NewRequest("GET", mediaServerURL+"/stream-token/upload", nil)
	req.Header.Set("X-API-KEY", apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Media server unreachable")
	}
	defer resp.Body.Close()

	return c.Stream(resp.StatusCode, resp.Header.Get("Content-Type"), resp.Body)
}

func (h *CurriculumHandler) GetMediaStreamToken(c echo.Context) error {
	ctx := c.Request().Context()
	videoID := c.Param("videoId")
	if videoID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Missing videoId")
	}

	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	// 1. If not admin, verify student enrollment/access to the lesson's course
	if authUser.Role != string(generated.UserRoleADMIN) {
		userUUID, err := uuid.Parse(authUser.ID)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
		}

		lessonNode, err := h.store.GetLessonByVideoURL(ctx, sql.NullString{String: videoID, Valid: true})
		if err == nil {
			hasAccess, err := h.store.CheckUserAccessToNode(ctx, generated.CheckUserAccessToNodeParams{
				ID:     lessonNode.ID,
				UserID: userUUID,
			})
			if err != nil || !hasAccess {
				return echo.NewHTTPError(http.StatusForbidden, "Course enrollment required to access this video")
			}
		}
	}

	mediaServerURL := os.Getenv("MEDIA_SERVER_URL")
	apiKey := os.Getenv("MEDIA_SERVER_API_KEY")

	req, err := http.NewRequestWithContext(ctx, "GET", mediaServerURL+"/stream-token/"+videoID, nil)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create request")
	}
	req.Header.Set("X-API-KEY", apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Media server unreachable")
	}
	defer resp.Body.Close()

	return c.Stream(resp.StatusCode, resp.Header.Get("Content-Type"), resp.Body)
}

func (h *CurriculumHandler) TriggerMediaTranscode(c echo.Context) error {
	ctx := c.Request().Context()
	mediaServerURL := os.Getenv("MEDIA_SERVER_URL")
	apiKey := os.Getenv("MEDIA_SERVER_API_KEY")

	req, err := http.NewRequestWithContext(ctx, "POST", mediaServerURL+"/transcode", c.Request().Body)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create request")
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-KEY", apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Media server unreachable")
	}
	defer resp.Body.Close()

	return c.Stream(resp.StatusCode, resp.Header.Get("Content-Type"), resp.Body)
}

func (h *CurriculumHandler) GetMediaTaskStatus(c echo.Context) error {
	ctx := c.Request().Context()
	taskID := c.Param("taskID")
	mediaServerURL := os.Getenv("MEDIA_SERVER_URL")
	apiKey := os.Getenv("MEDIA_SERVER_API_KEY")

	req, err := http.NewRequestWithContext(ctx, "GET", mediaServerURL+"/tasks/"+taskID, nil)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create request")
	}
	req.Header.Set("X-API-KEY", apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Media server unreachable")
	}
	defer resp.Body.Close()

	return c.Stream(resp.StatusCode, resp.Header.Get("Content-Type"), resp.Body)
}

// StudentUpsertProgress upserts progress status (STARTED or COMPLETED) for a node (lesson, course, etc.)
func (h *CurriculumHandler) StudentUpsertProgress(c echo.Context) error {
	nodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid node ID")
	}

	var req UpsertProgressRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	progress, err := h.store.UpsertProgress(ctx, generated.UpsertProgressParams{
		UserID: userID,
		NodeID: nodeID,
		Status: generated.ProgressStatus(req.Status),
	})
	if err != nil {
		h.logger.Error("Failed to upsert progress", "error", err, "node_id", nodeID, "user_id", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.JSON(http.StatusOK, ProgressResponse{
		UserID:    progress.UserID.String(),
		NodeID:    progress.NodeID.String(),
		Status:    string(progress.Status),
		UpdatedAt: progress.UpdatedAt,
	})
}

func (h *CurriculumHandler) formatValidationErrors(err error) []map[string]string {
	errors := make([]map[string]string, 0)
	for _, err := range err.(validator.ValidationErrors) {
		errors = append(errors, map[string]string{
			"field":   err.Field(),
			"message": err.Tag(),
		})
	}
	return errors
}
