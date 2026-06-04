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

type CourseHandler struct {
	store        db.Store
	cacheService *services.CacheService
	validate     *validator.Validate
	logger       *slog.Logger
	isProduction bool
}

func NewCourseHandler(store db.Store, cacheService *services.CacheService, logger *slog.Logger) *CourseHandler {
	v := validator.New()
	env := os.Getenv("ENV")

	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &CourseHandler{
		store:        store,
		cacheService: cacheService,
		validate:     v,
		logger:       logger,
		isProduction: env == "production",
	}
}

type CourseResponse struct {
	ID           string  `json:"id"`
	ParentID     *string `json:"parent_id"`
	NodeType     string  `json:"node_type"`
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	ThumbnailURL *string `json:"thumbnail_url"`
	IsPublished  bool    `json:"is_published"`
	CreatedAt    string  `json:"created_at"`
}

type CreateCourseRequest struct {
	Title        string  `json:"title" validate:"required,min=3,max=255"`
	Description  string  `json:"description" validate:"required,min=10"`
	ThumbnailURL *string `json:"thumbnail_url" validate:"omitempty,url"`
	IsPublished  bool    `json:"is_published"`
}

func (h *CourseHandler) CreateCourse(c echo.Context) error {
	var req CreateCourseRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		errors := make([]map[string]string, 0)
		for _, err := range err.(validator.ValidationErrors) {
			errors = append(errors, map[string]string{
				"field":   err.Field(),
				"message": err.Tag(),
			})
		}
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": errors})
	}

	var courseRow generated.GetCourseRow
	err := h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		// 1. Create Node
		node, err := q.CreateNode(c.Request().Context(), generated.CreateNodeParams{
			NodeType: generated.NodeTypeCOURSE,
		})
		if err != nil {
			return err
		}

		// 2. Create Course
		thumbnailURL := sql.NullString{}
		if req.ThumbnailURL != nil {
			thumbnailURL = sql.NullString{String: *req.ThumbnailURL, Valid: true}
		}

		_, err = q.CreateCourse(c.Request().Context(), generated.CreateCourseParams{
			NodeID:       node.ID,
			Title:        req.Title,
			Description:  sql.NullString{String: req.Description, Valid: true},
			ThumbnailUrl: thumbnailURL,
			IsPublished:  req.IsPublished,
		})
		if err != nil {
			return err
		}

		// 3. Get Full Course Data
		courseRow, err = q.GetCourse(c.Request().Context(), node.ID)
		return err
	})

	if err != nil {
		h.logger.Error("Failed to create course", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := CourseResponse{
		ID:          courseRow.ID.String(),
		NodeType:    string(courseRow.NodeType),
		Title:       courseRow.Title,
		Description: courseRow.Description.String,
		IsPublished: courseRow.IsPublished,
		CreatedAt:   courseRow.CreatedAt.String(),
	}

	if courseRow.ParentID.Valid {
		pID := courseRow.ParentID.UUID.String()
		resp.ParentID = &pID
	}

	if courseRow.ThumbnailUrl.Valid {
		resp.ThumbnailURL = &courseRow.ThumbnailUrl.String
	}

	return c.JSON(http.StatusCreated, resp)
}

func (h *CourseHandler) ListCourses(c echo.Context) error {
	courses, err := h.store.ListCourses(c.Request().Context())
	if err != nil {
		h.logger.Error("Failed to list courses", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]CourseResponse, 0, len(courses))
	for _, row := range courses {
		course := CourseResponse{
			ID:          row.ID.String(),
			NodeType:    string(row.NodeType),
			Title:       row.Title,
			Description: row.Description.String,
			IsPublished: row.IsPublished,
			CreatedAt:   row.CreatedAt.String(),
		}

		if row.ParentID.Valid {
			pID := row.ParentID.UUID.String()
			course.ParentID = &pID
		}

		if row.ThumbnailUrl.Valid {
			course.ThumbnailURL = &row.ThumbnailUrl.String
		}

		resp = append(resp, course)
	}

	return c.JSON(http.StatusOK, resp)
}

type UpdateCourseRequest struct {
	Title        *string `json:"title" validate:"omitempty,min=3,max=255"`
	Description  *string `json:"description" validate:"omitempty,min=10"`
	ThumbnailURL *string `json:"thumbnail_url" validate:"omitempty,url"`
	IsPublished  *bool   `json:"is_published"`
}

func (h *CourseHandler) UpdateCourse(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid course ID")
	}

	var req UpdateCourseRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		errors := make([]map[string]string, 0)
		for _, err := range err.(validator.ValidationErrors) {
			errors = append(errors, map[string]string{
				"field":   err.Field(),
				"message": err.Tag(),
			})
		}
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": errors})
	}

	params := generated.UpdateCourseParams{
		NodeID: id,
	}

	if req.Title != nil {
		params.Title = sql.NullString{String: *req.Title, Valid: true}
	}
	if req.Description != nil {
		params.Description = sql.NullString{String: *req.Description, Valid: true}
	}
	if req.ThumbnailURL != nil {
		params.ThumbnailUrl = sql.NullString{String: *req.ThumbnailURL, Valid: true}
	}
	if req.IsPublished != nil {
		params.IsPublished = sql.NullBool{Bool: *req.IsPublished, Valid: true}
	}

	_, err = h.store.UpdateCourse(c.Request().Context(), params)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Course not found")
		}
		h.logger.Error("Failed to update course", "error", err, "course_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Fetch updated course
	courseRow, err := h.store.GetCourse(c.Request().Context(), id)
	if err != nil {
		h.logger.Error("Failed to get course after update", "error", err, "course_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := CourseResponse{
		ID:          courseRow.ID.String(),
		NodeType:    string(courseRow.NodeType),
		Title:       courseRow.Title,
		Description: courseRow.Description.String,
		IsPublished: courseRow.IsPublished,
		CreatedAt:   courseRow.CreatedAt.String(),
	}

	if courseRow.ParentID.Valid {
		pID := courseRow.ParentID.UUID.String()
		resp.ParentID = &pID
	}

	if courseRow.ThumbnailUrl.Valid {
		resp.ThumbnailURL = &courseRow.ThumbnailUrl.String
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *CourseHandler) DeleteCourse(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid course ID")
	}

	// Check if exists first to return 404
	_, err = h.store.GetCourse(c.Request().Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Course not found")
		}
		h.logger.Error("Failed to check course existence for deletion", "error", err, "course_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	err = h.store.DeleteCourse(c.Request().Context(), id)
	if err != nil {
		h.logger.Error("Failed to delete course", "error", err, "course_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}
