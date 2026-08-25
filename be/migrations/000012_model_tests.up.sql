-- Add MODEL_TEST to node_type enum
ALTER TYPE node_type ADD VALUE IF NOT EXISTS 'MODEL_TEST';

-- Create Model Tests Table
CREATE TABLE IF NOT EXISTS model_tests (
    node_id UUID PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration_minutes INT NOT NULL DEFAULT 60,
    total_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00,
    pass_marks NUMERIC(6,2) NOT NULL DEFAULT 40.00,
    negative_marking_rate NUMERIC(4,2) NOT NULL DEFAULT 0.50,
    sequence_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhance Quiz Attempts with timing, granular statistics, and leaderboard first-attempt tracking
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_spent_seconds INT NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS total_questions INT NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS correct_count INT NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS wrong_count INT NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS unanswered_count INT NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS total_negative_marks NUMERIC(6,2) NOT NULL DEFAULT 0.00;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS is_first_attempt BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE quiz_attempts ALTER COLUMN score TYPE NUMERIC(6,2) USING score::NUMERIC(6,2);

-- Leaderboard performance index
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_leaderboard 
ON quiz_attempts(quiz_id, is_first_attempt, score DESC, time_spent_seconds ASC, completed_at ASC);
