package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/hibiken/asynq"
	"github.com/shafin/course-platform/media-server/internal/config"
)

const (
	TypeTranscode = "video:transcode"
)

type AsynqClient interface {
	Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error)
	Close() error
}

type AsynqServer interface {
	Start(handler asynq.Handler) error
	Shutdown()
}

type RealAsynqClient struct {
	*asynq.Client
}

type RealAsynqServer struct {
	*asynq.Server
}

type TranscodePayload struct {
	VideoID   string            `json:"video_id"`
	InputPath string            `json:"input_path"` // If empty, download from Minio
	Options   *TranscodeOptions `json:"options,omitempty"`
}

type ITaskProcessor interface {
	EnqueueTranscode(videoID string, inputPath string, opts *TranscodeOptions) (string, error)
	GetTaskStatus(taskID string) (string, error)
	Start() error
	Stop()
}

type TaskProcessor struct {
	client     AsynqClient
	inspector  *asynq.Inspector
	server     AsynqServer
	transcoder ITranscodeService
}

func NewTaskProcessor(cfg *config.Config, transcoder ITranscodeService) *TaskProcessor {
	redisOpt := asynq.RedisClientOpt{Addr: cfg.RedisAddress}

	client := asynq.NewClient(redisOpt)
	inspector := asynq.NewInspector(redisOpt)
	server := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: 2, // Process max 2 videos at a time to protect CPU
		Queues: map[string]int{
			"critical": 6,
			"default":  3,
			"low":      1,
		},
	})

	return &TaskProcessor{
		client:     &RealAsynqClient{Client: client},
		inspector:  inspector,
		server:     &RealAsynqServer{Server: server},
		transcoder: transcoder,
	}
}

func (p *TaskProcessor) EnqueueTranscode(videoID string, inputPath string, opts *TranscodeOptions) (string, error) {
	payload, err := json.Marshal(TranscodePayload{
		VideoID:   videoID,
		InputPath: inputPath,
		Options:   opts,
	})
	if err != nil {
		return "", err
	}

	task := asynq.NewTask(TypeTranscode, payload)
	info, err := p.client.Enqueue(task)
	if err != nil {
		return "", err
	}
	return info.ID, nil
}

func (p *TaskProcessor) GetTaskStatus(taskID string) (string, error) {
	info, err := p.inspector.GetTaskInfo("default", taskID)
	if err != nil {
		return "", err
	}
	return info.State.String(), nil
}

func (p *TaskProcessor) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeTranscode, p.HandleTranscodeTask)

	return p.server.Start(mux)
}

func (p *TaskProcessor) Stop() {
	if p.client != nil {
		p.client.Close()
	}
	if p.inspector != nil {
		p.inspector.Close()
	}
	if p.server != nil {
		p.server.Shutdown()
	}
}

func (p *TaskProcessor) HandleTranscodeTask(ctx context.Context, t *asynq.Task) error {
	var payload TranscodePayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	log.Printf(" [*] Processing transcode task for video: %s", payload.VideoID)

	p.transcoder.ProcessVideo(payload.VideoID, payload.InputPath, payload.Options)

	return nil
}
