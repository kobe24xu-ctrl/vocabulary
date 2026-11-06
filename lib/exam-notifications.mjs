import { randomUUID } from "node:crypto";
const examFail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export function createExamService({ one, all, mutate }) {
  async function alerts(u, sessionHash) {
    if (u.role !== "student") examFail(403, "请使用学生账号查看考试提醒。");
    const time = Date.now();
    const tasks = await all(
      `SELECT t.id,t.title,t.program,t.subject,t.opens_at,t.closes_at,t.created_at,tr.original_task_id
      FROM users learner JOIN tasks t ON t.owner_id=learner.owner_id LEFT JOIN task_retakes tr ON tr.task_id=t.id
      WHERE learner.id=? AND learner.role='student' AND t.closes_at>?
      AND EXISTS(SELECT 1 FROM sessions s WHERE s.token_hash=? AND s.user_id=learner.id AND s.expires_at>?)
      AND EXISTS(SELECT 1 FROM json_each(t.class_ids) c WHERE c.value=learner.class_id)
      AND (t.audience='"all"' OR EXISTS(SELECT 1 FROM json_each(t.audience) a WHERE a.value=learner.id))
      AND NOT EXISTS(SELECT 1 FROM attempts a WHERE a.task_id=t.id AND a.student_id=learner.id AND a.submitted_at IS NOT NULL)
      ORDER BY CASE WHEN t.opens_at<=? THEN 0 ELSE 1 END,t.opens_at,t.created_at DESC LIMIT 50`,
      u.id,
      time,
      sessionHash,
      time,
      time,
    );
    return {
      exams: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        program: t.program,
        subject: t.subject,
        opensAt: t.opens_at,
        closesAt: t.closes_at,
        createdAt: t.created_at,
        retakeOf: t.original_task_id || null,
        phase: t.opens_at <= time ? "open" : "scheduled",
      })),
      serverTime: time,
    };
  }
  async function retake(u, sourceId, b) {
    if (u.role !== "teacher") examFail(403, "仅master可安排补考。");
    const source = await one(
      "SELECT * FROM tasks WHERE id=? AND owner_id=?",
      sourceId,
      u.id,
    );
    if (!source) examFail(404, "原考试不存在。");
    if (source.closes_at > Date.now())
      examFail(400, "请在原考试关闭后安排补考。");
    if (
      !b ||
      !Array.isArray(b.studentIds) ||
      !b.studentIds.length ||
      b.studentIds.length > 1000
    )
      examFail(400, "请选择需要补考的学生。");
    const ids = [...new Set(b.studentIds)];
    if (ids.some((id) => typeof id !== "string"))
      examFail(400, "学生名单不正确。");
    const eligible = (
      await all(
        "SELECT id,class_id FROM users WHERE owner_id=? AND role='student'",
        u.id,
      )
    ).filter(
      (s) =>
        JSON.parse(source.class_ids).includes(s.class_id) &&
        (JSON.parse(source.audience) === "all" ||
          JSON.parse(source.audience).includes(s.id)),
    );
    if (ids.some((id) => !eligible.some((s) => s.id === id)))
      examFail(400, "补考学生必须来自原考试的指定名单。");
    const opens = Date.parse(b.opensAt),
      closes = Date.parse(b.closesAt),
      duration = Number(b.duration);
    if (
      !Number.isFinite(opens) ||
      !Number.isFinite(closes) ||
      closes <= opens ||
      closes <= Date.now() ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 180
    )
      examFail(400, "请设置有效的补考时间及1–180分钟答题时长。");
    const created = Date.now(),
      date = new Date(opens + 28800000)
        .toISOString()
        .slice(5, 10)
        .replace("-", "/");
    const raw = {
      id: randomUUID(),
      owner_id: u.id,
      title: `${source.title.replace(/ · 补考.*$/, "").slice(0, 98)} · 补考 ${date}`,
      program: source.program,
      subject: source.subject,
      opens_at: opens,
      closes_at: closes,
      duration,
      audience: JSON.stringify(ids),
      questions: source.questions,
      created_at: created,
      class_ids: JSON.stringify([
        ...new Set(
          eligible.filter((s) => ids.includes(s.id)).map((s) => s.class_id),
        ),
      ]),
      retake_of: source.id,
    };
    const columns = [
      "id",
      "owner_id",
      "title",
      "program",
      "subject",
      "opens_at",
      "closes_at",
      "duration",
      "audience",
      "questions",
      "created_at",
      "class_ids",
    ];
    await mutate([
      {
        sql: `INSERT INTO tasks (${columns.join(",")}) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: columns.map((k) => raw[k]),
      },
      {
        sql: "INSERT INTO task_retakes(task_id,original_task_id,created_at) VALUES(?,?,?)",
        params: [raw.id, source.id, created],
      },
    ]);
    return raw;
  }
  return { alerts, retake };
}
// Short-lived SSE streams keep each invocation below D1 query limits. Reconnects
// are automatic; no third-party push service or paid durable binding is needed.
export function examEventStream(read, signal) {
  const encoder = new TextEncoder();
  let stopped = false,
    timer,
    release;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    release?.();
  };
  signal?.addEventListener("abort", stop, { once: true });
  if (signal?.aborted) stop();
  const body = new ReadableStream({
    async start(controller) {
      const send = (value) => {
        if (!stopped) controller.enqueue(encoder.encode(value));
      };
      try {
        send("retry: 1500\n\n");
        let last = "";
        for (let i = 0; i < 9 && !stopped; i++) {
          const snapshot = await read();
          if (stopped) break;
          const signature = JSON.stringify(snapshot.exams);
          if (signature !== last) {
            send(`event: exams\ndata: ${JSON.stringify(snapshot)}\n\n`);
            last = signature;
          } else
            send(
              `event: pulse\ndata: ${JSON.stringify({ serverTime: snapshot.serverTime })}\n\n`,
            );
          await new Promise((resolve) => {
            release = resolve;
            timer = setTimeout(resolve, 4000);
          });
          release = null;
        }
      } catch {
        if (!stopped) send("event: retry-needed\ndata: {}\n\n");
      } finally {
        signal?.removeEventListener("abort", stop);
        stopped = true;
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      stop();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
