CREATE UNIQUE INDEX IF NOT EXISTS class_student_names ON users(class_id,name) WHERE role='student';
