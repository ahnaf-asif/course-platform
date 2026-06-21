package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestCurriculumHandler_GetCourseTree(t *testing.T) {
	e := echo.New()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	t.Run("Invalid Course ID", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		req := httptest.NewRequest(http.MethodGet, "/courses/not-a-uuid/tree", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues("not-a-uuid")

		err := h.GetCourseTree(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, he.Code)
	})

	t.Run("Database Error", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		courseID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/courses/"+courseID.String()+"/tree", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID.String())

		mockStore.On("GetCourseTreeHydrated", mock.Anything, courseID).Return([]generated.GetCourseTreeHydratedRow{}, errors.New("db error"))

		err := h.GetCourseTree(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, he.Code)
	})

	t.Run("Course Not Found", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		courseID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/courses/"+courseID.String()+"/tree", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID.String())

		mockStore.On("GetCourseTreeHydrated", mock.Anything, courseID).Return([]generated.GetCourseTreeHydratedRow{}, nil)

		err := h.GetCourseTree(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, he.Code)
	})

	t.Run("Free Course Access - Unmasked", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		courseID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/courses/"+courseID.String()+"/tree", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID.String())

		mockStore.On("GetCourseTreeHydrated", mock.Anything, courseID).Return([]generated.GetCourseTreeHydratedRow{
			{
				ID:          courseID,
				NodeType:    generated.NodeTypeCOURSE,
				CourseTitle: sql.NullString{String: "Free Course", Valid: true},
			},
			{
				ID:                uuid.New(),
				NodeType:          generated.NodeTypeLESSON,
				LessonTitle:       sql.NullString{String: "Lesson 1", Valid: true},
				LessonVideoUrl:    sql.NullString{String: "http://video.com", Valid: true},
				LessonTextContent: sql.NullString{String: "Hello world", Valid: true},
			},
		}, nil)

		// GetPaymentGateByNode returns sql.ErrNoRows -> Free course
		mockStore.On("GetPaymentGateByNode", mock.Anything, courseID).Return(generated.PaymentGate{}, sql.ErrNoRows)

		err := h.GetCourseTree(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp []CourseTreeResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Len(t, resp, 2)
		assert.Equal(t, "http://video.com", *resp[1].VideoURL)
		assert.Equal(t, "Hello world", *resp[1].TextContent)
	})

	t.Run("Paid Course Access Control - Masked for Unpaid Guest", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		courseID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/courses/"+courseID.String()+"/tree", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID.String())

		mockStore.On("GetCourseTreeHydrated", mock.Anything, courseID).Return([]generated.GetCourseTreeHydratedRow{
			{
				ID:          courseID,
				NodeType:    generated.NodeTypeCOURSE,
				CourseTitle: sql.NullString{String: "Paid Course", Valid: true},
			},
			{
				ID:                uuid.New(),
				NodeType:          generated.NodeTypeLESSON,
				LessonTitle:       sql.NullString{String: "Lesson 1", Valid: true},
				LessonVideoUrl:    sql.NullString{String: "http://video.com", Valid: true},
				LessonTextContent: sql.NullString{String: "Hello world", Valid: true},
			},
		}, nil)

		mockStore.On("GetPaymentGateByNode", mock.Anything, courseID).Return(generated.PaymentGate{
			Price: "99.00",
		}, nil)

		err := h.GetCourseTree(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp []CourseTreeResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Len(t, resp, 2)
		assert.Nil(t, resp[1].VideoURL)
		assert.Nil(t, resp[1].TextContent)
	})
}

func TestCurriculumHandler_GetCourseTreeBySlug(t *testing.T) {
	e := echo.New()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	t.Run("Success Paid Unmasked for Admin", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		courseID := uuid.New()
		slug := "paid-course"
		req := httptest.NewRequest(http.MethodGet, "/courses/s/"+slug+"/tree", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(slug)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:   uuid.New().String(),
			Role: "ADMIN",
		})

		mockStore.On("GetCourseTreeHydratedBySlug", mock.Anything, slug).Return([]generated.GetCourseTreeHydratedBySlugRow{
			{
				ID:          courseID,
				NodeType:    generated.NodeTypeCOURSE,
				CourseTitle: sql.NullString{String: "Paid Course", Valid: true},
			},
			{
				ID:                uuid.New(),
				NodeType:          generated.NodeTypeLESSON,
				LessonTitle:       sql.NullString{String: "Lesson 1", Valid: true},
				LessonVideoUrl:    sql.NullString{String: "http://video.com", Valid: true},
				LessonTextContent: sql.NullString{String: "Hello world", Valid: true},
			},
		}, nil)

		mockStore.On("GetPaymentGateByNode", mock.Anything, courseID).Return(generated.PaymentGate{
			Price: "99.00",
		}, nil)

		err := h.GetCourseTreeBySlug(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp []CourseTreeResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Len(t, resp, 2)
		assert.Equal(t, "http://video.com", *resp[1].VideoURL)
		assert.Equal(t, "Hello world", *resp[1].TextContent)
	})
}

