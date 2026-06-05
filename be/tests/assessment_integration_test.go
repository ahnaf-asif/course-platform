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

func TestAssessmentIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	quizHandler := handlers.NewQuizHandler(store, nil, logger)

	e := echo.New()

	var quizID string

	t.Run("Create Quiz", func(t *testing.T) {
		reqBody := handlers.CreateQuizRequest{
			Title:        "Go Fundamentals Quiz",
			PassingScore: 70,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/quizzes", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := quizHandler.CreateQuiz(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var resp handlers.QuizResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, reqBody.Title, resp.Title)
		assert.Equal(t, reqBody.PassingScore, resp.PassingScore)
		quizID = resp.ID
	})

	t.Run("Update Quiz", func(t *testing.T) {
		newTitle := "Advanced Go Quiz"
		reqBody := handlers.UpdateQuizRequest{Title: &newTitle}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/quizzes/"+quizID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(quizID)

		err := quizHandler.UpdateQuiz(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp handlers.QuizResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, newTitle, resp.Title)
	})

	t.Run("Add Bulk Questions", func(t *testing.T) {
		reqBody := handlers.BulkQuestionsRequest{
			Questions: []handlers.QuestionRequest{
				{
					Content:       "What is a goroutine?",
					QuestionType:  "SINGLE",
					SequenceOrder: 1,
					Answers: []handlers.AnswerOption{
						{Content: "A lightweight thread", IsCorrect: true},
						{Content: "A heavy process", IsCorrect: false},
						{Content: "A type of variable", IsCorrect: false},
					},
				},
				{
					Content:       "Which keywords are used for control flow in Go?",
					QuestionType:  "MULTIPLE",
					SequenceOrder: 2,
					Answers: []handlers.AnswerOption{
						{Content: "if", IsCorrect: true},
						{Content: "switch", IsCorrect: true},
						{Content: "when", IsCorrect: false},
						{Content: "for", IsCorrect: true},
					},
				},
			},
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/quizzes/"+quizID+"/questions", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(quizID)

		err := quizHandler.AddBulkQuestions(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)
	})

	t.Run("List Questions", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/quizzes/"+quizID+"/questions", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(quizID)

		err := quizHandler.ListQuestions(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp []handlers.QuestionResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Len(t, resp, 2)
		assert.Equal(t, "What is a goroutine?", resp[0].Content)
		assert.Len(t, resp[0].Answers, 3)
		assert.Equal(t, "Which keywords are used for control flow in Go?", resp[1].Content)
		assert.Len(t, resp[1].Answers, 4)
	})

	t.Run("Add Bulk Questions - Not Found", func(t *testing.T) {
		fakeID := uuid.New().String()
		reqBody := handlers.BulkQuestionsRequest{
			Questions: []handlers.QuestionRequest{
				{Content: "Q", QuestionType: "SINGLE", SequenceOrder: 1, Answers: []handlers.AnswerOption{{Content: "A", IsCorrect: true}, {Content: "B", IsCorrect: false}}},
			},
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/quizzes/"+fakeID+"/questions", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := quizHandler.AddBulkQuestions(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Delete Quiz - Invalid UUID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/quizzes/not-a-uuid", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues("not-a-uuid")

		err := quizHandler.DeleteQuiz(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusBadRequest, err.(*echo.HTTPError).Code)
	})

	t.Run("Add Bulk Questions - Validation Error", func(t *testing.T) {
		reqBody := handlers.BulkQuestionsRequest{
			Questions: []handlers.QuestionRequest{
				{Content: "", QuestionType: "INVALID", SequenceOrder: -1, Answers: []handlers.AnswerOption{}},
			},
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/quizzes/"+quizID+"/questions", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(quizID)

		err := quizHandler.AddBulkQuestions(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	})

	t.Run("List Questions - Invalid UUID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/quizzes/not-a-uuid/questions", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues("not-a-uuid")

		err := quizHandler.ListQuestions(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusBadRequest, err.(*echo.HTTPError).Code)
	})

	t.Run("Delete Quiz", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/quizzes/"+quizID, nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(quizID)

		err := quizHandler.DeleteQuiz(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, rec.Code)
	})

	t.Run("Create Quiz - Validation Error", func(t *testing.T) {
		reqBody := handlers.CreateQuizRequest{
			Title: "Go", // Too short
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/quizzes", bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := quizHandler.CreateQuiz(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	})

	t.Run("Update Quiz - Not Found", func(t *testing.T) {
		fakeID := uuid.New().String()
		newTitle := "Doesn't Matter"
		reqBody := handlers.UpdateQuizRequest{Title: &newTitle}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/quizzes/"+fakeID, bytes.NewBuffer(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(fakeID)

		err := quizHandler.UpdateQuiz(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Node-Quiz Association", func(t *testing.T) {
		// Setup: Create a quiz
		qReqBody := handlers.CreateQuizRequest{
			Title:        "Association Quiz",
			PassingScore: 80,
		}
		qBody, _ := json.Marshal(qReqBody)
		qReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/quizzes", bytes.NewBuffer(qBody))
		qReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		qRec := httptest.NewRecorder()
		qCtx := e.NewContext(qReq, qRec)
		_ = quizHandler.CreateQuiz(qCtx)
		var qResp handlers.QuizResponse
		json.Unmarshal(qRec.Body.Bytes(), &qResp)
		assocQuizID := qResp.ID

		// Setup: Create a node (Course)
		courseHandler := handlers.NewCourseHandler(store, nil, logger)
		cReqBody := handlers.CreateCourseRequest{
			Title:       "Quiz Node Test Course",
			Description: "Course to test quiz association.",
		}
		cBody, _ := json.Marshal(cReqBody)
		cReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/courses", bytes.NewBuffer(cBody))
		cReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		cRec := httptest.NewRecorder()
		cCtx := e.NewContext(cReq, cRec)
		_ = courseHandler.CreateCourse(cCtx)
		var cResp handlers.CourseResponse
		json.Unmarshal(cRec.Body.Bytes(), &cResp)
		nodeID := cResp.ID

		// 1. Attach Quiz
		aReqBody := handlers.AttachQuizRequest{QuizID: assocQuizID}
		aBody, _ := json.Marshal(aReqBody)
		aReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/nodes/"+nodeID+"/quizzes", bytes.NewBuffer(aBody))
		aReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		aRec := httptest.NewRecorder()
		aCtx := e.NewContext(aReq, aRec)
		aCtx.SetParamNames("id")
		aCtx.SetParamValues(nodeID)

		err := quizHandler.AttachQuizToNode(aCtx)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, aRec.Code)

		// 2. Get Quizzes by Node
		gReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/nodes/"+nodeID+"/quizzes", nil)
		gRec := httptest.NewRecorder()
		gCtx := e.NewContext(gReq, gRec)
		gCtx.SetParamNames("id")
		gCtx.SetParamValues(nodeID)

		err = quizHandler.GetQuizzesByNode(gCtx)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, gRec.Code)

		var gResp []handlers.QuizResponse
		json.Unmarshal(gRec.Body.Bytes(), &gResp)
		assert.Len(t, gResp, 1)
		if len(gResp) > 0 {
			assert.Equal(t, assocQuizID, gResp[0].ID)
		}
	})

	t.Run("Attach Quiz - Quiz Not Found", func(t *testing.T) {
		fakeQuizID := uuid.New().String()
		nodeID := uuid.New().String()
		aReqBody := handlers.AttachQuizRequest{QuizID: fakeQuizID}
		aBody, _ := json.Marshal(aReqBody)
		aReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/nodes/"+nodeID+"/quizzes", bytes.NewBuffer(aBody))
		aReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		aRec := httptest.NewRecorder()
		aCtx := e.NewContext(aReq, aRec)
		aCtx.SetParamNames("id")
		aCtx.SetParamValues(nodeID)

		err := quizHandler.AttachQuizToNode(aCtx)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Attach Quiz - Node Not Found", func(t *testing.T) {
		// Create a fresh quiz for this test
		qReqBody := handlers.CreateQuizRequest{Title: "Valid Quiz", PassingScore: 50}
		qBody, _ := json.Marshal(qReqBody)
		qReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/quizzes", bytes.NewBuffer(qBody))
		qReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		qRec := httptest.NewRecorder()
		_ = quizHandler.CreateQuiz(e.NewContext(qReq, qRec))
		require.Equal(t, http.StatusCreated, qRec.Code)
		var qResp handlers.QuizResponse
		json.Unmarshal(qRec.Body.Bytes(), &qResp)

		nodeID := uuid.New().String()
		aReqBody := handlers.AttachQuizRequest{QuizID: qResp.ID}
		aBody, _ := json.Marshal(aReqBody)
		aReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/nodes/"+nodeID+"/quizzes", bytes.NewBuffer(aBody))
		aReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		aRec := httptest.NewRecorder()
		aCtx := e.NewContext(aReq, aRec)
		aCtx.SetParamNames("id")
		aCtx.SetParamValues(nodeID)

		err := quizHandler.AttachQuizToNode(aCtx)
		if err != nil {
			if httpErr, ok := err.(*echo.HTTPError); ok {
				assert.Equal(t, http.StatusNotFound, httpErr.Code)
			} else {
				t.Errorf("expected echo.HTTPError, got %T", err)
			}
		} else {
			assert.Equal(t, http.StatusNotFound, aRec.Code)
		}
	})

	t.Run("Get Quizzes By Node - Node Not Found", func(t *testing.T) {
		nodeID := uuid.New().String()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/nodes/"+nodeID+"/quizzes", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(nodeID)

		err := quizHandler.GetQuizzesByNode(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusNotFound, err.(*echo.HTTPError).Code)
	})

	t.Run("Get Quizzes By Node - Invalid UUID", func(t *testing.T) {
		nodeID := "not-a-uuid"
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/nodes/"+nodeID+"/quizzes", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(nodeID)

		err := quizHandler.GetQuizzesByNode(c)
		require.Error(t, err)
		assert.Equal(t, http.StatusBadRequest, err.(*echo.HTTPError).Code)
	})
}
