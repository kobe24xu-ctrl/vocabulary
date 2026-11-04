import { randomUUID } from "node:crypto";
import { publicQuestion, attemptTiming } from "./domain.mjs";
import { buildPracticeQuestions } from "./practice-questions.mjs";
import {
  wordAvailableFor,
  wordAvailableToClass,
} from "../public/word-banks.js";
import { SUBJECT_NAMES } from "./words.mjs";

const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const statement = (sql, ...params) => ({ sql, params });
const groupKey = (g) =>
  /^Week\s+(\d+)/i.test(g || "")
    ? `Week ${Number(/^Week\s+(\d+)/i.exec(g)[1])}`
    : g;
const inGroup = (word, group) =>
  (word.groups || []).some((g) => groupKey(g) === groupKey(group));
const json = JSON.parse;
export function practiceView(a, detail = false) {
  const questions = json(a.questions);
  return {
    id: a.id,
    practice: true,
    program: a.program,
    subject: a.subject,
    wordGroup: a.word_group,
    abandoned: !!a.abandoned,
    title: `模拟 · ${SUBJECT_NAMES[a.subject] || a.subject} · ${a.word_group}`,
    duration: a.duration,
    deadline: a.deadline,
    questionCount: questions.length,
    mode: questions.every((q) => q.direction === questions[0].direction)
      ? questions[0].direction
      : "mixed",
    questionType: questions.every((q) => q.choices) ? "choice" : "fill",
    ...attemptTiming(a.started_at, a.submitted_at, a.deadline),
    submittedAt: a.submitted_at,
    score: a.score,
    timedOut: !!a.timed_out,
    ...(detail
      ? { answers: json(a.answers), result: a.result ? json(a.result) : null }
      : {}),
  };
}
// Both D1 and Node SQLite use this service and atomic mutation adapter.
export function createPracticeService({
  one,
  all,
  mutate,
  wordsFor,
  classesFor,
  grade,
}) {
  async function own(u, pid) {
    const a = await one(
      "SELECT * FROM practice_attempts WHERE id=? AND student_id=?",
      pid,
      u.id,
    );
    if (!a) fail(404, "未找到你的模拟考试。");
    return a;
  }
  function answerData(value, questions) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "答案格式不正确。");
    const ids = new Set(questions.map((q) => q.id)),
      out = {};
    for (const [k, v] of Object.entries(value)) {
      if (!ids.has(k) || typeof v !== "string" || v.length > 2000)
        fail(400, "答案格式或长度不正确。");
      out[k] = v;
    }
    return out;
  }
  async function finish(a, answers, timedOut = false) {
    if (a.submitted_at) return a;
    const token = randomUUID(),
      timestamp = Date.now(),
      finished = Math.min(timestamp, a.deadline);
    if (timestamp >= a.deadline) {
      answers = json(a.answers);
      timedOut = true;
    }
    await mutate([
      statement(
        "UPDATE practice_attempts SET grading_token=?,grading_at=?,answers=? WHERE id=? AND submitted_at IS NULL AND (grading_token IS NULL OR grading_at<?)",
        token,
        timestamp,
        JSON.stringify(answers),
        a.id,
        timestamp - 120000,
      ),
    ]);
    let current = await one("SELECT * FROM practice_attempts WHERE id=?", a.id);
    if (current.submitted_at) return current;
    if (current.grading_token !== token)
      fail(409, "模拟考试正在评分，请稍后重试。");
    const questions = json(a.questions);
    let result;
    try {
      result = await grade(questions, answers);
    } catch (error) {
      await mutate([
        statement(
          "UPDATE practice_attempts SET grading_token=NULL,grading_at=NULL WHERE id=? AND grading_token=? AND submitted_at IS NULL",
          a.id,
          token,
        ),
      ]);
      throw error;
    }
    const guard =
      "EXISTS(SELECT 1 FROM practice_attempts WHERE id=? AND grading_token=? AND submitted_at=?)";
    const wrong = result.results
      .filter((r) => !r.correct)
      .map((r) => ({
        id: randomUUID(),
        wordId: r.wordId,
        direction: r.direction,
        question: JSON.stringify(questions.find((q) => q.id === r.questionId)),
        answer: r.submitted,
      }));
    const correct = result.results
      .filter((r) => r.correct)
      .map((r) => ({ wordId: r.wordId, direction: r.direction }));
    const operations = [
      statement(
        "UPDATE practice_attempts SET submitted_at=?,score=?,result=?,timed_out=? WHERE id=? AND submitted_at IS NULL AND grading_token=?",
        finished,
        result.score,
        JSON.stringify(result),
        timedOut ? 1 : 0,
        a.id,
        token,
      ),
      statement(
        `INSERT INTO practice_mistakes(id,student_id,subject,word_id,direction,word_group,question,error_count,last_answer,updated_at,resolved) SELECT json_extract(j.value,'$.id'),?,?,json_extract(j.value,'$.wordId'),json_extract(j.value,'$.direction'),?,json_extract(j.value,'$.question'),1,json_extract(j.value,'$.answer'),?,0 FROM json_each(?) j WHERE ${guard} ON CONFLICT(student_id,subject,word_id,direction) DO UPDATE SET word_group=excluded.word_group,question=excluded.question,error_count=practice_mistakes.error_count+1,last_answer=excluded.last_answer,updated_at=excluded.updated_at,resolved=0`,
        a.student_id,
        a.subject,
        a.word_group,
        timestamp,
        JSON.stringify(wrong),
        a.id,
        token,
        finished,
      ),
      statement(
        `UPDATE practice_mistakes SET resolved=1,updated_at=? WHERE student_id=? AND subject=? AND EXISTS(SELECT 1 FROM json_each(?) j WHERE json_extract(j.value,'$.wordId')=practice_mistakes.word_id AND json_extract(j.value,'$.direction')=practice_mistakes.direction) AND ${guard}`,
        timestamp,
        a.student_id,
        a.subject,
        JSON.stringify(correct),
        a.id,
        token,
        finished,
      ),
    ];
    await mutate(operations);
    return await one("SELECT * FROM practice_attempts WHERE id=?", a.id);
  }
  async function expired(u) {
    const a = await one(
      "SELECT * FROM practice_attempts WHERE student_id=? AND submitted_at IS NULL AND deadline<=?",
      u.id,
      Date.now(),
    );
    if (a) await finish(a, json(a.answers), true);
  }
  async function create(u, b) {
    await expired(u);
    const active = await one(
      "SELECT * FROM practice_attempts WHERE student_id=? AND submitted_at IS NULL",
      u.id,
    );
    if (active?.grading_token && active.grading_at > Date.now() - 120000)
      fail(409, "上一场模拟考试正在评分，请稍后重新开始。");
    const cls = (await classesFor(u.owner_id)).find((c) => c.id === u.class_id);
    if (!cls) fail(404, "班级不存在，请联系master。");
    if (!cls.courses?.some((c) => c.subject === b.subject))
      fail(400, "请选择自己班级开设的科目。");
    if (
      typeof b.wordGroup !== "string" ||
      !b.wordGroup.trim() ||
      b.wordGroup === "all" ||
      b.wordGroup.length > 100
    )
      fail(400, "请选择一个具体周次或Topic。");
    if (
      !["en-zh", "zh-en", "mixed"].includes(b.mode) ||
      !["choice", "fill"].includes(b.questionType)
    )
      fail(400, "请选择有效题型和翻译方向。");
    const duration = Number(b.duration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 180)
      fail(400, "答题时长需为1–180分钟。");
    const bank = (await wordsFor(u.owner_id))
      .filter(
        (w) =>
          wordAvailableFor(w, cls.program, b.subject) &&
          wordAvailableToClass(w, cls),
      )
      .map((w) => ({ ...w, subject: b.subject }));
    let selected = bank.filter((w) => inGroup(w, b.wordGroup)),
      references = [];
    if (b.mistakesOnly) {
      const wrong = await all(
        "SELECT question FROM practice_mistakes WHERE student_id=? AND subject=? AND resolved=0",
        u.id,
        b.subject,
      );
      const ids = new Set(
        wrong.flatMap((m) => {
          const q = json(m.question);
          return inGroup(q, b.wordGroup) ? [q.wordId] : [];
        }),
      );
      selected = selected.filter((w) => ids.has(w.id));
    }
    const seen = new Set();
    selected = selected.filter((w) => !seen.has(w.id) && seen.add(w.id));
    if (!selected.length)
      fail(
        400,
        b.mistakesOnly ? "本周没有待巩固的练习错词。" : "这周尚无可用词汇。",
      );
    if (selected.length > 300)
      fail(400, "本周超过300个词汇，请选择更细的Topic或词汇单元练习。");
    const last = await one(
      "SELECT questions FROM practice_attempts WHERE student_id=? AND subject=? ORDER BY started_at DESC LIMIT 1",
      u.id,
      b.subject,
    );
    if (last) references.push(...json(last.questions));
    const questions = buildPracticeQuestions(
      selected,
      b.mode,
      [...bank, ...selected],
      b.questionType,
      references,
    );
    const pid = randomUUID(),
      started = Date.now();
    const operations = [];
    if (active)
      operations.push(
        statement(
          "UPDATE practice_attempts SET submitted_at=?,abandoned=1,grading_token=NULL WHERE id=? AND student_id=? AND submitted_at IS NULL AND (grading_token IS NULL OR grading_at<?)",
          started,
          active.id,
          u.id,
          started - 120000,
        ),
      );
    operations.push(
      statement(
        "INSERT INTO practice_attempts(id,student_id,program,subject,word_group,duration,started_at,deadline,questions) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING",
        pid,
        u.id,
        cls.program,
        b.subject,
        b.wordGroup,
        duration,
        started,
        started + duration * 60000,
        JSON.stringify(questions),
      ),
    );
    await mutate(operations);
    const created = await one(
      "SELECT * FROM practice_attempts WHERE id=? AND student_id=?",
      pid,
      u.id,
    );
    if (!created) fail(409, "已有正在进行的模拟考试，请刷新后继续。");
    return detail(created);
  }
  function detail(a) {
    return {
      attempt: practiceView(a, true),
      task: practiceView(a),
      questions: a.submitted_at ? [] : json(a.questions).map(publicQuestion),
      serverTime: Date.now(),
    };
  }
  return async function route(
    u,
    path,
    method,
    b = {},
    search = new URLSearchParams(),
  ) {
    if (u.role !== "student") fail(403, "请使用学生账号进行自主练习。");
    if (!b || typeof b !== "object" || Array.isArray(b))
      fail(400, "模拟考试参数不正确。");
    if (path === "/api/practice" && method === "POST") return create(u, b);
    if (path === "/api/practice" && method === "GET") {
      await expired(u);
      const before = Number(search.get("before")) || Number.MAX_SAFE_INTEGER;
      const attempts = await all(
        "SELECT * FROM practice_attempts WHERE student_id=? AND started_at<? ORDER BY started_at DESC LIMIT 51",
        u.id,
        before,
      );
      const mistakes = await all(
        "SELECT * FROM practice_mistakes WHERE student_id=? AND resolved=0 ORDER BY updated_at DESC",
        u.id,
      );
      const stats = await one(
        "SELECT count(*) AS completed,round(avg(score),1) AS average FROM practice_attempts WHERE student_id=? AND submitted_at IS NOT NULL AND abandoned=0",
        u.id,
      );
      return {
        stats,
        attempts: attempts.slice(0, 50).map((a) => practiceView(a)),
        nextBefore: attempts.length > 50 ? attempts[49].started_at : null,
        mistakes: mistakes.map((m) => ({
          id: m.id,
          subject: m.subject,
          wordGroup: m.word_group,
          question: json(m.question),
          errorCount: m.error_count,
          lastAnswer: m.last_answer,
        })),
        serverTime: Date.now(),
      };
    }
    const match = path.match(/^\/api\/practice\/([a-f0-9-]{36})(\/submit)?$/i);
    if (!match) fail(404, "模拟考试接口不存在。");
    let a = await own(u, match[1]);
    if (a.submitted_at) return detail(a);
    if (a.deadline <= Date.now())
      return detail(await finish(a, json(a.answers), true));
    if (method === "GET" && !match[2]) return detail(a);
    if (method === "PATCH" && !match[2]) {
      const answers = answerData(b.answers, json(a.questions));
      await mutate([
        statement(
          "UPDATE practice_attempts SET answers=? WHERE id=? AND student_id=? AND submitted_at IS NULL AND grading_token IS NULL AND deadline>?",
          JSON.stringify(answers),
          a.id,
          u.id,
          Date.now(),
        ),
      ]);
      a = await own(u, a.id);
      if (a.submitted_at) return detail(a);
      return { savedAt: Date.now(), serverTime: Date.now() };
    }
    if (method === "POST" && match[2])
      return detail(await finish(a, answerData(b.answers, json(a.questions))));
    fail(405, "不支持此模拟考试操作。");
  };
}
