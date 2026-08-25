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

-- name: ListQuizzes :many
SELECT * FROM quizzes
ORDER BY created_at DESC;

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

-- name: GetNodesByQuiz :many
SELECT node_id FROM node_quiz
WHERE quiz_id = $1;

-- name: DetachQuizFromNode :exec
DELETE FROM node_quiz
WHERE node_id = $1 AND quiz_id = $2;

-- Questions
-- name: CreateQuestion :one
INSERT INTO questions (
    quiz_id,
    content,
    question_type,
    sequence_order,
    explanation
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: ListQuestionsByQuiz :many
SELECT * FROM questions
WHERE quiz_id = $1
ORDER BY sequence_order;

-- name: UpdateQuestion :one
UPDATE questions
SET
    content = COALESCE(sqlc.narg('content'), content),
    question_type = COALESCE(sqlc.narg('question_type'), question_type),
    sequence_order = COALESCE(sqlc.narg('sequence_order'), sequence_order),
    explanation = COALESCE(sqlc.narg('explanation'), explanation)
WHERE id = $1
RETURNING *;

-- name: DeleteQuestion :exec
DELETE FROM questions
WHERE id = $1;

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

-- name: DeleteAnswersByQuestion :exec
DELETE FROM answers
WHERE question_id = $1;

-- Quiz Attempts
-- name: CreateQuizAttempt :one
INSERT INTO quiz_attempts (
    user_id,
    quiz_id,
    score,
    is_passed,
    time_spent_seconds,
    total_questions,
    correct_count,
    wrong_count,
    unanswered_count,
    total_negative_marks,
    is_first_attempt
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
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
    qa.time_spent_seconds, qa.total_questions, qa.correct_count,
    qa.wrong_count, qa.unanswered_count, qa.total_negative_marks,
    qa.is_first_attempt,
    qaa.question_id, qaa.answer_id,
    q.content as question_content,
    q.explanation as question_explanation,
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

-- name: GetQuizAttempt :one
SELECT * FROM quiz_attempts
WHERE id = $1 LIMIT 1;

-- name: CountUserAttemptsForQuiz :one
SELECT COUNT(*) FROM quiz_attempts
WHERE user_id = $1 AND quiz_id = $2;

-- name: GetQuizAttemptAnswers :many
SELECT * FROM quiz_attempt_answers
WHERE attempt_id = $1;

-- name: GetQuizzesByNodes :many
SELECT nq.node_id, q.id as quiz_id, q.title, q.passing_score
FROM quizzes q
JOIN node_quiz nq ON q.id = nq.quiz_id
WHERE nq.node_id = ANY($1::uuid[]);

-- name: GetUserQuizAttemptsForQuizzes :many
SELECT quiz_id, score, is_passed
FROM quiz_attempts
WHERE user_id = $1 AND quiz_id = ANY(sqlc.arg(quiz_ids)::uuid[]);

-- name: GetQuizLeaderboard :many
SELECT 
    DENSE_RANK() OVER (ORDER BY qa.score DESC, qa.time_spent_seconds ASC, qa.completed_at ASC)::BIGINT as rank_position,
    qa.id as attempt_id,
    qa.user_id,
    COALESCE(up.full_name, split_part(u.email, '@', 1))::TEXT as user_name,
    up.avatar_url,
    u.email as user_email,
    qa.score,
    qa.correct_count,
    qa.wrong_count,
    qa.unanswered_count,
    qa.total_negative_marks,
    qa.time_spent_seconds,
    qa.completed_at
FROM quiz_attempts qa
JOIN users u ON qa.user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE qa.quiz_id = $1 AND qa.is_first_attempt = TRUE
ORDER BY rank_position ASC, qa.time_spent_seconds ASC, qa.completed_at ASC
LIMIT 100;

-- name: GetUserRankInQuiz :one
WITH ranked AS (
    SELECT 
        qa.id as attempt_id,
        qa.user_id,
        qa.score,
        qa.correct_count,
        qa.wrong_count,
        qa.unanswered_count,
        qa.total_negative_marks,
        qa.time_spent_seconds,
        qa.completed_at,
        DENSE_RANK() OVER (ORDER BY qa.score DESC, qa.time_spent_seconds ASC, qa.completed_at ASC)::BIGINT as rank_position
    FROM quiz_attempts qa
    WHERE qa.quiz_id = $1 AND qa.is_first_attempt = TRUE
)
SELECT rank_position, attempt_id, user_id, score, correct_count, wrong_count, unanswered_count, total_negative_marks, time_spent_seconds, completed_at
FROM ranked
WHERE user_id = $2 LIMIT 1;

-- name: CountQuizLeaderboardParticipants :one
SELECT COUNT(*) FROM quiz_attempts
WHERE quiz_id = $1 AND is_first_attempt = TRUE;