func TestCurriculumHandler_GetUserLesson(t *testing.T) {
	e := echo.New()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	t.Run("Unauthorized", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		lessonID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/lessons/"+lessonID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(lessonID.String())

		err := h.GetUserLesson(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, he.Code)
	})

	t.Run("Lesson Not Found", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		lessonID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/lessons/"+lessonID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(lessonID.String())
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID: uuid.New().String(),
		})

		mockStore.On("GetLesson", mock.Anything, lessonID).Return(generated.GetLessonRow{}, sql.ErrNoRows)

		err := h.GetUserLesson(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, he.Code)
	})

	t.Run("Access Allowed - Admin", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		lessonID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/lessons/"+lessonID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(lessonID.String())
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:   uuid.New().String(),
			Role: "ADMIN",
		})

		mockStore.On("GetLesson", mock.Anything, lessonID).Return(generated.GetLessonRow{
			ID:          lessonID,
			NodeType:    generated.NodeTypeLESSON,
			Title:       "Secret Lesson",
			TextContent: sql.NullString{String: "Top secret content", Valid: true},
			VideoUrl:    sql.NullString{String: "http://secret-video.com", Valid: true},
		}, nil)

		err := h.GetUserLesson(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp LessonResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, "Top secret content", *resp.TextContent)
		assert.Equal(t, "http://secret-video.com", *resp.VideoURL)
	})

	t.Run("Access Allowed - Free Course", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		lessonID := uuid.New()
		courseID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/lessons/"+lessonID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(lessonID.String())
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:   uuid.New().String(),
			Role: "USER",
		})

		mockStore.On("GetLesson", mock.Anything, lessonID).Return(generated.GetLessonRow{
			ID:          lessonID,
			NodeType:    generated.NodeTypeLESSON,
			Title:       "Free Lesson",
			TextContent: sql.NullString{String: "Free content", Valid: true},
		}, nil)

		// CheckUserAccessToNode returns false (not purchased)
		mockStore.On("CheckUserAccessToNode", mock.Anything, mock.Anything).Return(false, nil)

		// GetCourseTree to find parents
		mockStore.On("GetCourseTree", mock.Anything, lessonID).Return([]generated.GetCourseTreeRow{
			{
				ID:       courseID,
				NodeType: generated.NodeTypeCOURSE,
			},
		}, nil)

		// GetPaymentGateByNode returns ErrNoRows (free)
		mockStore.On("GetPaymentGateByNode", mock.Anything, courseID).Return(generated.PaymentGate{}, sql.ErrNoRows)

		err := h.GetUserLesson(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp LessonResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, "Free content", *resp.TextContent)
	})

	t.Run("Access Forbidden", func(t *testing.T) {
		mockStore := new(MockStore)
		h := NewCurriculumHandler(mockStore, nil, logger)

		lessonID := uuid.New()
		courseID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/lessons/"+lessonID.String(), nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(lessonID.String())
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:   uuid.New().String(),
			Role: "USER",
		})

		mockStore.On("GetLesson", mock.Anything, lessonID).Return(generated.GetLessonRow{
			ID:       lessonID,
			NodeType: generated.NodeTypeLESSON,
			Title:    "Paid Lesson",
		}, nil)

		mockStore.On("CheckUserAccessToNode", mock.Anything, mock.Anything).Return(false, nil)

		mockStore.On("GetCourseTree", mock.Anything, lessonID).Return([]generated.GetCourseTreeRow{
			{
				ID:       courseID,
				NodeType: generated.NodeTypeCOURSE,
			},
		}, nil)

		mockStore.On("GetPaymentGateByNode", mock.Anything, courseID).Return(generated.PaymentGate{
			Price: "99.00",
		}, nil)

		err := h.GetUserLesson(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusForbidden, he.Code)
	})
}
