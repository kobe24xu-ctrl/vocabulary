-- Personal retakes are independent exams; keep original attempts and grades.
CREATE TABLE IF NOT EXISTS task_retakes (
 task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
 original_task_id TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS retakes_original ON task_retakes(original_task_id);
