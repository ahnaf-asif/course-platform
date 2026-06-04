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

func TestCourseIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	// Passing nil for cache service as it's not used in current course CRUD handlers
	courseHandler := handlers.NewCourseHandler(store, nil, logger)

	e := echo.New()

	var courseID string

	t.Run("Create Course", func(t *testing.T) {
	        reqBody := handlers.CreateCourseRequest{
	                Title:       "Test Course",
	                Description: "This is a test course description with at least 10 chars.",
	                IsPublished: true,
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
	        assert.Equal(t, reqBody.Title, resp.Title)
	        assert.Equal(t, reqBody.Description, resp.Description)
	        assert.Equal(t, "COURSE", resp.NodeType)
	        assert.NotEmpty(t, resp.ID)

	        courseID = resp.ID
	})

	t.Run("List Courses", func(t *testing.T) {
	        req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/courses", nil)
	        rec := httptest.NewRecorder()
	        c := e.NewContext(req, rec)

	        err := courseHandler.ListCourses(c)
	        assert.NoError(t, err)
	        assert.Equal(t, http.StatusOK, rec.Code)

	        var resp []handlers.CourseResponse
	        json.Unmarshal(rec.Body.Bytes(), &resp)
	        assert.GreaterOrEqual(t, len(resp), 1)

	        found := false
	        for _, course := range resp {
	                if course.ID == courseID {
	                        found = true
	                        assert.Equal(t, "Test Course", course.Title)
	                        break
	                }
	        }
	        assert.True(t, found, "Created course should be in the list")
	})

	t.Run("Create Course with Thumbnail", func(t *testing.T) {
		thumb := "https://example.com/image.png"
		reqBody := handlers.CreateCourseRequest{
			Title:        "Course with Thumb",
			Description:  "Description for course with thumbnail.",
			ThumbnailURL: &thumb,
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
		assert.Equal(t, thumb, *resp.ThumbnailURL)
	})

	t.Run("Update Course", func(t *testing.T) {
		newTitle := "Updated Test Course"
		reqBody := handlers.UpdateCourseRequest{
			Title: &newTitle,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/courses/"+courseID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID)

		err := courseHandler.UpdateCourse(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp handlers.CourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, newTitle, resp.Title)
	})

	t.Run("Update Course - Not Found", func(t *testing.T) {
		fakeID := "00000000-0000-0000-0000-000000000000"
		newTitle := "Doesn't Matter"
		reqBody := handlers.UpdateCourseRequest{
			Title: &newTitle,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/courses/"+fakeID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := courseHandler.UpdateCourse(c)
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusNotFound, httpErr.Code)
	})

	t.Run("Update Course - Multiple Fields", func(t *testing.T) {
		newTitle := "Brand New Title"
		newDesc := "Brand new description that is long enough."
		reqBody := handlers.UpdateCourseRequest{
			Title:       &newTitle,
			Description: &newDesc,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/courses/"+courseID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID)

		err := courseHandler.UpdateCourse(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp handlers.CourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, newTitle, resp.Title)
		assert.Equal(t, newDesc, resp.Description)
	})

	t.Run("Update Course - Validation Error", func(t *testing.T) {
		invalidTitle := "Sh"
		reqBody := handlers.UpdateCourseRequest{
			Title: &invalidTitle,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/courses/"+courseID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID)

		err := courseHandler.UpdateCourse(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	})

	t.Run("Delete Course - Invalid UUID", func(t *testing.T) {
		invalidID := "not-a-uuid"
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/courses/"+invalidID, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(invalidID)

		err := courseHandler.DeleteCourse(c)
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)
	})

	t.Run("Delete Course", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/courses/"+courseID, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID)

		err := courseHandler.DeleteCourse(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, rec.Code)

		// Verify deletion
		req = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/courses/"+courseID, nil)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID)

		err = courseHandler.DeleteCourse(c)
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusNotFound, httpErr.Code)
	})

	t.Run("Validation Error", func(t *testing.T) {
		reqBody := handlers.CreateCourseRequest{
			Title: "Sh", // Too short
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := courseHandler.CreateCourse(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	})
}
