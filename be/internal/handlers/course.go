package handlers

import (
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"reflect"
	"regexp"
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

	// Register custom validator for slug
	_ = v.RegisterValidation("alphanumhyphen", func(fl validator.FieldLevel) bool {
		return regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`).MatchString(fl.Field().String())
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
	Slug         string  `json:"slug"`
	Description  string  `json:"description"`
	ThumbnailURL *string `json:"thumbnail_url"`
	IsPublished  bool    `json:"is_published"`
	CreatedAt    string  `json:"created_at"`
}

type CreateCourseRequest struct {
	Title        string  `json:"title" validate:"required,min=3,max=255"`
	Slug         *string `json:"slug" validate:"omitempty,lowercase,alphanumhyphen"`
	Description  string  `json:"description" validate:"required,min=10"`
	ThumbnailURL *string `json:"thumbnail_url" validate:"omitempty"`
	IsPublished  bool    `json:"is_published"`
}

func (h *CourseHandler) CreateCourse(c echo.Context) error {
	var req CreateCourseRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Course create validation failed", "error", err, "payload", req)
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	slug := ""
	if req.Slug != nil && *req.Slug != "" {
		slug = *req.Slug
	} else {
		slug = h.generateSlug(req.Title)
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
			Slug:         slug,
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
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			return echo.NewHTTPError(http.StatusConflict, "Slug already exists")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.JSON(http.StatusCreated, h.mapToCourseResponse(courseRow))
}

func (h *CourseHandler) GetCourseBySlug(c echo.Context) error {
	slug := c.Param("slug")
	course, err := h.store.GetCourseBySlug(c.Request().Context(), slug)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Course not found")
		}
		h.logger.Error("Failed to get course by slug", "error", err, "slug", slug)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.JSON(http.StatusOK, h.mapToCourseResponse(generated.GetCourseRow(course)))
}

func (h *CourseHandler) ListCourses(c echo.Context) error {
	courses, err := h.store.ListCourses(c.Request().Context())
	if err != nil {
		h.logger.Error("Failed to list courses", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]CourseResponse, 0, len(courses))
	for _, row := range courses {
		resp = append(resp, h.mapToCourseResponse(generated.GetCourseRow(row)))
	}

	return c.JSON(http.StatusOK, resp)
}

type UpdateCourseRequest struct {
	Title        *string `json:"title" validate:"omitempty,min=3,max=255"`
	Slug         *string `json:"slug" validate:"omitempty,lowercase,alphanumhyphen"`
	Description  *string `json:"description" validate:"omitempty,min=10"`
	ThumbnailURL *string `json:"thumbnail_url" validate:"omitempty"`
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
		h.logger.Error("Course update validation failed", "error", err, "payload", req)
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	params := generated.UpdateCourseParams{
		NodeID: id,
	}

	if req.Title != nil {
		params.Title = sql.NullString{String: *req.Title, Valid: true}
	}
	if req.Slug != nil {
		params.Slug = sql.NullString{String: *req.Slug, Valid: true}
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
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			return echo.NewHTTPError(http.StatusConflict, "Slug already exists")
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

	return c.JSON(http.StatusOK, h.mapToCourseResponse(courseRow))
}

func (h *CourseHandler) generateSlug(title string) string {
	// Simple slug generation: lower case, replace non-alphanumeric with hyphen
	slug := strings.ToLower(title)
	slug = strings.Join(strings.Fields(slug), "-")

	// Remove non-alphanumeric except hyphen
	reg := strings.NewReplacer(
		" ", "-",
		".", "",
		",", "",
		"!", "",
		"?", "",
		"'", "",
		"\"", "",
	)
	slug = reg.Replace(slug)

	// Add a short unique suffix if needed, but for now just basic
	// In a real app we might want to check for collisions and append random string
	return slug
}

func (h *CourseHandler) mapToCourseResponse(row generated.GetCourseRow) CourseResponse {
	resp := CourseResponse{
		ID:          row.ID.String(),
		NodeType:    string(row.NodeType),
		Title:       row.Title,
		Slug:        row.Slug,
		Description: row.Description.String,
		IsPublished: row.IsPublished,
		CreatedAt:   row.CreatedAt.String(),
	}

	if row.ParentID.Valid {
		pID := row.ParentID.UUID.String()
		resp.ParentID = &pID
	}

	if row.ThumbnailUrl.Valid {
		resp.ThumbnailURL = &row.ThumbnailUrl.String
	}

	return resp
}

func (h *CourseHandler) formatValidationErrors(err error) []map[string]string {
	errors := make([]map[string]string, 0)
	for _, err := range err.(validator.ValidationErrors) {
		errors = append(errors, map[string]string{
			"field":   err.Field(),
			"message": err.Tag(),
		})
	}
	return errors
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
