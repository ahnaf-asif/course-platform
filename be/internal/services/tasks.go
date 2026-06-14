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
	client *asynq.Client
}

func NewTaskService(redisAddr string) *TaskService {
	client := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
	return &TaskService{client: client}
}

func (s *TaskService) Close() error {
	return s.client.Close()
}

func (s *TaskService) EnqueueQuizBulkUpload(quizID, filePath, bucket string) error {
	payload, err := json.Marshal(QuizBulkUploadPayload{
		QuizID:   quizID,
		FilePath: filePath,
		Bucket:   bucket,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}

	task := asynq.NewTask(TypeQuizBulkUpload, payload)
	_, err = s.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("failed to enqueue task: %v", err)
	}

	return nil
}
