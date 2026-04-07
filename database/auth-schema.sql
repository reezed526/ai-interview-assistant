CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  interview_quota INTEGER NOT NULL DEFAULT 3,
  interview_used INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS interview_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_attempts_user_id ON interview_attempts(user_id);

CREATE TABLE IF NOT EXISTS notebook_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_type TEXT,
  question TEXT NOT NULL,
  user_answer TEXT,
  feedback TEXT,
  better_direction TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notebook_entries_user_id ON notebook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_entries_created_at ON notebook_entries(created_at);

CREATE TABLE IF NOT EXISTS interview_states (
  user_id TEXT PRIMARY KEY,
  payload_json TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
