CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, role TEXT NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE,
 password TEXT, invite_hash TEXT UNIQUE, owner_id TEXT REFERENCES users(id),
 class_name TEXT, program TEXT, class_id TEXT REFERENCES classes(id),
 demo INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, username TEXT UNIQUE
);
CREATE UNIQUE INDEX IF NOT EXISTS one_formal_teacher ON users(role) WHERE role='teacher' AND demo=0;
CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, program TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL, demo_owner_id TEXT);
CREATE TABLE IF NOT EXISTS words (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, program TEXT NOT NULL, subject TEXT NOT NULL, opens_at INTEGER NOT NULL, closes_at INTEGER NOT NULL, duration INTEGER NOT NULL, audience TEXT NOT NULL, questions TEXT NOT NULL, created_at INTEGER NOT NULL, class_ids TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), student_id TEXT NOT NULL REFERENCES users(id), started_at INTEGER NOT NULL, deadline INTEGER NOT NULL, answers TEXT NOT NULL DEFAULT '{}', submitted_at INTEGER, score INTEGER, result TEXT, timed_out INTEGER NOT NULL DEFAULT 0, finalization_token TEXT, UNIQUE(task_id,student_id));
CREATE TABLE IF NOT EXISTS mistakes (id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id), word_id TEXT NOT NULL, direction TEXT NOT NULL, question TEXT NOT NULL, error_count INTEGER NOT NULL DEFAULT 1, streak INTEGER NOT NULL DEFAULT 0, next_review INTEGER NOT NULL, last_answer TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, UNIQUE(student_id,word_id,direction));
CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS users_owner ON users(owner_id);
CREATE INDEX IF NOT EXISTS users_class ON users(class_id);
CREATE INDEX IF NOT EXISTS tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS attempts_deadline ON attempts(submitted_at,deadline);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS mistakes_student ON mistakes(student_id);
CREATE INDEX IF NOT EXISTS rate_limit_expiry ON rate_limits(reset_at);
