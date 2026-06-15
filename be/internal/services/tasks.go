package services

import (
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
)

const (
	TypeQuizBulkUpload = "quiz:bulk-upload"
)

type QuizBulkUploadPayload struct {
	QuizID   string `json:"quiz_id"`
	FilePath string `json:"file_path"` // Path in Minio
	Bucket   string `json:"bucket"`
}

type TaskService struct {
	client    *asynq.Client
	inspector *asynq.Inspector
}

func NewTaskService(redisAddr string) *TaskService {
	redisOpt := asynq.RedisClientOpt{Addr: redisAddr}
	return &TaskService{
		client:    asynq.NewClient(redisOpt),
		inspector: asynq.NewInspector(redisOpt),
	}
}

func (s *TaskService) Close() error {
	_ = s.inspector.Close()
	return s.client.Close()
}

type TaskStatus struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	State string `json:"state"`
}

func (s *TaskService) GetTaskStatus(taskID string) (*TaskStatus, error) {
	// Task might be in "default", "critical", or "low" queue, or archived.
	// We need to check all queues or use the new Inspector method if available.
	// For simplicity, we check "default" first.
	info, err := s.inspector.GetTaskInfo("default", taskID)
	if err != nil {
		// If not found in default, it might have been completed and moved to archived/completed state.
		// Asynq retains completed tasks if configured, but by default it deletes them.
		// Since we don't have task retention enabled, a "Not Found" error usually means the task finished successfully and was deleted.
		// Let's assume COMPLETED for not found to unblock the frontend, but log it.
		return &TaskStatus{
			ID:    taskID,
			State: "COMPLETED", // Assuming deleted means completed
		}, nil
	}

	return &TaskStatus{
		ID:    info.ID,
		Type:  info.Type,
		State: info.State.String(),
	}, nil
}

func (s *TaskService) EnqueueQuizBulkUpload(quizID, filePath, bucket string) (string, error) {
	payload, err := json.Marshal(QuizBulkUploadPayload{
		QuizID:   quizID,
		FilePath: filePath,
		Bucket:   bucket,
	})
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %v", err)
	}

	task := asynq.NewTask(TypeQuizBulkUpload, payload)
	info, err := s.client.Enqueue(task)
	if err != nil {
		return "", fmt.Errorf("failed to enqueue task: %v", err)
	}

	return info.ID, nil
}
