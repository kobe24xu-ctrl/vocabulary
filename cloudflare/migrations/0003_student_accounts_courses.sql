ALTER TABLE users ADD COLUMN initial_password INTEGER NOT NULL DEFAULT 0;
CREATE TABLE class_courses (
 class_id TEXT NOT NULL REFERENCES classes(id), subject TEXT NOT NULL,
 title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(class_id,subject)
);
