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

func TestTagIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	tagHandler := handlers.NewTagHandler(store, nil, logger)

	e := echo.New()

	var tagID string

	t.Run("Create Tag", func(t *testing.T) {
		reqBody := handlers.CreateTagRequest{
			Name: "Go Programming",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/tags", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := tagHandler.CreateTag(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var resp handlers.TagResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, reqBody.Name, resp.Name)
		assert.Equal(t, "go-programming", resp.Slug)
		tagID = resp.ID
	})

	t.Run("List Tags", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/tags", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := tagHandler.ListTags(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp []handlers.TagResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.NotEmpty(t, resp)
	})

	t.Run("Update Tag", func(t *testing.T) {
		newName := "Golang"
		reqBody := handlers.UpdateTagRequest{Name: &newName}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/tags/"+tagID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(tagID)

		err := tagHandler.UpdateTag(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp handlers.TagResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, newName, resp.Name)
	})

	t.Run("Update Tag - Not Found", func(t *testing.T) {
		fakeID := uuid.New().String()
		newName := "Golang"
		reqBody := handlers.UpdateTagRequest{Name: &newName}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/tags/"+fakeID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := tagHandler.UpdateTag(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Attach Tag - Node Not Found", func(t *testing.T) {
		nodeID := uuid.New().String()
		aReqBody := handlers.AttachTagRequest{TagID: tagID}
		aBody, _ := json.Marshal(aReqBody)
		aReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/nodes/"+nodeID+"/tags", bytes.NewBuffer(aBody))
		aReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		aRec := httptest.NewRecorder()
		aCtx := e.NewContext(aReq, aRec)
		aCtx.SetParamNames("id")
		aCtx.SetParamValues(nodeID)

		err := tagHandler.AttachTagToNode(aCtx)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Node-Tag Association", func(t *testing.T) {
		// Setup: Create a node (Course)
		courseHandler := handlers.NewCourseHandler(store, nil, logger)
		cReqBody := handlers.CreateCourseRequest{
			Title:       "Tag Node Test Course",
			Description: "Course to test tag association.",
		}
		cBody, _ := json.Marshal(cReqBody)
		cReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(cBody))
		cReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		cRec := httptest.NewRecorder()
		_ = courseHandler.CreateCourse(e.NewContext(cReq, cRec))
		require.Equal(t, http.StatusCreated, cRec.Code)
		var cResp handlers.CourseResponse
		json.Unmarshal(cRec.Body.Bytes(), &cResp)
		nodeID := cResp.ID

		// 1. Attach Tag
		aReqBody := handlers.AttachTagRequest{TagID: tagID}
		aBody, _ := json.Marshal(aReqBody)
		aReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/nodes/"+nodeID+"/tags", bytes.NewBuffer(aBody))
		aReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		aRec := httptest.NewRecorder()
		aCtx := e.NewContext(aReq, aRec)
		aCtx.SetParamNames("id")
		aCtx.SetParamValues(nodeID)

		err := tagHandler.AttachTagToNode(aCtx)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, aRec.Code)

		// 2. List Tags by Node
		lReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/nodes/"+nodeID+"/tags", nil)
		lRec := httptest.NewRecorder()
		lCtx := e.NewContext(lReq, lRec)
		lCtx.SetParamNames("id")
		lCtx.SetParamValues(nodeID)

		err = tagHandler.ListTagsByNode(lCtx)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, lRec.Code)

		var lResp []handlers.TagResponse
		json.Unmarshal(lRec.Body.Bytes(), &lResp)
		assert.Len(t, lResp, 1)
		assert.Equal(t, tagID, lResp[0].ID)
	})

	t.Run("Delete Tag", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/tags/"+tagID, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(tagID)

		err := tagHandler.DeleteTag(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, rec.Code)
	})

	t.Run("Create Tag - Invalid Slug", func(t *testing.T) {
		reqBody := handlers.CreateTagRequest{
			Name: "Invalid Tag",
			Slug: "Invalid Slug Space",
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/tags", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := tagHandler.CreateTag(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	})
}
