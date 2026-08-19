package handlers

import (
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"reflect"
	"regexp"
	"strings"
	"time"

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
	Price        *string `json:"price,omitempty"`
	Currency     *string `json:"currency,omitempty"`
	CreatedAt    string  `json:"created_at"`
}

type CreateCourseRequest struct {
	Title        string  `json:"title" validate:"required,min=3,max=255"`
	Slug         *string `json:"slug" validate:"omitempty,lowercase,alphanumhyphen"`
	Description  string  `json:"description" validate:"required,min=10"`
	ThumbnailURL *string `json:"thumbnail_url" validate:"omitempty"`
	IsPublished  bool    `json:"is_published"`
	Price        *string `json:"price" validate:"omitempty"`
	Currency     *string `json:"currency" validate:"omitempty"`
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

		// Upsert Payment Gate if price and currency are provided
		if req.Price != nil && *req.Price != "" {
			currency := "BDT"
			if req.Currency != nil && *req.Currency != "" {
				currency = *req.Currency
			}
			_, err = q.UpsertPaymentGate(c.Request().Context(), generated.UpsertPaymentGateParams{
				NodeID:   node.ID,
				Price:    *req.Price,
				Currency: currency,
			})
			if err != nil {
				return err
			}
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
	ctx := c.Request().Context()
	cacheKey := "course:public:slug:" + slug

	if h.cacheService != nil {
		var cachedCourse CourseResponse
		if err := h.cacheService.Get(ctx, cacheKey, &cachedCourse); err == nil && cachedCourse.ID != "" {
			return c.JSON(http.StatusOK, cachedCourse)
		}
	}

	course, err := h.store.GetCourseBySlug(ctx, slug)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Course not found")
		}
		h.logger.Error("Failed to get course by slug", "error", err, "slug", slug)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := h.mapToCourseResponse(generated.GetCourseRow(course))
	if h.cacheService != nil {
		_ = h.cacheService.Set(ctx, cacheKey, resp, 24*time.Hour)
	}

	return c.JSON(http.StatusOK, resp)
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

func (h *CourseHandler) ListPublishedCourses(c echo.Context) error {
	courses, err := h.store.ListPublishedCourses(c.Request().Context())
	if err != nil {
		h.logger.Error("Failed to list published courses", "error", err)
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
	Price        *string `json:"price" validate:"omitempty"`
	Currency     *string `json:"currency" validate:"omitempty"`
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

	err = h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		_, err = q.UpdateCourse(c.Request().Context(), params)
		if err != nil {
			return err
		}

		if req.Price != nil {
			if *req.Price == "" {
				err = q.DeletePaymentGate(c.Request().Context(), id)
				if err != nil && err != sql.ErrNoRows {
					return err
				}
			} else {
				currency := "BDT"
				if req.Currency != nil && *req.Currency != "" {
					currency = *req.Currency
				} else {
					existing, err := q.GetPaymentGateByNode(c.Request().Context(), id)
					if err == nil {
						currency = existing.Currency
					}
				}
				_, err = q.UpsertPaymentGate(c.Request().Context(), generated.UpsertPaymentGateParams{
					NodeID:   id,
					Price:    *req.Price,
					Currency: currency,
				})
				if err != nil {
					return err
				}
			}
		} else if req.Currency != nil && *req.Currency != "" {
			existing, err := q.GetPaymentGateByNode(c.Request().Context(), id)
			if err == nil {
				_, err = q.UpsertPaymentGate(c.Request().Context(), generated.UpsertPaymentGateParams{
					NodeID:   id,
					Price:    existing.Price,
					Currency: *req.Currency,
				})
				if err != nil {
					return err
				}
			}
		}
		return nil
	})

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

	if h.cacheService != nil {
		_ = h.cacheService.Delete(c.Request().Context(), "course:public:slug:"+courseRow.Slug)
		_ = h.cacheService.Delete(c.Request().Context(), "course:tree:id:"+id.String())
		_ = h.cacheService.Delete(c.Request().Context(), "course:tree:slug:"+courseRow.Slug)
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

	if row.Price.Valid {
		resp.Price = &row.Price.String
	}

	if row.Currency.Valid {
		resp.Currency = &row.Currency.String
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
	course, err := h.store.GetCourse(c.Request().Context(), id)
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

	if h.cacheService != nil {
		_ = h.cacheService.Delete(c.Request().Context(), "course:public:slug:"+course.Slug)
		_ = h.cacheService.Delete(c.Request().Context(), "course:tree:id:"+id.String())
		_ = h.cacheService.Delete(c.Request().Context(), "course:tree:slug:"+course.Slug)
	}

	return c.NoContent(http.StatusNoContent)
}
