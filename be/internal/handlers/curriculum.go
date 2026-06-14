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

	if err := h.store.DeleteLesson(c.Request().Context(), id); err != nil {
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
	VideoURL      *string `json:"video_url,omitempty"`
	TextContent   *string `json:"text_content,omitempty"`
	HasQuizzes    bool    `json:"has_quizzes"`
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

	return c.JSON(http.StatusOK, h.mapToCourseTreeResponse(rows))
}

func (h *CurriculumHandler) GetCourseTreeBySlug(c echo.Context) error {
	slug := c.Param("slug")

	rows, err := h.store.GetCourseTreeHydratedBySlug(c.Request().Context(), slug)
	if err != nil {
		h.logger.Error("Failed to get hydrated course tree by slug", "error", err, "slug", slug)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	if len(rows) == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "Course not found")
	}

	return c.JSON(http.StatusOK, h.mapToCourseTreeResponseBySlug(rows))
}

func (h *CurriculumHandler) mapToCourseTreeResponse(rows []generated.GetCourseTreeHydratedRow) []CourseTreeResponse {
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
			if row.LessonVideoUrl.Valid {
				vURL := row.LessonVideoUrl.String
				item.VideoURL = &vURL
			}
			if row.LessonTextContent.Valid {
				tContent := row.LessonTextContent.String
				item.TextContent = &tContent
			}
		}

		resp = append(resp, item)
	}
	return resp
}

func (h *CurriculumHandler) mapToCourseTreeResponseBySlug(rows []generated.GetCourseTreeHydratedBySlugRow) []CourseTreeResponse {
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
			if row.LessonVideoUrl.Valid {
				vURL := row.LessonVideoUrl.String
				item.VideoURL = &vURL
			}
			if row.LessonTextContent.Valid {
				tContent := row.LessonTextContent.String
				item.TextContent = &tContent
			}
		}

		resp = append(resp, item)
	}
	return resp
}

func (h *CurriculumHandler) GetMediaUploadURL(c echo.Context) error {
	fileName := c.QueryParam("file_name")
	visibility := c.QueryParam("visibility")
	if fileName == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "file_name is required")
	}

	mediaServerURL := os.Getenv("MEDIA_SERVER_URL")
	apiKey := os.Getenv("MEDIA_SERVER_API_KEY")

	// Call Media Server to get a signed upload URL
	req, _ := http.NewRequest("GET", mediaServerURL+"/upload-url", nil)
	q := req.URL.Query()
	q.Add("file_name", fileName)
	if visibility != "" {
		q.Add("visibility", visibility)
	}
	req.URL.RawQuery = q.Encode()
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
	videoID := c.Param("videoId")
	mediaServerURL := os.Getenv("MEDIA_SERVER_URL")
	apiKey := os.Getenv("MEDIA_SERVER_API_KEY")

	req, _ := http.NewRequest("GET", mediaServerURL+"/stream-token/"+videoID, nil)
	req.Header.Set("X-API-KEY", apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Media server unreachable")
	}
	defer resp.Body.Close()

	return c.Stream(resp.StatusCode, resp.Header.Get("Content-Type"), resp.Body)
}

func (h *CurriculumHandler) TriggerMediaTranscode(c echo.Context) error {
	mediaServerURL := os.Getenv("MEDIA_SERVER_URL")
	apiKey := os.Getenv("MEDIA_SERVER_API_KEY")

	req, _ := http.NewRequest("POST", mediaServerURL+"/transcode", c.Request().Body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-KEY", apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Media server unreachable")
	}
	defer resp.Body.Close()

	return c.Stream(resp.StatusCode, resp.Header.Get("Content-Type"), resp.Body)
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
