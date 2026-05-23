package middleware

import (
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total number of HTTP requests.",
	}, []string{"method", "endpoint", "status"})

	httpRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "http_request_duration_seconds",
		Help:    "Duration of HTTP requests in seconds.",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "endpoint", "status"})
)

func PrometheusMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()

			// Process request
			err := next(c)

			status := c.Response().Status
			if err != nil {
				if echoErr, ok := err.(*echo.HTTPError); ok {
					status = echoErr.Code
				}
			}

			elapsed := time.Since(start).Seconds()

			// Use Path() to group by route pattern (e.g. /users/:id) rather than concrete URI
			path := c.Path()
			if path == "" {
				path = "unknown"
			}

			method := c.Request().Method
			statusStr := strconv.Itoa(status)

			httpRequestsTotal.WithLabelValues(method, path, statusStr).Inc()
			httpRequestDuration.WithLabelValues(method, path, statusStr).Observe(elapsed)

			return err
		}
	}
}
