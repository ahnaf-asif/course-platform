package api

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInitTracer(t *testing.T) {
	ctx := context.Background()
	serviceName := "test-service"
	collectorAddr := "localhost:4317"

	tp, err := InitTracer(ctx, serviceName, collectorAddr)

	// Since we are not running a real collector, it might still succeed in creating the provider
	// but might fail if it tries to connect immediately.
	// The InitTracer function doesn't actually wait for connection.
	assert.NoError(t, err)
	assert.NotNil(t, tp)

	defer tp.Shutdown(ctx)
}
