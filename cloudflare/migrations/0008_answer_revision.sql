-- Additive only: do not rewrite answers, grades, deadlines or account data.
ALTER TABLE attempts ADD COLUMN answer_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE practice_attempts ADD COLUMN answer_revision INTEGER NOT NULL DEFAULT 0;
