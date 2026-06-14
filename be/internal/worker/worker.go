package worker

import (
	"log"

	"github.com/hibiken/asynq"
	"github.com/shafins-course/backend/internal/services"
)

type Worker struct {
	server     *asynq.Server
	mux        *asynq.ServeMux
	quizWorker *QuizWorker
}

func NewWorker(redisAddr string, quizWorker *QuizWorker) *Worker {
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Concurrency: 5,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	mux := asynq.NewServeMux()

	return &Worker{
		server:     srv,
		mux:        mux,
		quizWorker: quizWorker,
	}
}

func (w *Worker) Start() error {
	// Register handlers
	w.mux.HandleFunc(services.TypeQuizBulkUpload, w.quizWorker.ProcessQuizBulkUpload)

	log.Println("Background worker started")
	if err := w.server.Run(w.mux); err != nil {
		return err
	}
	return nil
}

func (w *Worker) Shutdown() {
	w.server.Shutdown()
}
