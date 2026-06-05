package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/handlers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCourseSlugIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	courseHandler := handlers.NewCourseHandler(store, nil, logger)

	e := echo.New()

	var courseSlug string

	t.Run("Create Course with custom slug", func(t *testing.T) {
		slug := "custom-course-slug"
		reqBody := handlers.CreateCourseRequest{
			Title:       "Custom Slug Course",
			Slug:        &slug,
			Description: "This is a course with a custom defined slug for testing.",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := courseHandler.CreateCourse(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var resp handlers.CourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, slug, resp.Slug)
		courseSlug = resp.Slug
	})

	t.Run("Get Course by Slug", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/courses/s/"+courseSlug, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(courseSlug)

		err := courseHandler.GetCourseBySlug(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp handlers.CourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, courseSlug, resp.Slug)
		assert.Equal(t, "Custom Slug Course", resp.Title)
	})

	t.Run("Create Course with auto-generated slug", func(t *testing.T) {
		reqBody := handlers.CreateCourseRequest{
			Title:       "Auto Slug Course",
			Description: "This course should have an auto-generated slug based on title.",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := courseHandler.CreateCourse(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var resp handlers.CourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, "auto-slug-course", resp.Slug)
	})

	t.Run("Update Course Slug", func(t *testing.T) {
		// First get a course ID
		reqBody := handlers.CreateCourseRequest{
			Title:       "Slug to be updated",
			Description: "This course slug will be updated manually.",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		courseHandler.CreateCourse(c)
		var createResp handlers.CourseResponse
		json.Unmarshal(rec.Body.Bytes(), &createResp)

		newSlug := "updated-slug"
		updateBody := handlers.UpdateCourseRequest{
			Slug: &newSlug,
		}
		body, _ = json.Marshal(updateBody)
		req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/courses/"+createResp.ID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(createResp.ID)

		err := courseHandler.UpdateCourse(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp handlers.CourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, newSlug, resp.Slug)
	})

	t.Run("Slug Conflict", func(t *testing.T) {
		slug := "duplicate-slug"
		reqBody1 := handlers.CreateCourseRequest{
			Title:       "Course 1",
			Slug:        &slug,
			Description: "Description for course 1.",
		}
		body, _ := json.Marshal(reqBody1)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		courseHandler.CreateCourse(c)

		reqBody2 := handlers.CreateCourseRequest{
			Title:       "Course 2",
			Slug:        &slug,
			Description: "Description for course 2.",
		}
		body, _ = json.Marshal(reqBody2)
		req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)

		err := courseHandler.CreateCourse(c)
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusConflict, httpErr.Code)
	})
}
