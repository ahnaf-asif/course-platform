DROP INDEX IF EXISTS idx_quiz_attempts_leaderboard;

ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS total_negative_marks;
ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS is_first_attempt;
ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS unanswered_count;
ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS wrong_count;
ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS correct_count;
ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS total_questions;
ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS time_spent_seconds;
ALTER TABLE quiz_attempts ALTER COLUMN score TYPE INT USING score::INT;

DROP TABLE IF EXISTS model_tests;
