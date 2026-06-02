package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
)

func TestPrometheusMiddleware(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/test")

	handler := func(_ echo.Context) error {
		return c.String(http.StatusOK, "OK")
	}

	// Wrap handler with middleware
	mw := PrometheusMiddleware()
	h := mw(handler)

	// Execute
	err := h(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	// Check if metrics were incremented
	// Note: We can use testutil.ToFloat64 to check counter values
	count := testutil.ToFloat64(httpRequestsTotal.WithLabelValues(http.MethodGet, "/test", "200"))
	assert.Equal(t, float64(1), count)
}

func TestPrometheusMiddleware_Error(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/error", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/error")

	handler := func(_ echo.Context) error {
		return echo.NewHTTPError(http.StatusBadRequest, "bad request")
	}

	// Wrap handler with middleware
	mw := PrometheusMiddleware()
	h := mw(handler)

	// Execute
	err := h(c)
	assert.Error(t, err)

	// Check if metrics were incremented with 400 status
	count := testutil.ToFloat64(httpRequestsTotal.WithLabelValues(http.MethodPost, "/error", "400"))
	assert.Equal(t, float64(1), count)
}
