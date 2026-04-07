ALTER TABLE users ADD COLUMN subscription_plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN interview_quota INTEGER NOT NULL DEFAULT 10;
ALTER TABLE users ADD COLUMN interview_used INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS interview_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_attempts_user_id ON interview_attempts(user_id);
