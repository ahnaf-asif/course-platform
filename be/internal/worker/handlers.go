package worker

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/services"
)

type QuizWorker struct {
	store        db.Store
	minioService services.IMinioService
}

func NewQuizWorker(store db.Store, minioService services.IMinioService) *QuizWorker {
	return &QuizWorker{
		store:        store,
		minioService: minioService,
	}
}

func (w *QuizWorker) ProcessQuizBulkUpload(ctx context.Context, t *asynq.Task) error {
	var payload services.QuizBulkUploadPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %v", err)
	}

	quizID, err := uuid.Parse(payload.QuizID)
	if err != nil {
		return fmt.Errorf("invalid quiz id: %v", err)
	}

	// 1. Download CSV from Minio
	reader, _, _, err := w.minioService.GetObject(ctx, payload.Bucket, payload.FilePath)
	if err != nil {
		return fmt.Errorf("failed to get csv from minio: %v", err)
	}
	defer reader.Close()

	// 2. Parse CSV
	csvReader := csv.NewReader(reader)
	// Read header
	if _, err := csvReader.Read(); err != nil {
		return fmt.Errorf("failed to read csv header: %v", err)
	}

	// 3. Process Rows in a Transaction
	err = w.store.WithTx(ctx, func(q generated.Querier) error {
		sequenceOrder := int32(0)

		// Get current max sequence order for this quiz to append
		existingQuestions, err := q.ListQuestionsByQuiz(ctx, quizID)
		if err == nil {
			for _, q := range existingQuestions {
				if q.SequenceOrder >= sequenceOrder {
					sequenceOrder = q.SequenceOrder + 1
				}
			}
		}

		for {
			record, err := csvReader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				return fmt.Errorf("error reading csv row: %v", err)
			}

			// Format: question, type, explanation, correct_answers, incorrect_answers
			if len(record) < 5 {
				log.Printf("Skipping invalid row (insufficient columns): %v\n", record)
				continue
			}

			content := strings.TrimSpace(record[0])
			qTypeStr := strings.ToUpper(strings.TrimSpace(record[1]))
			explanation := strings.TrimSpace(record[2])
			correctStr := strings.TrimSpace(record[3])
			incorrectStr := strings.TrimSpace(record[4])

			if content == "" || (correctStr == "" && incorrectStr == "") {
				continue
			}

			qType := generated.QuestionTypeSINGLE
			if qTypeStr == "MULTIPLE" {
				qType = generated.QuestionTypeMULTIPLE
			}

			// Create Question
			question, err := q.CreateQuestion(ctx, generated.CreateQuestionParams{
				QuizID:        quizID,
				Content:       content,
				QuestionType:  qType,
				SequenceOrder: sequenceOrder,
				Explanation:   db.ToNullString(explanation),
			})
			if err != nil {
				return fmt.Errorf("failed to create question: %v", err)
			}

			// Parse and create correct answers
			correctAnswers := strings.Split(correctStr, "|")
			for _, ans := range correctAnswers {
				ans = strings.TrimSpace(ans)
				if ans == "" {
					continue
				}
				_, err = q.CreateAnswer(ctx, generated.CreateAnswerParams{
					QuestionID: question.ID,
					Content:    ans,
					IsCorrect:  true,
				})
				if err != nil {
					return fmt.Errorf("failed to create correct answer: %v", err)
				}
			}

			// Parse and create incorrect answers
			incorrectAnswers := strings.Split(incorrectStr, "|")
			for _, ans := range incorrectAnswers {
				ans = strings.TrimSpace(ans)
				if ans == "" {
					continue
				}
				_, err = q.CreateAnswer(ctx, generated.CreateAnswerParams{
					QuestionID: question.ID,
					Content:    ans,
					IsCorrect:  false,
				})
				if err != nil {
					return fmt.Errorf("failed to create incorrect answer: %v", err)
				}
			}

			sequenceOrder++
		}
		return nil
	})

	if err != nil {
		return err
	}

	// 4. Cleanup CSV from Minio
	_ = w.minioService.DeleteObject(ctx, payload.Bucket, payload.FilePath)

	log.Printf("Successfully processed bulk upload for quiz %s\n", payload.QuizID)
	return nil
}
