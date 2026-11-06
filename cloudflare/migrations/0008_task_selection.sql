-- Additive: preserve published questions, attempts, passwords and grades.
ALTER TABLE tasks ADD COLUMN selection TEXT NOT NULL DEFAULT '{}';
