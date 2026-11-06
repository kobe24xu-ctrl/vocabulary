import { automaticTaskTitle } from "./scheduling.js";

export const MIXED_SUBJECT = "Mixed";
export const taskSubjects = (task) =>
  task.subjectScopes?.length
    ? task.subjectScopes.map((s) => s.subject)
    : [task.subject];
export function scopedTaskTitle(program, scopes, count, names = {}) {
  if (scopes.length === 1 && scopes[0].groups.length === 1)
    return automaticTaskTitle(
      program,
      scopes[0].subject,
      scopes[0].groups[0],
      names,
    );
  const scope = scopes
    .map((s) => {
      const label = s.groups.includes("all")
        ? "全部"
        : s.groups.length > 1
          ? `${s.groups.length}个分组`
          : automaticTaskTitle("", "", s.groups[0]).split(" · ").at(-1);
      return `${names[s.subject] || s.subject} ${label}`;
    })
    .join("＋");
  return `${String(program).split(" ")[0]} · ${scope.slice(0, 95)} · ${count}词`;
}

// Published metadata contains scope and question ownership, never answers.
export function publishedTaskScope(selection, questions) {
  if (!selection?.scopes?.length) return {};
  return {
    subjectScopes: selection.scopes,
    subjects: selection.scopes.map((s) => s.subject),
    candidateCount: selection.candidateCount,
    randomized: !!selection.randomized,
    questionScopes: questions.map((q) => ({
      id: q.id,
      wordId: q.wordId,
      subject: q.subject,
      groups: q.groups || [],
    })),
  };
}
