-- Split the two imported NCUK maths banks without changing word ids or exams.
UPDATE words SET content=json_set(content,'$.subject',
  CASE json_extract(content,'$.tracks[0]') WHEN 'Integrated' THEN 'Integrated Mathematics' ELSE 'Technical Mathematics' END)
WHERE json_extract(content,'$.program')='NCUK 国际预科'
AND json_extract(content,'$.subject')='Mathematics'
AND json_extract(content,'$.tracks[0]') IN ('Integrated','Technical');

INSERT INTO class_courses(class_id,subject,title,content,source)
SELECT cc.class_id,
 CASE WHEN EXISTS(SELECT 1 FROM class_courses x WHERE x.class_id=cc.class_id AND x.subject IN ('Physics','Chemistry')) THEN 'Technical Mathematics' ELSE 'Integrated Mathematics' END,
 CASE WHEN EXISTS(SELECT 1 FROM class_courses x WHERE x.class_id=cc.class_id AND x.subject IN ('Physics','Chemistry')) THEN '工科数学' ELSE '商科数学' END,
 cc.content,cc.source
FROM class_courses cc JOIN classes c ON cc.class_id=c.id
WHERE c.program='NCUK 国际预科' AND cc.subject='Mathematics'
AND EXISTS(SELECT 1 FROM class_courses x WHERE x.class_id=c.id AND x.subject IN ('Physics','Chemistry','Business','Economics'))
ON CONFLICT(class_id,subject) DO NOTHING;

DELETE FROM class_courses WHERE subject='Mathematics' AND class_id IN
(SELECT c.id FROM classes c JOIN class_courses cc ON cc.class_id=c.id
 WHERE c.program='NCUK 国际预科' AND cc.subject IN ('Integrated Mathematics','Technical Mathematics'));
