package service

import (
	"context"
	"encoding/json"
	"io"
	"testing"

	"github.com/hibiken/asynq"
	"github.com/shafin/course-platform/media-server/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockAsynqClient struct {
	mock.Mock
}

func (m *MockAsynqClient) Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	args := m.Called(task, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*asynq.TaskInfo), args.Error(1)
}

func (m *MockAsynqClient) Close() error {
	args := m.Called()
	return args.Error(0)
}

type MockAsynqServer struct {
	mock.Mock
}

func (m *MockAsynqServer) Start(handler asynq.Handler) error {
	args := m.Called(handler)
	return args.Error(0)
}

func (m *MockAsynqServer) Shutdown() {
	m.Called()
}

type MockTranscoderForWorker struct {
	mock.Mock
}

func (m *MockTranscoderForWorker) ProcessVideo(videoID string, inputPath string, opts *TranscodeOptions) {
	m.Called(videoID, inputPath, opts)
}
func (m *MockTranscoderForWorker) GetStreamObject(ctx context.Context, videoID, fileName string) (io.ReadCloser, int64, string, error) {
	return nil, 0, "", nil
}

func TestTaskProcessor(t *testing.T) {
	cfg := &config.Config{RedisAddress: "localhost:6379"}

	t.Run("NewTaskProcessor", func(t *testing.T) {
		mockTranscoder := new(MockTranscoderForWorker)
		tp := NewTaskProcessor(cfg, mockTranscoder)
		assert.NotNil(t, tp)
		assert.NotNil(t, tp.client)
		assert.NotNil(t, tp.server)
	})

	t.Run("EnqueueTranscode", func(t *testing.T) {
		mockClient := new(MockAsynqClient)
		mockServer := new(MockAsynqServer)
		mockTranscoder := new(MockTranscoderForWorker)
		tp := NewTaskProcessorWithClients(mockClient, mockServer, mockTranscoder)

		mockClient.On("Enqueue", mock.Anything, mock.Anything).Return(&asynq.TaskInfo{}, nil)

		err := tp.EnqueueTranscode("v1", "/tmp/in.mp4", nil)
		assert.NoError(t, err)
		mockClient.AssertExpectations(t)
	})

	t.Run("Start", func(t *testing.T) {
		mockClient := new(MockAsynqClient)
		mockServer := new(MockAsynqServer)
		mockTranscoder := new(MockTranscoderForWorker)
		tp := NewTaskProcessorWithClients(mockClient, mockServer, mockTranscoder)

		mockServer.On("Start", mock.Anything).Return(nil)

		err := tp.Start()
		assert.NoError(t, err)
		mockServer.AssertExpectations(t)
	})

	t.Run("Stop", func(t *testing.T) {
		mockClient := new(MockAsynqClient)
		mockServer := new(MockAsynqServer)
		mockTranscoder := new(MockTranscoderForWorker)
		tp := NewTaskProcessorWithClients(mockClient, mockServer, mockTranscoder)

		mockClient.On("Close").Return(nil)
		mockServer.On("Shutdown").Return()

		tp.Stop()
		mockClient.AssertExpectations(t)
		mockServer.AssertExpectations(t)
	})

	t.Run("HandleTranscodeTask", func(t *testing.T) {
		mockClient := new(MockAsynqClient)
		mockServer := new(MockAsynqServer)
		mockTranscoder := new(MockTranscoderForWorker)
		tp := NewTaskProcessorWithClients(mockClient, mockServer, mockTranscoder)

		payload, _ := json.Marshal(TranscodePayload{
			VideoID:   "v1",
			InputPath: "/tmp/in.mp4",
		})
		task := asynq.NewTask(TypeTranscode, payload)

		mockTranscoder.On("ProcessVideo", "v1", "/tmp/in.mp4", mock.Anything).Return()

		err := tp.HandleTranscodeTask(context.Background(), task)
		assert.NoError(t, err)
		mockTranscoder.AssertExpectations(t)
	})
}
