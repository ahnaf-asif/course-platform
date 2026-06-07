package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	MinioEndpoint        string
	MinioAccessKey       string
	MinioSecretKey       string
	MinioUseSSL          bool
	MinioBucketRaw       string
	MinioBucketProcessed string
	MinioBucketPublic    string
	APIKey               string
	PublicBaseURL        string
	StreamSecret         string
	AllowedOrigins       string
	AppEnv               string
	RedisAddress         string
	// Transcoding Defaults
	DefaultVideoBitrate  string
	DefaultVideoCodec    string
	DefaultHlsTime       string
	DefaultHlsSegmentLen string
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	return &Config{
		Port:                 getEnv("PORT", "8081"),
		MinioEndpoint:        getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey:       getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey:       getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioUseSSL:          getEnv("MINIO_USE_SSL", "false") == "true",
		MinioBucketRaw:       getEnv("MINIO_BUCKET_RAW", "pre-processed"),
		MinioBucketProcessed: getEnv("MINIO_BUCKET_PROCESSED", "processed"),
		MinioBucketPublic:    getEnv("MINIO_BUCKET_PUBLIC", "public"),
		APIKey:               getEnv("API_KEY", "secret-api-key"),
		PublicBaseURL:        getEnv("PUBLIC_BASE_URL", "http://localhost:8081"),
		StreamSecret:         getEnv("STREAM_SECRET", "super-secret-stream-key"),
		AllowedOrigins:       getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"),
		AppEnv:               getEnv("APP_ENV", "development"),
		RedisAddress:         getEnv("REDIS_ADDRESS", "localhost:6379"),
		DefaultVideoBitrate:  getEnv("DEFAULT_VIDEO_BITRATE", "2M"),
		DefaultVideoCodec:    getEnv("DEFAULT_VIDEO_CODEC", "libx264"),
		DefaultHlsTime:       getEnv("DEFAULT_HLS_TIME", "10"),
		DefaultHlsSegmentLen: getEnv("DEFAULT_HLS_SEGMENT_LEN", "segment_%d.ts"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
