import { randomInt } from "node:crypto";
import { PROGRAMS, SUBJECTS } from "./words.mjs";
import {
  wordAvailableFor,
  wordAvailableToClass,
} from "../public/word-banks.js";
import { MIXED_SUBJECT } from "../public/task-scopes.js";

const selectionError = (message) => {
  throw Object.assign(new Error(message), { status: 400 });
};
export function prepareTaskSelection(body, context) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    selectionError("考试配置格式不正确。");
  const modern =
    body.subjectScopes !== undefined || body.wordCount !== undefined;
  if (!PROGRAMS.includes(body.program)) selectionError("请选择有效课程项目。");
  if (
    !Array.isArray(body.classIds) ||
    !body.classIds.length ||
    body.classIds.length > 100
  )
    selectionError("请选择 1–100 个班级。");
  const classes = [...new Set(body.classIds)].map((id) =>
    context.classes.find((c) => c.id === id && c.program === body.program),
  );
  if (classes.some((c) => !c)) selectionError("请选择当前项目下的有效班级。");
  let scopes = body.subjectScopes === undefined
    ? [{ subject: body.subject, groups: [body.wordGroup || "all"] }]
    : body.subjectScopes;
  if (
    !Array.isArray(scopes) ||
    !scopes.length ||
    scopes.length > SUBJECTS.length
  )
    selectionError("请至少选择一门有效科目。");
  const seen = new Set();
  scopes = scopes.map((scope) => {
    if (!scope || !SUBJECTS.includes(scope.subject) || seen.has(scope.subject))
      selectionError("科目无效或重复。");
    seen.add(scope.subject);
    if (
      classes.some(
        (c) =>
          (modern || c.courses?.length) &&
          !c.courses?.some((x) => x.subject === scope.subject),
      )
    )
      selectionError("所选科目未配置给该班级，请先调整班级课程。");
    if (
      !Array.isArray(scope.groups) ||
      !scope.groups.length ||
      scope.groups.length > 100 ||
      scope.groups.some(
        (g) => typeof g !== "string" || !g.trim() || g.length > 100,
      )
    )
      selectionError("请为每门科目选择有效周次、Topic 或单元。");
    const groups = [...new Set(scope.groups)];
    if (groups.includes("all") && groups.length !== 1)
      selectionError("全部范围不能与具体分组同时选择。");
    return { subject: scope.subject, groups };
  });
  if (scopes.length > 1 && classes.length !== 1)
    selectionError("多科目混合听写请每次选择一个班级。");
  const pool = [],
    candidates = [];
  for (const scope of scopes) {
    const bank = context.words
      .filter(
        (w) =>
          wordAvailableFor(w, body.program, scope.subject) &&
          classes.every((c) => wordAvailableToClass(w, c)),
      )
      .map((w) => ({ ...w, subject: scope.subject }));
    if (
      scope.groups.some(
        (g) => g !== "all" && !bank.some((w) => w.groups?.includes(g)),
      )
    )
      selectionError("所选周次或 Topic 不属于当前科目。");
    const selected = bank
      .filter(
        (w) =>
          scope.groups.includes("all") ||
          scope.groups.some((g) => w.groups?.includes(g)),
      )
      .map((w) =>
        modern && !scope.groups.includes("all")
          ? {
              ...w,
              groups: (w.groups || []).filter((g) => scope.groups.includes(g)),
            }
          : w,
      );
    if (!selected.length)
      selectionError("所选科目范围暂无词汇，请调整周次或 Topic。");
    pool.push(...bank);
    candidates.push(...selected);
  }
  // Shared source words (e.g. UOW English) appear once in a combined paper.
  const candidateMap = new Map(candidates.map((w) => [w.id, w]));
  let eligible = [...candidateMap.values()];
  if (body.wordIds !== undefined) {
    if (
      !Array.isArray(body.wordIds) ||
      !body.wordIds.length ||
      body.wordIds.length > (modern ? 10000 : 100)
    )
      selectionError(
        modern
          ? "请选择 1–10000 个候选词汇。"
          : "每份任务请选择 1–100 个词汇。",
      );
    const ids = new Set(body.wordIds);
    if ([...ids].some((id) => !candidateMap.has(id)))
      selectionError("存在不属于所选科目或分组的词汇。");
    eligible = [...ids].map((id) => candidateMap.get(id));
  } else if (!modern) selectionError("每份任务请选择 1–100 个词汇。");
  const count =
    body.wordCount === undefined ? eligible.length : Number(body.wordCount);
  if (!Number.isInteger(count) || count < 1 || count > 100)
    selectionError("每份任务的考察词数须为 1–100。");
  if (count > eligible.length)
    selectionError(
      `当前范围只有 ${eligible.length} 个候选词汇，不能抽取 ${count} 个。`,
    );
  const candidateCount = eligible.length;
  if (body.wordCount !== undefined)
    for (let i = 0; i < count; i++) {
      const j = i + randomInt(eligible.length - i);
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
  return {
    subject: scopes.length > 1 ? MIXED_SUBJECT : scopes[0].subject,
    scopes,
    pool,
    words: eligible.slice(0, count),
    metadata: modern
      ? { scopes, candidateCount, randomized: body.wordCount !== undefined }
      : {},
  };
}
