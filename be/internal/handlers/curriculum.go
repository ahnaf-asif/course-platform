package handlers

import (
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"reflect"
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
	ID             string               `json:"id"`
	ParentID       *string              `json:"parent_id"`
	NodeType       string               `json:"node_type"`
	Level          int32                `json:"level"`
	Title          string               `json:"title"`
	SequenceOrder  *int32               `json:"sequence_order,omitempty"`
	VideoURL       *string              `json:"video_url,omitempty"`
	TextContent    *string              `json:"text_content,omitempty"`
	HasQuizzes     bool                 `json:"has_quizzes"`
	Quizzes        []CourseQuizResponse `json:"quizzes,omitempty"`
	ProgressStatus *string              `json:"progress_status,omitempty"`
}

type CourseQuizResponse struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	PassingScore int32  `json:"passing_score"`
	IsPassed     bool   `json:"is_passed"`
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



func (h *CurriculumHandler) GetCourseTree(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid course ID")
	}

	ctx := c.Request().Context()
	rows, err := h.store.GetCourseTreeHydrated(ctx, id)
	if err != nil {
		h.logger.Error("Failed to get hydrated course tree", "error", err, "course_id", id)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	if len(rows) == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "Course not found")
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

	pg, pgErr := h.store.GetPaymentGateByNode(ctx, id)
	isPaid := pgErr == nil && pg.Price != "0.00"

	if !isPaid {
		hasAccess = true
	} else {
		if authUser.Role == "ADMIN" {
			hasAccess = true
		} else if isUserLoggedIn {
			ok, _ := h.store.CheckUserAccessToNode(ctx, generated.CheckUserAccessToNodeParams{
				ID:     id,
				UserID: userID,
			})
			hasAccess = ok
		}
	}

	// Fetch all quizzes for the lesson nodes
	lessonIDs := make([]uuid.UUID, 0)
	for _, row := range rows {
		if row.NodeType == generated.NodeTypeLESSON {
			lessonIDs = append(lessonIDs, row.ID)
		}
	}

	progressMap := make(map[uuid.UUID]string)
	if isUserLoggedIn {
		progressList, err := h.store.ListProgressByUser(ctx, userID)
		if err == nil {
			for _, p := range progressList {
				progressMap[p.NodeID] = string(p.Status)
			}
		}
	}

	quizzesMap := make(map[uuid.UUID][]CourseQuizResponse)
	if len(lessonIDs) > 0 {
		quizzes, err := h.store.GetQuizzesByNodes(ctx, lessonIDs)
		if err == nil {
			quizIDs := make([]uuid.UUID, 0)
			for _, q := range quizzes {
				quizIDs = append(quizIDs, q.QuizID)
			}

			passedQuizzesMap := make(map[uuid.UUID]bool)
			if isUserLoggedIn && len(quizIDs) > 0 {
				attempts, err := h.store.GetUserQuizAttemptsForQuizzes(ctx, generated.GetUserQuizAttemptsForQuizzesParams{
					UserID:  userID,
					QuizIds: quizIDs,
				})
				if err == nil {
					for _, a := range attempts {
						if a.IsPassed {
							passedQuizzesMap[a.QuizID] = true
						}
					}
				}
			}

			for _, q := range quizzes {
				quizzesMap[q.NodeID] = append(quizzesMap[q.NodeID], CourseQuizResponse{
					ID:           q.QuizID.String(),
					Title:        q.Title,
					PassingScore: q.PassingScore,
					IsPassed:     passedQuizzesMap[q.QuizID],
				})
			}
		} else {
			h.logger.Error("Failed to get quizzes for nodes in course tree", "error", err)
		}
	}

	return c.JSON(http.StatusOK, h.mapToCourseTreeResponse(rows, hasAccess, quizzesMap, progressMap))
}

func (h *CurriculumHandler) GetCourseTreeBySlug(c echo.Context) error {
	slug := c.Param("slug")
	ctx := c.Request().Context()

	rows, err := h.store.GetCourseTreeHydratedBySlug(ctx, slug)
	if err != nil {
		h.logger.Error("Failed to get hydrated course tree by slug", "error", err, "slug", slug)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	if len(rows) == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "Course not found")
	}

	courseID := rows[0].ID

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

	pg, pgErr := h.store.GetPaymentGateByNode(ctx, courseID)
	isPaid := pgErr == nil && pg.Price != "0.00"

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

	// Fetch all quizzes for the lesson nodes
	lessonIDs := make([]uuid.UUID, 0)
	for _, row := range rows {
		if row.NodeType == generated.NodeTypeLESSON {
			lessonIDs = append(lessonIDs, row.ID)
		}
	}

	progressMap := make(map[uuid.UUID]string)
	if isUserLoggedIn {
		progressList, err := h.store.ListProgressByUser(ctx, userID)
		if err == nil {
			for _, p := range progressList {
				progressMap[p.NodeID] = string(p.Status)
			}
		}
	}

	quizzesMap := make(map[uuid.UUID][]CourseQuizResponse)
	if len(lessonIDs) > 0 {
		quizzes, err := h.store.GetQuizzesByNodes(ctx, lessonIDs)
		if err == nil {
			quizIDs := make([]uuid.UUID, 0)
			for _, q := range quizzes {
				quizIDs = append(quizIDs, q.QuizID)
			}

			passedQuizzesMap := make(map[uuid.UUID]bool)
			if isUserLoggedIn && len(quizIDs) > 0 {
				attempts, err := h.store.GetUserQuizAttemptsForQuizzes(ctx, generated.GetUserQuizAttemptsForQuizzesParams{
					UserID:  userID,
					QuizIds: quizIDs,
				})
				if err == nil {
					for _, a := range attempts {
						if a.IsPassed {
							passedQuizzesMap[a.QuizID] = true
						}
					}
				}
			}

			for _, q := range quizzes {
				quizzesMap[q.NodeID] = append(quizzesMap[q.NodeID], CourseQuizResponse{
					ID:           q.QuizID.String(),
					Title:        q.Title,
					PassingScore: q.PassingScore,
					IsPassed:     passedQuizzesMap[q.QuizID],
				})
			}
		} else {
			h.logger.Error("Failed to get quizzes for nodes in course tree", "error", err)
		}
	}

	return c.JSON(http.StatusOK, h.mapToCourseTreeResponseBySlug(rows, hasAccess, quizzesMap, progressMap))
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

func (h *CurriculumHandler) GetMediaTaskStatus(c echo.Context) error {
	taskID := c.Param("taskID")
	mediaServerURL := os.Getenv("MEDIA_SERVER_URL")
	apiKey := os.Getenv("MEDIA_SERVER_API_KEY")

	req, _ := http.NewRequest("GET", mediaServerURL+"/tasks/"+taskID, nil)
	req.Header.Set("X-API-KEY", apiKey)

	client := &http.Client{}
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
