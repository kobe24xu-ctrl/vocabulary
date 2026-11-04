-- Independent student practice; do not alter formal exams, scores or passwords.
CREATE TABLE IF NOT EXISTS practice_attempts (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 program TEXT NOT NULL, subject TEXT NOT NULL, word_group TEXT NOT NULL,
 duration INTEGER NOT NULL,
 started_at INTEGER NOT NULL, deadline INTEGER NOT NULL, questions TEXT NOT NULL,
 answers TEXT NOT NULL DEFAULT '{}', submitted_at INTEGER, score INTEGER,
 result TEXT, timed_out INTEGER NOT NULL DEFAULT 0, abandoned INTEGER NOT NULL DEFAULT 0, grading_token TEXT, grading_at INTEGER
);
CREATE INDEX IF NOT EXISTS practice_student ON practice_attempts(student_id,started_at);
CREATE UNIQUE INDEX IF NOT EXISTS practice_one_active ON practice_attempts(student_id) WHERE submitted_at IS NULL;
CREATE TABLE IF NOT EXISTS practice_mistakes (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 subject TEXT NOT NULL, word_id TEXT NOT NULL, direction TEXT NOT NULL,
 word_group TEXT NOT NULL, question TEXT NOT NULL, error_count INTEGER NOT NULL DEFAULT 1,
 last_answer TEXT NOT NULL, updated_at INTEGER NOT NULL, resolved INTEGER NOT NULL DEFAULT 0,
 UNIQUE(student_id,subject,word_id,direction)
);
CREATE INDEX IF NOT EXISTS practice_mistakes_student ON practice_mistakes(student_id,resolved);
