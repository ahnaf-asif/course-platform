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

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/handlers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCurriculumIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	curriculumHandler := handlers.NewCurriculumHandler(store, nil, logger)
	courseHandler := handlers.NewCourseHandler(store, nil, logger)

	e := echo.New()

	var courseID string
	var subjectID string
	var chapterID string
	var lessonID string

	t.Run("Setup Course", func(t *testing.T) {
		reqBody := handlers.CreateCourseRequest{
			Title:       "Base Course",
			Description: "Base course for curriculum tests.",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := courseHandler.CreateCourse(c)
		require.NoError(t, err)
		var resp handlers.CourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		courseID = resp.ID
	})

	t.Run("Create Subject", func(t *testing.T) {
		reqBody := handlers.CreateSubjectRequest{
			ParentID:      courseID,
			Title:         "Test Subject",
			SequenceOrder: 1,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/subjects", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := curriculumHandler.CreateSubject(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var resp handlers.SubjectResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, reqBody.Title, resp.Title)
		assert.Equal(t, courseID, resp.ParentID)
		subjectID = resp.ID
	})

	t.Run("Update Subject", func(t *testing.T) {
		newTitle := "Updated Subject"
		reqBody := handlers.UpdateSubjectRequest{
			Title: &newTitle,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/subjects/"+subjectID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(subjectID)

		err := curriculumHandler.UpdateSubject(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp handlers.SubjectResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, newTitle, resp.Title)
	})

	t.Run("Update Subject - Not Found", func(t *testing.T) {
		fakeID := uuid.New().String()
		newTitle := "Doesn't Matter"
		reqBody := handlers.UpdateSubjectRequest{Title: &newTitle}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/subjects/"+fakeID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := curriculumHandler.UpdateSubject(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Update Subject - Validation Error", func(t *testing.T) {
		invalidTitle := "Sh"
		reqBody := handlers.UpdateSubjectRequest{Title: &invalidTitle}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/subjects/"+subjectID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(subjectID)

		err := curriculumHandler.UpdateSubject(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	})

	t.Run("Create Subject - Validation Error", func(t *testing.T) {
		reqBody := handlers.CreateSubjectRequest{
			ParentID: courseID,
			Title:    "Sh",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/subjects", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := curriculumHandler.CreateSubject(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	})

	t.Run("Create Chapter", func(t *testing.T) {
		reqBody := handlers.CreateChapterRequest{
			ParentID:      subjectID,
			Title:         "Test Chapter",
			SequenceOrder: 1,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/chapters", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := curriculumHandler.CreateChapter(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var resp handlers.ChapterResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, reqBody.Title, resp.Title)
		assert.Equal(t, subjectID, resp.ParentID)
		chapterID = resp.ID
	})

	t.Run("Update Chapter", func(t *testing.T) {
		newTitle := "Updated Chapter"
		reqBody := handlers.UpdateChapterRequest{
			Title: &newTitle,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/chapters/"+chapterID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(chapterID)

		err := curriculumHandler.UpdateChapter(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("Create Lesson", func(t *testing.T) {
		reqBody := handlers.CreateLessonRequest{
			ParentID:      chapterID,
			Title:         "Test Lesson",
			TextContent:   ptr("This is the lesson content."),
			VideoURL:      ptr("https://example.com/video"),
			SequenceOrder: 1,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/lessons", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := curriculumHandler.CreateLesson(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var resp handlers.LessonResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, reqBody.Title, resp.Title)
		assert.Equal(t, chapterID, resp.ParentID)
		assert.Equal(t, *reqBody.TextContent, *resp.TextContent)
		assert.Equal(t, *reqBody.VideoURL, *resp.VideoURL)
		lessonID = resp.ID
	})

	t.Run("Update Lesson", func(t *testing.T) {
		newTitle := "Updated Lesson"
		reqBody := handlers.UpdateLessonRequest{
			Title: &newTitle,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/lessons/"+lessonID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(lessonID)

		err := curriculumHandler.UpdateLesson(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("Update Lesson - Not Found", func(t *testing.T) {
		fakeID := uuid.New().String()
		newTitle := "Doesn't Matter"
		reqBody := handlers.UpdateLessonRequest{Title: &newTitle}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/lessons/"+fakeID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := curriculumHandler.UpdateLesson(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Delete Lesson - Invalid UUID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/lessons/not-a-uuid", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues("not-a-uuid")

		err := curriculumHandler.DeleteLesson(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusBadRequest, err.(*echo.HTTPError).Code)
	})

	t.Run("Delete Lesson", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/lessons/"+lessonID, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(lessonID)

		err := curriculumHandler.DeleteLesson(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, rec.Code)
	})

	t.Run("Update Chapter - Not Found", func(t *testing.T) {
		fakeID := uuid.New().String()
		newTitle := "Doesn't Matter"
		reqBody := handlers.UpdateChapterRequest{Title: &newTitle}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/chapters/"+fakeID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := curriculumHandler.UpdateChapter(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Delete Chapter - Not Found", func(t *testing.T) {
		fakeID := uuid.New().String()
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/chapters/"+fakeID, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := curriculumHandler.DeleteChapter(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Get Course Tree - Not Found", func(t *testing.T) {
		fakeID := uuid.New().String()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/courses/"+fakeID+"/tree", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := curriculumHandler.GetCourseTree(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Get Course Tree - with Lesson", func(t *testing.T) {
		// Create a new lesson since the previous one was deleted
		reqBody := handlers.CreateLessonRequest{
			ParentID:      chapterID,
			Title:         "Lesson for Tree",
			SequenceOrder: 1,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/lessons", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		_ = curriculumHandler.CreateLesson(c)

		req = httptest.NewRequest(http.MethodGet, "/api/v1/courses/"+courseID+"/tree", nil)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(courseID)

		err := curriculumHandler.GetCourseTree(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp []handlers.CourseTreeResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)

		assert.Len(t, resp, 4) // Course, Subject, Chapter, Lesson
		assert.Equal(t, "LESSON", resp[3].NodeType)
	})

	t.Run("Delete Subject - Invalid UUID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/subjects/not-a-uuid", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues("not-a-uuid")

		err := curriculumHandler.DeleteSubject(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusBadRequest, err.(*echo.HTTPError).Code)
	})

	t.Run("Delete Chapter - Invalid UUID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/chapters/not-a-uuid", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues("not-a-uuid")

		err := curriculumHandler.DeleteChapter(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusBadRequest, err.(*echo.HTTPError).Code)
	})

	t.Run("Delete Subject & Chapter", func(t *testing.T) {
		// Deleting subject should cascade to chapter in DB (ON DELETE CASCADE)
		// But our handlers delete nodes individually.
		// Actually, nodes table has ON DELETE CASCADE for parent_id.
		// So deleting the subject node will delete the chapter node.

		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/subjects/"+subjectID, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(subjectID)

		err := curriculumHandler.DeleteSubject(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, rec.Code)

		// Verify chapter is also gone because of cascade on nodes table
		req = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/chapters/"+chapterID, nil)
		rec = httptest.NewRecorder()
		c = e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(chapterID)

		err = curriculumHandler.DeleteChapter(c)
		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusNotFound, httpErr.Code)
	})
}

func ptr[T any](v T) *T {
	return &v
}
