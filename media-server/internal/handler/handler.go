package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/shafin/course-platform/media-server/internal/service"
)

type Handler struct {
	minioService     service.IMinioService
	transcodeService service.ITranscodeService
	taskProcessor    service.ITaskProcessor
	cfg              *config.Config
}

func NewHandler(minioService service.IMinioService, transcodeService service.ITranscodeService, taskProcessor service.ITaskProcessor, cfg *config.Config) *Handler {
	return &Handler{
		minioService:     minioService,
		transcodeService: transcodeService,
		taskProcessor:    taskProcessor,
		cfg:              cfg,
	}
}

// GetUploadURL godoc
// @Summary Get pre-signed upload URL
// @Description Generates a pre-signed URL for direct upload. Specify visibility=public for public access.
// @Tags Management
// @Accept json
// @Produce json
// @Param file_name query string true "Name of the file"
// @Param visibility query string false "public or private (default: private)"
// @Security ApiKeyAuth
// @Success 200 {object} map[string]string
// @Router /upload-url [get]
func (h *Handler) GetUploadURL(c echo.Context) error {
	fileName := c.QueryParam("file_name")
	visibility := c.QueryParam("visibility")
	if fileName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "file_name required"})
	}

	bucket := h.cfg.MinioBucketRaw
	if visibility == "public" {
		bucket = h.cfg.MinioBucketPublic
	}

	uniqueID := uuid.New().String()
	uniqueName := fmt.Sprintf("%s_%s", uniqueID, fileName)

	uploadURL, err := h.minioService.GetPresignedPutURL(c.Request().Context(), bucket, uniqueName, 15*time.Minute)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to generate URL", "error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"upload_url":  uploadURL,
		"file_name":   uniqueName,
		"original_id": uniqueID,
		"visibility":  visibility,
	})
}

// UploadFile godoc
// @Summary Upload file directly
// @Description Uploads a file. Specify visibility=public for direct public access.
// @Tags Management
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "The file to upload"
// @Param visibility query string false "public or private (default: private)"
// @Security ApiKeyAuth
// @Success 200 {object} map[string]string
// @Router /upload [post]
func (h *Handler) UploadFile(c echo.Context) error {
	file, err := c.FormFile("file")
	visibility := c.QueryParam("visibility")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "file field required"})
	}

	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	bucket := h.cfg.MinioBucketRaw
	if visibility == "public" {
		bucket = h.cfg.MinioBucketPublic
	}

	uniqueName := fmt.Sprintf("%s_%s", uuid.New().String(), file.Filename)

	err = h.minioService.UploadFile(c.Request().Context(), bucket, uniqueName, src, file.Size, file.Header.Get("Content-Type"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to upload", "error": err.Error()})
	}

	// 2. Trigger HLS transcoding ONLY IF it's private and a video
	var taskID string
	if visibility != "public" {
		ext := filepath.Ext(file.Filename)
		if ext == ".mp4" || ext == ".mov" || ext == ".avi" {
			tempPath := filepath.Join(os.TempDir(), uniqueName)
			dst, err := os.Create(tempPath)
			if err == nil {
				if _, err := src.Seek(0, io.SeekStart); err == nil {
					if _, err := io.Copy(dst, src); err == nil {
						dst.Close()
						taskID, _ = h.taskProcessor.EnqueueTranscode(uniqueName, tempPath, nil)
					} else {
						dst.Close()
					}
				} else {
					dst.Close()
				}
			}
		}
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message":    "File uploaded successfully",
		"file_name":  uniqueName,
		"task_id":    taskID,
		"public_url": fmt.Sprintf("%s/api/v1/p/%s", h.cfg.PublicBaseURL, uniqueName),
	})
}

// GetPublicFile godoc
// @Summary Direct public file access
// @Description Serves a file directly from the public bucket without authentication
// @Tags Public
// @Param file_name path string true "Name of the file"
// @Success 200
// @Failure 404 {object} map[string]string
// @Router /p/{file_name} [get]
func (h *Handler) GetPublicFile(c echo.Context) error {
	fileName := c.Param("file_name")
	reader, size, contentType, err := h.minioService.GetObject(c.Request().Context(), h.cfg.MinioBucketPublic, fileName)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "File not found"})
	}
	defer reader.Close()

	c.Response().Header().Set(echo.HeaderContentType, contentType)
	c.Response().Header().Set(echo.HeaderContentLength, fmt.Sprintf("%d", size))
	c.Response().WriteHeader(http.StatusOK)
	_, err = io.Copy(c.Response().Writer, reader)
	return err
}

