import { SUBJECTS, SUBJECT_NAMES } from "./words.mjs";
export function validateCourses(rows) {
  const fail = (message) => {
    throw Object.assign(new Error(message), { status: 400 });
  };
  if (!Array.isArray(rows) || rows.length > SUBJECTS.length)
    fail("请选择有效的班级科目。");
  const seen = new Set();
  return rows.map((row) => {
    if (!row || !SUBJECTS.includes(row.subject) || seen.has(row.subject))
      fail("班级科目无效或重复。");
    seen.add(row.subject);
    const title =
      row.title === undefined ? SUBJECT_NAMES[row.subject] : row.title;
    const content = row.content ?? "",
      source = row.source ?? "";
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 60 ||
      typeof content !== "string" ||
      content.length > 10000 ||
      typeof source !== "string" ||
      source.length > 300
    )
      fail("科目名称或课程内容格式不正确。");
    return {
      subject: row.subject,
      title: title.trim(),
      content: content.trim(),
      source: source.trim(),
    };
  });
}
