// Collapse course slices only for totals; a course filter retains its own score.
export function collapseGradeRows(rows) {
  const exams = new Map();
  rows.forEach((row, i) => {
    const key =
      row.taskId && row.studentId
        ? `${row.taskId}:${row.studentId}`
        : `row:${i}`;
    if (!exams.has(key)) exams.set(key, []);
    exams.get(key).push(row);
  });
  return [...exams.values()].map((parts) => {
    if (parts.length === 1 || !parts.every((r) => r.isSubjectPart))
      return parts[0];
    const total = parts.reduce((n, r) => n + r.questionCount, 0);
    const correct = parts.reduce((n, r) => n + r.correctCount, 0);
    return {
      ...parts[0],
      subject: "Mixed",
      isSubjectPart: false,
      questionCount: total,
      correctCount: correct,
      score:
        parts[0].state === "submitted"
          ? Math.round((100 * correct) / total)
          : null,
      groups: [...new Set(parts.flatMap((r) => r.groups))],
    };
  });
}
// Pure aggregation: pending/missing attempts never become zero scores.
export const gradeAverage = (rows) => {
  const done = collapseGradeRows(rows).filter(
    (r) => r.state === "submitted" && Number.isFinite(r.score),
  );
  return done.length
    ? Math.round((done.reduce((s, r) => s + r.score, 0) / done.length) * 10) /
        10
    : null;
};
export function enrichGradeRows(results, tasks, words, classes) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const normalized = (g) =>
    /^Week\s+(\d+)/i.test(g)
      ? `Week ${String(Number(/^Week\s+(\d+)/i.exec(g)[1])).padStart(2, "0")}`
      : g;
  return results.flatMap((row) => {
    const task = taskMap.get(row.taskId) || {};
    if (task.subjectScopes?.length && task.questionScopes?.length) {
      const result = Array.isArray(row.result)
        ? row.result
        : row.result?.results || [];
      return [...new Set(task.questionScopes.map((q) => q.subject))].map(
        (subject) => {
          const questions = task.questionScopes.filter(
            (q) => q.subject === subject,
          );
          const ids = new Set(questions.map((q) => q.id));
          const correctCount = result.filter(
            (q) => ids.has(q.questionId) && q.correct,
          ).length;
          return {
            ...row,
            subject,
            isSubjectPart: true,
            questionCount: questions.length,
            correctCount,
            score:
              row.state === "submitted"
                ? Math.round((100 * correctCount) / questions.length)
                : null,
            groups: [
              ...new Set(
                questions.flatMap((q) => q.groups || []).map(normalized),
              ),
            ].sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
          };
        },
      );
    }
    const ids =
      task.wordIds ||
      (Array.isArray(row.result) ? row.result : row.result?.results || []).map(
        (q) => q.wordId,
      );
    let groups = task.wordGroups?.length
      ? task.wordGroups
      : ids.flatMap((id) => wordMap.get(id)?.groups || []);
    if (!groups.length) {
      const week = /(?:\bWeek\s*|\bW)(\d{1,2})\b/i.exec(
        task.title || row.taskTitle || "",
      );
      if (week) groups = [`Week ${week[1]}`];
    }
    const cls = classMap.get(row.classId);
    const subject =
      row.program === "NCUK 国际预科" && row.subject === "Mathematics"
        ? cls?.courses?.find((c) =>
            ["Integrated Mathematics", "Technical Mathematics"].includes(
              c.subject,
            ),
          )?.subject || row.subject
        : row.subject;
    return {
      ...row,
      subject,
      groups: [...new Set(groups.map(normalized))].sort((a, b) =>
        a.localeCompare(b, "zh-CN", { numeric: true }),
      ),
    };
  });
}
export function summarizeGrades(rows, key) {
  const sets = new Map();
  for (const r of rows)
    for (const value of key === "groups"
      ? r.groups.length
        ? r.groups
        : ["未标注周次 / 单元"]
      : [r[key]]) {
      if (!sets.has(value)) sets.set(value, []);
      sets.get(value).push(r);
    }
  return [...sets].map(([value, records]) => ({
    value,
    rows: records,
    average: gradeAverage(records),
    total: records.length,
    submitted: records.filter((r) => r.state === "submitted").length,
  }));
}
export const scoreBand = (r) =>
  r.state !== "submitted" || !Number.isFinite(r.score)
    ? "pending"
    : r.score < 60
      ? "low"
      : r.score < 80
        ? "middle"
        : "high";
