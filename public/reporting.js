import { enrichGradeRows, gradeAverage } from "./analytics.js";

export const REPORT_COLORS = [
  "#365f80",
  "#b28a50",
  "#6f91a1",
  "#997b94",
  "#718267",
  "#c17f68",
  "#6370a1",
  "#9b854d",
];
export const completedGrade = (r) =>
  r.state === "submitted" && Number.isFinite(r.score);
export const learningLabel = (group) => {
  const match = /^Week\s*(\d+)/i.exec(group || "");
  return match ? `第${Number(match[1])}周` : group || "未标注分组";
};
export function assessmentRows(results, tasks, words, classes) {
  const map = new Map(tasks.map((t) => [t.id, t]));
  return enrichGradeRows(results, tasks, words, classes).map((r) => {
    const task = map.get(r.taskId);
    return {
      ...r,
      examAt: Number(task?.opensAt || r.finishedAt || r.submittedAt || 0),
      closesAt: Number(task?.closesAt || 0),
    };
  });
}
export function gradeMetrics(rows, at = Date.now()) {
  const done = rows.filter(completedGrade);
  const due = rows.filter((r) => completedGrade(r) || r.examAt <= at);
  return {
    average: gradeAverage(done),
    completed: done.length,
    total: rows.length,
    due: due.length,
    completion: due.length
      ? Math.round((due.filter(completedGrade).length / due.length) * 100)
      : null,
    students: new Set(rows.map((r) => r.studentId)).size,
    good: done.filter((r) => r.score >= 80).length,
    missing: rows.filter((r) => r.state === "missing").length,
    upcoming: rows.filter((r) => !completedGrade(r) && r.examAt > at).length,
  };
}
export function assessmentGroups(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.taskId)) map.set(r.taskId, []);
    map.get(r.taskId).push(r);
  }
  return [...map]
    .map(([key, records]) => ({
      key,
      rows: records,
      at: records[0].examAt,
      title: records[0].taskTitle,
      subject: records[0].subject,
      groups: [...new Set(records.flatMap((r) => r.groups))],
      ...gradeMetrics(records),
    }))
    .sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
}
export function learningGroups(rows) {
  const map = new Map();
  for (const r of rows)
    for (const key of r.groups.length ? r.groups : ["未标注分组"]) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
  return [...map]
    .map(([key, records]) => ({
      key,
      label: learningLabel(key),
      rows: records,
      ...gradeMetrics(records),
    }))
    .sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }));
}
export function courseGroups(rows, courses = []) {
  const ids = [
    ...new Set([
      ...courses.map((c) => c.subject),
      ...rows.map((r) => r.subject),
    ]),
  ];
  return ids.map((key, index) => {
    const records = rows.filter((r) => r.subject === key);
    return {
      key,
      color: REPORT_COLORS[index % REPORT_COLORS.length],
      rows: records,
      ...gradeMetrics(records),
    };
  });
}
export function studentGroups(rows, students = []) {
  const ids = [
    ...new Set([...students.map((s) => s.id), ...rows.map((r) => r.studentId)]),
  ];
  return ids
    .map((key) => {
      const records = rows.filter((r) => r.studentId === key),
        student = students.find((s) => s.id === key);
      return {
        key,
        name: student?.name || records[0]?.name || "",
        classId: student?.classId || records[0]?.classId,
        rows: records,
        ...gradeMetrics(records),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}
export function scoreBins(rows) {
  const done = rows.filter(completedGrade);
  return [
    {
      key: "low",
      label: "低于60分",
      color: "#be7b65",
      count: done.filter((r) => r.score < 60).length,
    },
    {
      key: "middle",
      label: "60–79分",
      color: "#bea16d",
      count: done.filter((r) => r.score >= 60 && r.score < 80).length,
    },
    {
      key: "strong",
      label: "80–89分",
      color: "#7898ac",
      count: done.filter((r) => r.score >= 80 && r.score < 90).length,
    },
    {
      key: "excellent",
      label: "90–100分",
      color: "#365f80",
      count: done.filter((r) => r.score >= 90).length,
    },
  ];
}
export const inScoreBin = (r, key) =>
  key === "all" ||
  (key === "pending"
    ? !completedGrade(r)
    : completedGrade(r) &&
      ({
        low: r.score < 60,
        middle: r.score >= 60 && r.score < 80,
        strong: r.score >= 80 && r.score < 90,
        excellent: r.score >= 90,
        high: r.score >= 80,
      }[key] ||
        false));
export const beijingDay = (time) =>
  time ? new Date(time + 28800000).toISOString().slice(0, 10) : "";
export const reportDay = (time) => {
  const day = beijingDay(time);
  return day ? day.slice(5).replace("-", "/") : "时间未标注";
};
