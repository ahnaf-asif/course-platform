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

	if err := h.store.DeleteChapter(c.Request().Context(), id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

// Tree

type CourseTreeResponse struct {
	ID            string  `json:"id"`
	ParentID      *string `json:"parent_id"`
	NodeType      string  `json:"node_type"`
	Level         int32   `json:"level"`
	Title         string  `json:"title"`
	SequenceOrder *int32  `json:"sequence_order,omitempty"`
}

func (h *CurriculumHandler) GetCourseTree(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid course ID")
	}

	rows, err := h.store.GetCourseTreeHydrated(c.Request().Context(), id)
	if err != nil {
		h.logger.Error("Failed to get hydrated course tree", "error", err, "course_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	if len(rows) == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "Course not found")
	}

	resp := make([]CourseTreeResponse, 0, len(rows))
	for _, row := range rows {
		item := CourseTreeResponse{
			ID:       row.ID.String(),
			NodeType: string(row.NodeType),
			Level:    row.Level,
		}

		if row.ParentID.Valid {
			pID := row.ParentID.UUID.String()
			item.ParentID = &pID
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
		}

		resp = append(resp, item)
	}

	return c.JSON(http.StatusOK, resp)
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
