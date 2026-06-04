-- Quizzes
-- name: CreateQuiz :one
INSERT INTO quizzes (
    title,
    passing_score
) VALUES (
    $1, $2
)
RETURNING *;

-- name: GetQuizByID :one
SELECT * FROM quizzes
WHERE id = $1 LIMIT 1;

-- name: UpdateQuiz :one
UPDATE quizzes
SET
    title = COALESCE(sqlc.narg('title'), title),
    passing_score = COALESCE(sqlc.narg('passing_score'), passing_score)
WHERE id = $1
RETURNING *;

-- name: DeleteQuiz :exec
DELETE FROM quizzes
WHERE id = $1;

-- name: AttachQuizToNode :exec
INSERT INTO node_quiz (node_id, quiz_id)
VALUES ($1, $2)
ON CONFLICT (node_id, quiz_id) DO NOTHING;

-- name: GetQuizzesByNode :many
SELECT q.* FROM quizzes q
JOIN node_quiz nq ON q.id = nq.quiz_id
WHERE nq.node_id = $1;

-- Questions
-- name: CreateQuestion :one
INSERT INTO questions (
    quiz_id,
    content,
    question_type,
    sequence_order
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: ListQuestionsByQuiz :many
SELECT * FROM questions
WHERE quiz_id = $1
ORDER BY sequence_order;

-- Answers
-- name: CreateAnswer :one
INSERT INTO answers (
    question_id,
    content,
    is_correct
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: ListAnswersByQuestion :many
SELECT * FROM answers
WHERE question_id = $1
ORDER BY created_at;

-- Quiz Attempts
-- name: CreateQuizAttempt :one
INSERT INTO quiz_attempts (
    user_id,
    quiz_id,
    score,
    is_passed
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: CreateQuizAttemptAnswer :one
INSERT INTO quiz_attempt_answers (
    attempt_id,
    question_id,
    answer_id
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetAttemptWithAnswers :many
SELECT 
    qa.id as attempt_id, qa.score, qa.is_passed, qa.completed_at,
    qaa.question_id, qaa.answer_id,
    q.content as question_content,
    a.content as answer_content, a.is_correct
FROM quiz_attempts qa
JOIN quiz_attempt_answers qaa ON qa.id = qaa.attempt_id
JOIN questions q ON qaa.question_id = q.id
LEFT JOIN answers a ON qaa.answer_id = a.id
WHERE qa.id = $1;

-- name: GetAttemptsByUserAndQuiz :many
SELECT * FROM quiz_attempts
WHERE user_id = $1 AND quiz_id = $2
ORDER BY completed_at DESC;
