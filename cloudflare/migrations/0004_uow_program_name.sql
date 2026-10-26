-- Rename the programme label without changing IDs or learning records.
UPDATE classes SET program='UOW 沃隆港预科' WHERE program='UOW 伍伦贡预科';
UPDATE users SET program='UOW 沃隆港预科' WHERE program='UOW 伍伦贡预科';
UPDATE tasks SET program='UOW 沃隆港预科' WHERE program='UOW 伍伦贡预科';
UPDATE words SET content=json_set(content,'$.program','UOW 沃隆港预科')
WHERE json_extract(content,'$.program')='UOW 伍伦贡预科';
