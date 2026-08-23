package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

func TestDevEmailPreviewHandler_RenderGallery(t *testing.T) {
	e := echo.New()
	handler := NewDevEmailPreviewHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dev/emails", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.RenderGallery(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), "EduVerse — Email Template Studio")
}

func TestDevEmailPreviewHandler_RenderPreview(t *testing.T) {
	e := echo.New()
	handler := NewDevEmailPreviewHandler()

	templates := []struct {
		name     string
		query    string
		expected string
	}{
		{"Welcome", "/api/v1/dev/emails/preview?template=welcome", "স্বাগতম"},
		{"Reset Password", "/api/v1/dev/emails/preview?template=reset_password", "পাসওয়ার্ড রিসেট"},
		{"Order Confirmation", "/api/v1/dev/emails/preview?template=order_confirmation", "কোর্স এনরোলমেন্ট নিশ্চিত"},
		{"Payout Approved", "/api/v1/dev/emails/preview?template=payout_approved", "অ্যাফিলিয়েট পে-আউট আপডেট"},
		{"Payout Rejected", "/api/v1/dev/emails/preview?template=payout_rejected", "প্রত্যাখ্যাত"},
	}

	for _, tt := range templates {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.query, nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler.RenderPreview(c)
			assert.NoError(t, err)
			assert.Equal(t, http.StatusOK, rec.Code)
			assert.Contains(t, rec.Body.String(), tt.expected)
			assert.Contains(t, rec.Body.String(), "Edu")
		})
	}

	t.Run("Unknown template returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/dev/emails/preview?template=invalid_temp", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := handler.RenderPreview(c)
		assert.Error(t, err)
		echoErr, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, echoErr.Code)
	})
}
