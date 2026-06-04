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

type TagHandler struct {
	store        db.Store
	cacheService *services.CacheService
	validate     *validator.Validate
	logger       *slog.Logger
	isProduction bool
}

func NewTagHandler(store db.Store, cacheService *services.CacheService, logger *slog.Logger) *TagHandler {
	v := validator.New()
	env := os.Getenv("ENV")

	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	_ = v.RegisterValidation("slug", func(fl validator.FieldLevel) bool {
		match, _ := regexp.MatchString("^[a-z0-9-]+$", fl.Field().String())
		return match
	})

	return &TagHandler{
		store:        store,
		cacheService: cacheService,
		validate:     v,
		logger:       logger,
		isProduction: env == "production",
	}
}

type TagResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	CreatedAt string `json:"created_at"`
}

type CreateTagRequest struct {
	Name string `json:"name" validate:"required,min=2,max=50"`
	Slug string `json:"slug" validate:"omitempty,min=2,max=50,slug"`
}

func (h *TagHandler) CreateTag(c echo.Context) error {
	var req CreateTagRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	slug := req.Slug
	if slug == "" {
		slug = h.slugify(req.Name)
	}

	tag, err := h.store.CreateTag(c.Request().Context(), generated.CreateTagParams{
		Name: req.Name,
		Slug: slug,
	})
	if err != nil {
		h.logger.Error("Failed to create tag", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.JSON(http.StatusCreated, TagResponse{
		ID:        tag.ID.String(),
		Name:      tag.Name,
		Slug:      tag.Slug,
		CreatedAt: tag.CreatedAt.String(),
	})
}

func (h *TagHandler) ListTags(c echo.Context) error {
	tags, err := h.store.ListTags(c.Request().Context())
	if err != nil {
		h.logger.Error("Failed to list tags", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]TagResponse, 0, len(tags))
	for _, t := range tags {
		resp = append(resp, TagResponse{
			ID:        t.ID.String(),
			Name:      t.Name,
			Slug:      t.Slug,
			CreatedAt: t.CreatedAt.String(),
		})
	}

	return c.JSON(http.StatusOK, resp)
}

type UpdateTagRequest struct {
	Name *string `json:"name" validate:"omitempty,min=2,max=50"`
	Slug *string `json:"slug" validate:"omitempty,min=2,max=50,slug"`
}

func (h *TagHandler) UpdateTag(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid tag ID")
	}

	var req UpdateTagRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	params := generated.UpdateTagParams{ID: id}
	if req.Name != nil {
		params.Name = sql.NullString{String: *req.Name, Valid: true}
	}
	if req.Slug != nil {
		params.Slug = sql.NullString{String: *req.Slug, Valid: true}
	}

	tag, err := h.store.UpdateTag(c.Request().Context(), params)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Tag not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.JSON(http.StatusOK, TagResponse{
		ID:        tag.ID.String(),
		Name:      tag.Name,
		Slug:      tag.Slug,
		CreatedAt: tag.CreatedAt.String(),
	})
}

func (h *TagHandler) DeleteTag(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid tag ID")
	}

	if err := h.store.DeleteTag(c.Request().Context(), id); err != nil {
		h.logger.Error("Failed to delete tag", "error", err, "tag_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

type AttachTagRequest struct {
	TagID string `json:"tag_id" validate:"required,uuid"`
}

func (h *TagHandler) AttachTagToNode(c echo.Context) error {
	nodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid node ID")
	}

	var req AttachTagRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	tagID, _ := uuid.Parse(req.TagID)

	// Verify node exists
	_, err = h.store.GetNodeWithType(c.Request().Context(), nodeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Node not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	err = h.store.AttachTagToNode(c.Request().Context(), generated.AttachTagToNodeParams{
		NodeID: nodeID,
		TagID:  tagID,
	})
	if err != nil {
		h.logger.Error("Failed to attach tag to node", "error", err, "node_id", nodeID, "tag_id", tagID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *TagHandler) ListTagsByNode(c echo.Context) error {
	nodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid node ID")
	}

	tags, err := h.store.ListTagsByNode(c.Request().Context(), nodeID)
	if err != nil {
		h.logger.Error("Failed to list tags by node", "error", err, "node_id", nodeID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]TagResponse, 0, len(tags))
	for _, t := range tags {
		resp = append(resp, TagResponse{
			ID:        t.ID.String(),
			Name:      t.Name,
			Slug:      t.Slug,
			CreatedAt: t.CreatedAt.String(),
		})
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *TagHandler) slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.TrimSpace(s)
	reg, _ := regexp.Compile("[^a-z0-9]+")
	s = reg.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func (h *TagHandler) formatValidationErrors(err error) []map[string]string {
	errors := make([]map[string]string, 0)
	for _, err := range err.(validator.ValidationErrors) {
		errors = append(errors, map[string]string{
			"field":   err.Field(),
			"message": err.Tag(),
		})
	}
	return errors
}
