package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoadConfig(t *testing.T) {
	// Set some env variables
	os.Setenv("PORT", "9999")
	os.Setenv("MINIO_ENDPOINT", "minio.test:9000")
	os.Setenv("ALLOWED_ORIGINS", "http://test.com")

	defer os.Unsetenv("PORT")
	defer os.Unsetenv("MINIO_ENDPOINT")
	defer os.Unsetenv("ALLOWED_ORIGINS")

	cfg := LoadConfig()

	assert.Equal(t, "9999", cfg.Port)
	assert.Equal(t, "minio.test:9000", cfg.MinioEndpoint)
	assert.Equal(t, "http://test.com", cfg.AllowedOrigins)
	assert.Equal(t, "pre-processed", cfg.MinioBucketRaw) // default
}

func TestGetEnv(t *testing.T) {
	key := "TEST_ENV_VAR"
	defaultValue := "default"

	// Case 1: Var exists
	os.Setenv(key, "actual")
	val := getEnv(key, defaultValue)
	assert.Equal(t, "actual", val)
	os.Unsetenv(key)

	// Case 2: Var does not exist
	val = getEnv(key, defaultValue)
	assert.Equal(t, defaultValue, val)
}
