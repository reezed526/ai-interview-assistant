-- One-time migration for moving the users table from email-first auth to username-first auth.
-- Run this in the Cloudflare D1 console before deploying the new auth code.

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  interview_quota INTEGER NOT NULL DEFAULT 3,
  interview_used INTEGER NOT NULL DEFAULT 0
);

INSERT INTO users_new (
  id,
  name,
  username,
  email,
  password_hash,
  password_salt,
  created_at,
  subscription_plan,
  interview_quota,
  interview_used
)
SELECT
  id,
  name,
  LOWER(TRIM(email)) AS username,
  CASE
    WHEN INSTR(email, '@') > 0 THEN LOWER(TRIM(email))
    ELSE NULL
  END AS email,
  password_hash,
  password_salt,
  created_at,
  COALESCE(subscription_plan, 'free') AS subscription_plan,
  COALESCE(interview_quota, 3) AS interview_quota,
  COALESCE(interview_used, 0) AS interview_used
FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;

CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_email ON users(email);

COMMIT;

PRAGMA foreign_keys = ON;