type TranscodeRequest struct {
	FileName string                    `json:"file_name"`
	Options  *service.TranscodeOptions `json:"options"`
}

// TriggerTranscode godoc
// @Summary Trigger HLS transcoding manually
// @Description Manually trigger transcoding for a file already in Raw bucket with optional parameters
// @Tags Management
// @Accept json
// @Produce json
// @Param request body TranscodeRequest true "Transcoding request"
// @Security ApiKeyAuth
// @Success 202 {object} map[string]string
// @Router /transcode [post]
func (h *Handler) TriggerTranscode(c echo.Context) error {
	var req TranscodeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request body"})
	}

	if req.FileName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "file_name required"})
	}

	taskID, err := h.taskProcessor.EnqueueTranscode(req.FileName, "", req.Options)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to queue task"})
	}

	return c.JSON(http.StatusAccepted, map[string]string{
		"message": "Transcoding job accepted",
		"task_id": taskID,
	})
}

// GetTaskStatus godoc
// @Summary Get task status
// @Description Returns the current status of a background task
// @Tags Management
// @Param task_id path string true "ID of the task"
// @Security ApiKeyAuth
// @Success 200 {object} map[string]string
// @Router /tasks/{task_id} [get]
func (h *Handler) GetTaskStatus(c echo.Context) error {
	taskID := c.Param("task_id")
	if taskID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "task_id required"})
	}

	state, err := h.taskProcessor.GetTaskStatus(taskID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "Task not found"})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"task_id": taskID,
		"state":   state,
	})
}

// GetDownloadURL godoc
// @Summary Redirect to pre-signed download URL (from Raw bucket)
// @Description Redirects the client to a temporary pre-signed URL in Raw bucket (private access)
// @Tags Management
// @Param file_name path string true "Name of the file"
// @Security ApiKeyAuth
// @Success 307
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /files/{file_name} [get]
func (h *Handler) GetDownloadURL(c echo.Context) error {
	fileName := c.Param("file_name")
	if fileName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "file_name path parameter required"})
	}

	downloadURL, err := h.minioService.GetPresignedGetURL(c.Request().Context(), h.cfg.MinioBucketRaw, fileName, 1*time.Hour)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to generate URL", "error": err.Error()})
	}

	return c.Redirect(http.StatusTemporaryRedirect, downloadURL)
}

// ListFiles godoc
// @Summary List files in Raw bucket
// @Description Returns a list of all files in the raw bucket
// @Tags Management
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{}
// @Router /files [get]
func (h *Handler) ListFiles(c echo.Context) error {
	files := h.minioService.ListObjects(c.Request().Context(), h.cfg.MinioBucketRaw)
	return c.JSON(http.StatusOK, map[string]interface{}{"files": files})
}

// DeleteFile godoc
// @Summary Delete a file from Raw bucket
// @Description Permanently deletes a file from the raw bucket
// @Tags Management
// @Param file_name path string true "Name of the file"
// @Security ApiKeyAuth
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /files/{file_name} [delete]
func (h *Handler) DeleteFile(c echo.Context) error {
	fileName := c.Param("file_name")
	if fileName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "file_name required"})
	}

	err := h.minioService.DeleteObject(c.Request().Context(), h.cfg.MinioBucketRaw, fileName)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to delete", "error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "File deleted successfully"})
}

// HealthCheck godoc
// @Summary Service health check
// @Tags Public
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func (h *Handler) HealthCheck(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"status": "healthy"})
}

// Readme godoc
// @Summary Show project README
// @Description Serves the README.md file rendered as HTML
// @Tags Documentation
// @Produce html
// @Success 200 {string} string "HTML content"
// @Router /docs/readme [get]
func (h *Handler) Readme(c echo.Context) error {
	content, err := os.ReadFile("README.md")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to read README.md"})
	}

	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>README - Media Server</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }
        @media (max-width: 767px) {
            .markdown-body {
                padding: 15px;
            }
        }
        body {
            background-color: #0d1117;
        }
    </style>
</head>
<body class="markdown-body">
    <div id="content"></div>
    <script>
        document.getElementById('content').innerHTML = marked.parse(%q);
    </script>
</body>
</html>
`, string(content))

	return c.HTML(http.StatusOK, html)
}
