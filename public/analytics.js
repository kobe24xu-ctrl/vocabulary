// Pure aggregation: pending/missing attempts never become zero scores.
export const gradeAverage = (rows) => {
  const done = rows.filter(
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
  return results.map((row) => {
    const task = taskMap.get(row.taskId) || {};
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
