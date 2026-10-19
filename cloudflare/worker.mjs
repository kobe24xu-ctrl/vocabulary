import {
  MASTER_ACCOUNT,
  MASTER_NAME,
  MANAGEMENT_MODEL,
  isMasterLogin,
} from "../lib/master.mjs";
import {
  SAMPLE_WORDS,
  PROGRAMS,
  SUBJECTS,
  SUBJECT_NAMES,
} from "../lib/words.mjs";
import {
  buildQuestions,
  publicQuestion,
  mark,
  isCorrect,
} from "../lib/domain.mjs";
import {
  id,
  token,
  hash,
  equal,
  passwordHash,
  passwordOK,
} from "./security.mjs";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const required = (v, label, max = 300) => {
  if (typeof v !== "string" || !v.trim() || v.trim().length > max)
    fail(400, `${label}不能为空，且长度不能超过 ${max} 个字符。`);
  return v.trim();
};
const json = JSON.parse,
  jsonString = JSON.stringify;
const canTake = (task, u) =>
  task.owner_id === u.owner_id &&
  json(task.class_ids).includes(u.class_id) &&
  (json(task.audience) === "all" || json(task.audience).includes(u.id));
function validateWord(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    fail(400, "词汇格式不正确。");
  const subject = required(raw.subject, "科目", 60);
  if (!SUBJECTS.includes(subject)) fail(400, "请选择有效科目。");
  const word = {
    id: id(),
    subject,
    program: raw.program || "通用示例",
    term: required(raw.term, "英文词汇", 150),
    translation: required(raw.translation, "中文释义", 150),
    sentence: required(raw.sentence, "英文场景句", 2000),
    sentenceZh: required(raw.sentenceZh, "中文场景句", 2000),
    aliases: Array.isArray(raw.aliases)
      ? raw.aliases.map((a) => required(a, "可接受答案", 150)).slice(0, 20)
      : [],
    source: raw.source?.trim().slice(0, 200) || "教师自建词汇",
  };
  if (![...PROGRAMS, "通用示例"].includes(word.program))
    fail(400, "课程项目不正确。");
  if (
    !word.sentence.toLowerCase().includes(word.term.toLowerCase()) ||
    !word.sentenceZh.includes(word.translation)
  )
    fail(400, "英文场景句需包含英文词汇，中文场景句需包含中文释义。");
  return word;
}

function taskView(t) {
  const qs = json(t.questions);
  return {
    id: t.id,
    title: t.title,
    program: t.program,
    subject: t.subject,
    opensAt: t.opens_at,
    closesAt: t.closes_at,
    duration: t.duration,
    audience: json(t.audience),
    classIds: json(t.class_ids),
    questionCount: qs.length,
    mode: qs.every((q) => q.direction === qs[0].direction)
      ? qs[0].direction
      : "mixed",
    createdAt: t.created_at,
  };
}
function attemptView(a) {
  return {
    id: a.id,
    taskId: a.task_id,
    startedAt: a.started_at,
    deadline: a.deadline,
    answers: json(a.answers),
    submittedAt: a.submitted_at,
    score: a.score,
    result: a.result ? json(a.result) : null,
    timedOut: !!a.timed_out,
  };
}

function answerObject(value, questions) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(400, "答案格式不正确。");
  const allowed = new Set(questions.map((q) => q.id));
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    if (!allowed.has(key) || typeof v !== "string" || v.length > 2000)
      fail(400, "答案不正确或过长。");
    out[key] = v;
  }
  return out;
}

const SECURITY = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
};
function service(env, request, headers = new Headers(SECURITY)) {
  const statement = (sql, ...p) => env.DB.prepare(sql).bind(...p);
  const one = (sql, ...p) => statement(sql, ...p).first();
  const all = async (sql, ...p) => (await statement(sql, ...p).all()).results;
  const run = (sql, ...p) => statement(sql, ...p).run();
  const bulk = (table, columns, rows) =>
    statement(
      `INSERT INTO ${table} (${columns.join(",")}) SELECT ${columns.map((_, i) => `json_extract(value,'$[${i}]')`).join(",")} FROM json_each(?)`,
      jsonString(rows),
    );
  const batch = (statements) =>
    statements.length ? env.DB.batch(statements) : Promise.resolve([]);
  const allowDemo = env.ALLOW_DEMO === "true";
  const url = request && new URL(request.url);
  const teacher = (u) => {
    if (u.role !== "teacher") fail(403, "仅教师可执行此操作。");
  };
  const student = (u) => {
    if (u.role !== "student") fail(403, "请使用学生账号。");
  };
  async function userInfo(u, session) {
    const cls = u.class_id
      ? await one("SELECT name FROM classes WHERE id=?", u.class_id)
      : null;
    return {
      id: u.id,
      role: u.role,
      name:
        u.role === "teacher"
          ? session?.demo_owner_id
            ? "演示 Master"
            : MASTER_NAME
          : u.name,
      className: u.role === "teacher" ? u.class_name : cls?.name,
      program: u.program,
      classId: u.class_id,
      username: u.role === "teacher" ? MASTER_ACCOUNT : u.username,
      isDemo: !!session?.demo_owner_id,
    };
  }
  function cookie(value, age = 604800) {
    headers.set(
      "Set-Cookie",
      `lexiclass=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${url.protocol === "https:" ? "; Secure" : ""}`,
    );
  }
  async function newSession(u, demoOwner = null) {
    const raw = token();
    await run(
      "INSERT INTO sessions VALUES(?,?,?,?)",
      await hash(raw),
      u.id,
      Date.now() + 604800000,
      demoOwner,
    );
    cookie(raw);
    return userInfo(u, { demo_owner_id: demoOwner });
  }
  async function getSession() {
    const raw = (request.headers.get("cookie") || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("lexiclass="))
      ?.slice(10);
    return raw
      ? one(
          "SELECT * FROM sessions WHERE token_hash=? AND expires_at>?",
          await hash(raw),
          Date.now(),
        )
      : null;
  }
  async function limited(scope, limit = 20, window = 900000) {
    const now = Date.now(),
      bucket = await hash(
        `${request.headers.get("CF-Connecting-IP") || "local"}:${scope}`,
      );
    const result = await batch([
      statement(
        "INSERT INTO rate_limits(bucket,count,reset_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END",
        bucket,
        now + window,
        now,
        now,
      ),
      statement("SELECT count FROM rate_limits WHERE bucket=?", bucket),
    ]);
    if (result[1].results[0].count > limit)
      fail(429, "尝试次数过多，请稍后再试。");
  }
  async function body() {
    if (
      !(request.headers.get("content-type") || "").startsWith(
        "application/json",
      )
    )
      fail(415, "请使用 JSON 请求。");
    if (Number(request.headers.get("content-length")) > 1048576)
      fail(413, "请求过大，请分批导入。");
    const reader = request.body?.getReader();
    let size = 0;
    const chunks = [];
    if (reader) {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1048576) {
            await reader.cancel();
            fail(413, "请求过大，请分批导入。");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let value;
    try {
      value = json(new TextDecoder().decode(bytes) || "{}");
    } catch {
      fail(400, "JSON 格式错误。");
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "请求必须是 JSON 对象。");
    return value;
  }
  async function wordsFor(owner) {
    return [
      ...SAMPLE_WORDS,
      ...(await all("SELECT content FROM words WHERE owner_id=?", owner)).map(
        (r) => json(r.content),
      ),
    ];
  }
  function classData(owner, raw) {
    const name = required(raw?.name, "班级名称", 100),
      program = raw.program;
    if (!PROGRAMS.includes(program)) fail(400, "请选择有效课程项目。");
    const cls = { id: id(), name, program };
    return {
      cls,
      sql: statement(
        "INSERT INTO classes VALUES(?,?,?,?,?)",
        cls.id,
        owner,
        name,
        program,
        Date.now(),
      ),
    };
  }
  async function studentData(owner, rows) {
    const classes = await all("SELECT * FROM classes WHERE owner_id=?", owner);
    const existing = await all(
      "SELECT class_id,name FROM users WHERE owner_id=? AND role='student'",
      owner,
    );
    const names = new Set(existing.map((s) => `${s.class_id}:${s.name}`)),
      students = [],
      statements = [];
    for (const raw of rows) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        fail(400, "学生格式不正确。");
      const name = required(raw.name, "学生姓名", 60),
        cls = classes.find((c) => c.id === raw.classId);
      if (!cls) fail(400, "请选择有效班级。");
      const key = `${cls.id}:${name}`;
      if (names.has(key))
        fail(409, "该班级已有同名学生，请补充学号或姓名标识。");
      names.add(key);
      const s = {
        id: id(),
        name,
        program: cls.program,
        classId: cls.id,
        invite: token(9).toUpperCase(),
      };
      students.push(s);
      statements.push([
        s.id,
        "student",
        name,
        await hash(s.invite),
        owner,
        cls.program,
        cls.id,
        Date.now(),
      ]);
    }
    return {
      students,
      statements: [
        bulk(
          "users",
          [
            "id",
            "role",
            "name",
            "invite_hash",
            "owner_id",
            "program",
            "class_id",
            "created_at",
          ],
          statements,
        ),
      ],
    };
  }
  async function taskContext(owner) {
    return {
      words: await wordsFor(owner),
      classes: await all("SELECT * FROM classes WHERE owner_id=?", owner),
      students: await all(
        "SELECT id,class_id FROM users WHERE owner_id=? AND role='student'",
        owner,
      ),
    };
  }
  function taskData(owner, b, context) {
    const title = required(b?.title, "任务名称", 120);
    if (!PROGRAMS.includes(b.program) || !SUBJECTS.includes(b.subject))
      fail(400, "请选择课程项目和科目。");
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
      fail(400, "请设置有效的起止时间，以及 1–180 分钟的答题时长。");
    if (!["en-zh", "zh-en", "mixed", "choice"].includes(b.mode))
      fail(400, "请选择有效题型。");
    const pool = context.words.filter(
      (w) =>
        w.subject === b.subject &&
        (w.program === "通用示例" || w.program === b.program),
    );
    if (
      !Array.isArray(b.wordIds) ||
      !b.wordIds.length ||
      b.wordIds.length > 100
    )
      fail(400, "每份任务请选择 1–100 个词汇。");
    const words = [...new Set(b.wordIds)].map((wid) =>
      pool.find((w) => w.id === wid),
    );
    if (words.some((w) => !w)) fail(400, "存在不属于该科目或课程的词汇。");
    if (
      !Array.isArray(b.classIds) ||
      !b.classIds.length ||
      b.classIds.length > 100
    )
      fail(400, "请选择 1–100 个班级。");
    const classIds = [...new Set(b.classIds)];
    if (
      classIds.some(
        (cid) =>
          !context.classes.some((c) => c.id === cid && c.program === b.program),
      )
    )
      fail(400, "请选择当前项目下的有效班级。");
    let audience = "all";
    if (b.audience !== "all") {
      if (
        !Array.isArray(b.audience) ||
        !b.audience.length ||
        b.audience.length > 1000
      )
        fail(400, "请选择至少一名学生。");
      audience = [...new Set(b.audience)];
      if (
        audience.some(
          (sid) =>
            !context.students.some(
              (s) => s.id === sid && classIds.includes(s.class_id),
            ),
        )
      )
        fail(400, "所选学生不属于指定班级。");
    }
    let questions;
    try {
      questions = buildQuestions(words, b.mode, pool);
    } catch (e) {
      fail(400, e.message);
    }
    const task = {
      id: id(),
      owner_id: owner,
      title,
      program: b.program,
      subject: b.subject,
      opens_at: opens,
      closes_at: closes,
      duration,
      audience: jsonString(audience),
      questions: jsonString(questions),
      created_at: Date.now(),
      class_ids: jsonString(classIds),
    };
    return {
      task,
      sql: statement(
        "INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        ...[
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
        ].map((k) => task[k]),
      ),
    };
  }
  async function finalize(attempt, answers, timedOut = false) {
    if (attempt.submitted_at) return attemptView(attempt);
    const task = await one("SELECT * FROM tasks WHERE id=?", attempt.task_id),
      questions = json(task.questions),
      now = Date.now();
    // Recheck at finalization: a late request can only grade the saved answers.
    if (now >= attempt.deadline) {
      timedOut = true;
      answers = json(attempt.answers);
    }
    const result = mark(questions, answers),
      lock = id();
    const statements = [
      statement(
        "UPDATE attempts SET answers=?,submitted_at=?,score=?,result=?,timed_out=?,finalization_token=? WHERE id=? AND submitted_at IS NULL",
        jsonString(answers),
        now,
        result.score,
        jsonString(result),
        timedOut ? 1 : 0,
        lock,
        attempt.id,
      ),
    ];
    const wrong = result.results
      .filter((r) => !r.correct)
      .map((r) => {
        const q = questions.find((q) => q.id === r.questionId);
        return [
          id(),
          attempt.student_id,
          q.wordId,
          q.direction,
          jsonString(q),
          now,
          r.submitted,
        ];
      });
    if (wrong.length)
      statements.push(
        statement(
          `INSERT INTO mistakes(id,student_id,word_id,direction,question,error_count,streak,next_review,last_answer,resolved)
      SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]'),json_extract(value,'$[4]'),1,0,json_extract(value,'$[5]'),json_extract(value,'$[6]'),0
      FROM json_each(?) WHERE EXISTS(SELECT 1 FROM attempts WHERE id=? AND finalization_token=?)
      ON CONFLICT(student_id,word_id,direction) DO UPDATE SET error_count=error_count+1,streak=0,next_review=excluded.next_review,last_answer=excluded.last_answer,resolved=0,question=excluded.question`,
          jsonString(wrong),
          attempt.id,
          lock,
        ),
      );
    // D1 batch is atomic; the token makes simultaneous submit/cron calls idempotent.
    await batch(statements);
    return attemptView(
      await one("SELECT * FROM attempts WHERE id=?", attempt.id),
    );
  }
  async function sweep(u) {
    const now = Date.now();
    const attempts = !u
      ? await all(
          "SELECT * FROM attempts WHERE submitted_at IS NULL AND deadline<=? LIMIT 10",
          now,
        )
      : u.role === "student"
        ? await all(
            "SELECT * FROM attempts WHERE student_id=? AND submitted_at IS NULL AND deadline<=? LIMIT 10",
            u.id,
            now,
          )
        : await all(
            "SELECT a.* FROM attempts a JOIN tasks t ON a.task_id=t.id WHERE t.owner_id=? AND a.submitted_at IS NULL AND a.deadline<=? LIMIT 10",
            u.id,
            now,
          );
    for (const a of attempts) await finalize(a, json(a.answers), true);
    if (!u)
      await batch([
        statement("DELETE FROM sessions WHERE expires_at<=?", now),
        statement("DELETE FROM rate_limits WHERE reset_at<=?", now),
      ]);
  }
  async function demoCreate() {
    const owner = id(),
      now = Date.now();
    const sql = [
      statement(
        "INSERT INTO users(id,role,name,email,class_name,demo,created_at) VALUES(?,'teacher','林老师',?,'国际预科教学中心',1,?)",
        owner,
        `demo-${owner}@example.invalid`,
        now,
      ),
    ];
    const classes = PROGRAMS.map((program, i) =>
      classData(owner, {
        name: ["UNSW 商科 A 班", "NCUK 国际预科 1 班", "UOW 商科 B 班"][i],
        program,
      }),
    );
    sql.push(...classes.map((c) => c.sql));
    const names = [
      "陈思远",
      "林雨桐",
      "王子涵",
      "刘书言",
      "张予安",
      "许知夏",
      "周亦辰",
      "赵若宁",
      "沈星河",
      "李可欣",
      "宋以宁",
      "杨景然",
    ];
    const students = names.map((name, i) => ({
      id: id(),
      name,
      class_id: classes[i % 3].cls.id,
    }));
    for (const s of students)
      sql.push(
        statement(
          "INSERT INTO users(id,role,name,invite_hash,owner_id,program,class_id,demo,created_at) VALUES(?,'student',?,?,?,?,?,1,?)",
          s.id,
          s.name,
          await hash(token()),
          owner,
          classes.find((c) => c.cls.id === s.class_id).cls.program,
          s.class_id,
          now,
        ),
      );
    const context = {
      words: SAMPLE_WORDS,
      classes: classes.map((c) => c.cls),
      students,
    };
    const pool = SAMPLE_WORDS.filter((w) => w.subject === "Economics");
    const task = (
      title,
      program,
      subject,
      opens,
      closes,
      duration,
      mode,
      words,
      cls,
    ) =>
      taskData(
        owner,
        {
          title,
          program,
          subject,
          opensAt: new Date(opens).toISOString(),
          closesAt: new Date(closes).toISOString(),
          duration,
          mode,
          wordIds: words.map((w) => w.id),
          audience: "all",
          classIds: [cls],
        },
        context,
      );
    const past = task(
      "市场机制与经济决策",
      PROGRAMS[0],
      "Economics",
      now - 86400000,
      now + 60000,
      15,
      "mixed",
      pool.slice(0, 6),
      classes[0].cls.id,
    );
    past.task.closes_at = now - 3600000;
    past.task.created_at = now - 2 * 86400000;
    sql.push(
      statement(
        "INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        ...[
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
        ].map((k) => past.task[k]),
      ),
    );
    const questions = json(past.task.questions);
    students
      .filter((s) => s.class_id === classes[0].cls.id)
      .forEach((s, i) => {
        const answers = Object.fromEntries(
            questions.map((q, j) => [
              q.id,
              j < 6 - (i % 3) ? q.answer : "不确定",
            ]),
          ),
          result = mark(questions, answers);
        sql.push(
          statement(
            "INSERT INTO attempts(id,task_id,student_id,started_at,deadline,answers,submitted_at,score,result) VALUES(?,?,?,?,?,?,?,?,?)",
            id(),
            past.task.id,
            s.id,
            now - 7200000,
            now - 6300000,
            jsonString(answers),
            now - 6300000,
            result.score,
            jsonString(result),
          ),
        );
        for (const r of result.results.filter((r) => !r.correct)) {
          const q = questions.find((q) => q.id === r.questionId);
          sql.push(
            statement(
              "INSERT INTO mistakes(id,student_id,word_id,direction,question,next_review,last_answer) VALUES(?,?,?,?,?,?,?)",
              id(),
              s.id,
              q.wordId,
              q.direction,
              jsonString(q),
              now,
              r.submitted,
            ),
          );
        }
      });
    sql.push(
      task(
        "经济学 · 核心概念场景听写",
        PROGRAMS[0],
        "Economics",
        now - 60000,
        now + 86400000,
        15,
        "mixed",
        pool.slice(0, 6),
        classes[0].cls.id,
      ).sql,
    );
    sql.push(
      task(
        "数学 · 函数与统计词汇",
        PROGRAMS[1],
        "Mathematics",
        now + 3600000,
        now + 172800000,
        10,
        "choice",
        SAMPLE_WORDS.filter((w) => w.subject === "Mathematics"),
        classes[1].cls.id,
      ).sql,
    );
    await batch(sql);
    return {
      user: await newSession(
        await one("SELECT * FROM users WHERE id=?", owner),
        owner,
      ),
    };
  }
  async function api() {
    const path = url.pathname,
      method = request.method;
    if (method !== "GET") {
      if (
        !(request.headers.get("content-type") || "").startsWith(
          "application/json",
        )
      )
        fail(415, "请使用 JSON 请求。");
      const origin = request.headers.get("origin");
      if (origin && origin !== (env.PUBLIC_ORIGIN || url.origin))
        fail(403, "请求来源不匹配。");
    }
    if (path === "/api/config" && method === "GET")
      return {
        hosting: "cloudflare",
        masterAccount: MASTER_ACCOUNT,
        managementModel: MANAGEMENT_MODEL,
        programs: PROGRAMS,
        subjects: SUBJECTS,
        subjectNames: SUBJECT_NAMES,
        setupRequired: !(await one(
          "SELECT id FROM users WHERE role='teacher' AND demo=0",
        )),
        demoAvailable: allowDemo,
        serverTime: Date.now(),
      };
    if (path === "/api/demo" && method === "POST") {
      if (!allowDemo) fail(403, "此部署未开放演示。");
      await limited("demo", 10);
      return demoCreate();
    }
    if (path === "/api/setup" && method === "POST") {
      await limited("setup");
      const b = await body();
      if (await one("SELECT id FROM users WHERE role='teacher' AND demo=0"))
        fail(409, "Master 账号已建立，请使用 master 和密码登录。");
      if (!env.SETUP_KEY || env.SETUP_KEY.length < 24)
        fail(
          503,
          "请先在 Cloudflare 控制台为此应用设置 SETUP_KEY 密钥（至少 24 个字符）。",
        );
      if (!equal(await hash(b.setupKey || ""), await hash(env.SETUP_KEY)))
        fail(403, "设置密钥不正确，请向应用管理员核对 SETUP_KEY。");
      const password = required(b.password, "Master 密码", 200),
        className = required(b.className, "首个班级名称", 100);
      if (password.length < 10) fail(400, "密码至少需要 10 个字符。");
      const uid = id(),
        cls = classData(uid, { name: className, program: PROGRAMS[0] });
      await batch([
        statement(
          "INSERT INTO users(id,role,name,password,class_name,created_at) VALUES(?,'teacher',?,?,?,?)",
          uid,
          MASTER_NAME,
          await passwordHash(password),
          className,
          Date.now(),
        ),
        cls.sql,
      ]);
      return {
        user: await newSession(
          await one("SELECT * FROM users WHERE id=?", uid),
        ),
      };
    }
    if (path === "/api/student/activate" && method === "POST") {
      const b = await body(),
        invite = String(b.invite || "")
          .replace(/\s/g, "")
          .toUpperCase(),
        digest = await hash(invite);
      await limited(`activate:${digest}`);
      const s = await one(
        "SELECT * FROM users WHERE invite_hash=? AND role='student'",
        digest,
      );
      if (!s || s.name !== String(b.name || "").trim())
        fail(401, "姓名或学习码不正确，请向老师核对。");
      if (s.password) fail(409, "账号已开通，请使用账号和密码登录。");
      const username = required(b.username, "学生账号", 40).toLowerCase(),
        password = b.password;
      if (username === MASTER_ACCOUNT)
        fail(400, "master 为管理账号，请选择其他学生账号。");
      if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username))
        fail(400, "账号需为 3–40 位英文字母、数字、点、下划线或连字符。");
      if (
        typeof password !== "string" ||
        password.length < 10 ||
        password.length > 200 ||
        !password.trim()
      )
        fail(400, "密码需要 10–200 个字符。");
      const result = await run(
        "UPDATE users SET username=?,password=?,invite_hash=NULL WHERE id=? AND invite_hash=? AND password IS NULL",
        username,
        await passwordHash(password),
        s.id,
        digest,
      );
      if (!result.meta.changes)
        fail(409, "学习码已使用或已重置，请向老师核对。");
      await run("DELETE FROM sessions WHERE user_id=?", s.id);
      return {
        user: await newSession(
          await one("SELECT * FROM users WHERE id=?", s.id),
        ),
      };
    }
    if (path === "/api/login" && method === "POST") {
      const b = await body();
      await limited(
        `login:${await hash(
          String(
            b.role === "teacher"
              ? MASTER_ACCOUNT
              : b.username || b.invite || "",
          )
            .trim()
            .toLowerCase(),
        )}`,
      );
      if (typeof b.password === "string" && b.password.length > 200)
        fail(401, "账号或密码不正确。");
      let u;
      if (b.role === "teacher") {
        if (!isMasterLogin(b))
          fail(401, "管理账号为 master，请核对账号和密码。");
        u = await one("SELECT * FROM users WHERE role='teacher' AND demo=0");
        if (!u || !(await passwordOK(String(b.password || ""), u.password)))
          fail(401, "Master 账号或密码不正确。");
      } else if (b.username) {
        u = await one(
          "SELECT * FROM users WHERE username=? AND role='student'",
          String(b.username).trim().toLowerCase(),
        );
        if (!u || !(await passwordOK(String(b.password || ""), u.password)))
          fail(401, "学生账号或密码不正确。");
      } else {
        u = await one(
          "SELECT * FROM users WHERE invite_hash=? AND role='student'",
          await hash(
            String(b.invite || "")
              .replace(/\s/g, "")
              .toUpperCase(),
          ),
        );
        if (!u || u.password || u.name !== String(b.name || "").trim())
          fail(401, "姓名或学习码不正确，请向老师核对。");
      }
      return { user: await newSession(u) };
    }
    if (path === "/api/logout" && method === "POST") {
      const s = await getSession();
      if (s) await run("DELETE FROM sessions WHERE token_hash=?", s.token_hash);
      cookie("", 0);
      return { ok: true };
    }
    const session = await getSession(),
      u =
        session &&
        (await one("SELECT * FROM users WHERE id=?", session.user_id));
    if (!u) fail(401, "请先登录。");
    if (path === "/api/me" && method === "GET")
      return { user: await userInfo(u, session), serverTime: Date.now() };
    if (path === "/api/demo/switch" && method === "POST") {
      if (!session.demo_owner_id) fail(403, "仅演示账号可切换身份。");
      const b = await body(),
        target = b.studentId
          ? await one(
              "SELECT * FROM users WHERE id=? AND owner_id=? AND role='student'",
              b.studentId,
              session.demo_owner_id,
            )
          : await one(
              "SELECT * FROM users WHERE id=? AND demo=1",
              session.demo_owner_id,
            );
      if (!target) fail(404, "演示学生不存在。");
      await run("DELETE FROM sessions WHERE token_hash=?", session.token_hash);
      return { user: await newSession(target, session.demo_owner_id) };
    }
    if (path === "/api/words" && method === "GET") {
      teacher(u);
      return { words: await wordsFor(u.id) };
    }
    if (path === "/api/words" && method === "POST") {
      teacher(u);
      const b = await body(),
        rows = Array.isArray(b.words) ? b.words : [b];
      if (!rows.length || rows.length > 300)
        fail(400, "每批请导入 1–300 个词汇。");
      const words = rows.map(validateWord);
      await batch([
        bulk(
          "words",
          ["id", "owner_id", "content"],
          words.map((w) => [w.id, u.id, jsonString(w)]),
        ),
      ]);
      return { words };
    }
    if (path === "/api/classes" && method === "GET") {
      teacher(u);
      return {
        classes: await all(
          "SELECT c.*, (SELECT count(*) FROM users WHERE class_id=c.id) AS studentCount FROM classes c WHERE c.owner_id=? ORDER BY c.created_at",
          u.id,
        ),
      };
    }
    if (path === "/api/classes" && method === "POST") {
      teacher(u);
      const { cls, sql } = classData(u.id, await body());
      await batch([sql]);
      return { class: cls };
    }
    if (path === "/api/students" && method === "GET") {
      teacher(u);
      await sweep(u);
      return {
        students: await all(
          `SELECT u.id,u.name,u.program,u.class_id AS classId,u.username,u.password IS NOT NULL AS accountReady,u.created_at,
        (SELECT count(*) FROM attempts WHERE student_id=u.id AND submitted_at IS NOT NULL) AS attempts,
        (SELECT round(avg(score)) FROM attempts WHERE student_id=u.id AND submitted_at IS NOT NULL) AS average,
        (SELECT count(*) FROM mistakes WHERE student_id=u.id AND resolved=0) AS mistakes
        FROM users u WHERE u.owner_id=? AND u.role='student' ORDER BY u.created_at`,
          u.id,
        ),
      };
    }
    if (path === "/api/students" && method === "POST") {
      teacher(u);
      const b = await body(),
        rows = Array.isArray(b.students) ? b.students : [b];
      if (!rows.length || rows.length > 200)
        fail(400, "每批请添加 1–200 名学生。");
      const result = await studentData(u.id, rows);
      await batch(result.statements);
      return { students: result.students };
    }
    const reset = path.match(/^\/api\/students\/([^/]+)\/invite$/);
    if (reset && method === "POST") {
      teacher(u);
      if (
        !(await one(
          "SELECT id FROM users WHERE id=? AND owner_id=? AND role='student'",
          reset[1],
          u.id,
        ))
      )
        fail(404, "未找到学生。");
      const invite = token(9).toUpperCase();
      await batch([
        statement(
          "UPDATE users SET invite_hash=?,password=NULL WHERE id=?",
          await hash(invite),
          reset[1],
        ),
        statement("DELETE FROM sessions WHERE user_id=?", reset[1]),
      ]);
      return { invite };
    }
    if (
      (path === "/api/tasks" || path === "/api/tasks/batch") &&
      method === "POST"
    ) {
      teacher(u);
      const b = await body(),
        rows = path.endsWith("/batch") ? b.tasks : [b];
      if (!Array.isArray(rows) || !rows.length || rows.length > 30)
        fail(400, "连续发布支持 1–30 天。");
      const context = await taskContext(u.id),
        data = rows.map((t) => taskData(u.id, t, context));
      await batch(data.map((d) => d.sql));
      return path.endsWith("/batch")
        ? { tasks: data.map((d) => taskView(d.task)) }
        : { task: taskView(data[0].task) };
    }
    if (path === "/api/tasks" && method === "GET") {
      await sweep(u);
      const rows = await all(
        "SELECT * FROM tasks WHERE owner_id=? ORDER BY created_at DESC",
        u.role === "teacher" ? u.id : u.owner_id,
      );
      const tasks = [];
      if (u.role === "teacher") {
        const students = await all(
          "SELECT class_id FROM users WHERE owner_id=? AND role='student'",
          u.id,
        );
        const stats = await all(
          "SELECT a.task_id,count(*) AS submitted,round(avg(a.score)) AS average FROM attempts a JOIN tasks t ON a.task_id=t.id WHERE t.owner_id=? AND a.submitted_at IS NOT NULL GROUP BY a.task_id",
          u.id,
        );
        for (const t of rows) {
          const audience = json(t.audience);
          tasks.push({
            ...taskView(t),
            studentCount:
              audience === "all"
                ? students.filter((s) => json(t.class_ids).includes(s.class_id))
                    .length
                : audience.length,
            ...(stats.find((s) => s.task_id === t.id) || {
              submitted: 0,
              average: null,
            }),
          });
        }
      } else {
        const attempts = await all(
          "SELECT * FROM attempts WHERE student_id=?",
          u.id,
        );
        for (const t of rows.filter((t) => canTake(t, u))) {
          const a = attempts.find((a) => a.task_id === t.id);
          tasks.push({ ...taskView(t), attempt: a ? attemptView(a) : null });
        }
      }
      return { tasks, serverTime: Date.now() };
    }
    const start = path.match(/^\/api\/tasks\/([^/]+)\/start$/);
    if (start && method === "POST") {
      student(u);
      const t = await one("SELECT * FROM tasks WHERE id=?", start[1]);
      if (!t || !canTake(t, u)) fail(404, "未找到分配给你的任务。");
      let a = await one(
        "SELECT * FROM attempts WHERE task_id=? AND student_id=?",
        t.id,
        u.id,
      );
      const now = Date.now();
      if (!a) {
        if (now < t.opens_at) fail(409, "任务尚未开始。");
        if (now >= t.closes_at) fail(409, "任务已经截止。");
        await run(
          "INSERT INTO attempts(id,task_id,student_id,started_at,deadline) VALUES(?,?,?,?,?) ON CONFLICT(task_id,student_id) DO NOTHING",
          id(),
          t.id,
          u.id,
          now,
          Math.min(now + t.duration * 60000, t.closes_at),
        );
        a = await one(
          "SELECT * FROM attempts WHERE task_id=? AND student_id=?",
          t.id,
          u.id,
        );
      }
      const attempt =
        !a.submitted_at && a.deadline <= Date.now()
          ? await finalize(a, json(a.answers), true)
          : attemptView(a);
      return {
        attempt,
        questions: attempt.submittedAt
          ? []
          : json(t.questions).map(publicQuestion),
        task: taskView(t),
        serverTime: Date.now(),
      };
    }
    const attemptRoute = path.match(/^\/api\/attempts\/([^/]+)(\/submit)?$/);
    if (attemptRoute && (method === "PATCH" || method === "POST")) {
      student(u);
      const a = await one(
        "SELECT * FROM attempts WHERE id=? AND student_id=?",
        attemptRoute[1],
        u.id,
      );
      if (!a) fail(404, "未找到答题记录。");
      if (a.submitted_at)
        return { attempt: attemptView(a), expired: !!a.timed_out };
      if (Date.now() >= a.deadline)
        return {
          attempt: await finalize(a, json(a.answers), true),
          expired: true,
        };
      const b = await body(),
        t = await one("SELECT questions FROM tasks WHERE id=?", a.task_id),
        answers = answerObject(b.answers, json(t.questions));
      if (attemptRoute[2] && method === "POST")
        return { attempt: await finalize(a, answers) };
      if (method !== "PATCH" || attemptRoute[2]) fail(405, "请求方法不正确。");
      const saved = await run(
        "UPDATE attempts SET answers=? WHERE id=? AND submitted_at IS NULL AND deadline>?",
        jsonString(answers),
        a.id,
        Date.now(),
      );
      if (!saved.meta.changes) {
        const current = await one("SELECT * FROM attempts WHERE id=?", a.id);
        return {
          attempt: await finalize(current, json(current.answers), true),
          expired: true,
        };
      }
      return { savedAt: Date.now(), serverTime: Date.now() };
    }
    if (path === "/api/results" && method === "GET") {
      teacher(u);
      await sweep(u);
      const taskId = url.searchParams.get("task");
      const tasks = await all("SELECT * FROM tasks WHERE owner_id=?", u.id),
        students = await all(
          "SELECT u.id,u.name,u.class_id AS classId,c.name AS className FROM users u JOIN classes c ON c.id=u.class_id WHERE u.owner_id=? AND u.role='student'",
          u.id,
        );
      const attempts = await all(
        "SELECT a.* FROM attempts a JOIN tasks t ON a.task_id=t.id WHERE t.owner_id=?",
        u.id,
      );
      const results = [];
      for (const t of tasks.filter((t) => !taskId || t.id === taskId)) {
        const audience = json(t.audience);
        for (const s of students.filter(
          (s) =>
            json(t.class_ids).includes(s.classId) &&
            (audience === "all" || audience.includes(s.id)),
        )) {
          const a = attempts.find(
            (a) => a.task_id === t.id && a.student_id === s.id,
          );
          results.push({
            taskId: t.id,
            taskTitle: t.title,
            subject: t.subject,
            program: t.program,
            studentId: s.id,
            name: s.name,
            classId: s.classId,
            className: s.className,
            state: a?.submitted_at
              ? "submitted"
              : a
                ? "in_progress"
                : Date.now() >= t.closes_at
                  ? "missing"
                  : "pending",
            score: a?.score ?? null,
            submittedAt: a?.submitted_at ?? null,
            timedOut: !!a?.timed_out,
            result: a?.result ? json(a.result) : null,
          });
        }
      }
      return { results };
    }
    if (path === "/api/mistakes" && method === "GET") {
      student(u);
      await sweep(u);
      return {
        mistakes: (
          await all(
            "SELECT * FROM mistakes WHERE student_id=? ORDER BY resolved,next_review",
            u.id,
          )
        ).map((m) => ({
          id: m.id,
          question: json(m.question),
          errorCount: m.error_count,
          streak: m.streak,
          nextReview: m.next_review,
          lastAnswer: m.last_answer,
          resolved: !!m.resolved,
        })),
      };
    }
    const review = path.match(/^\/api\/mistakes\/([^/]+)\/review$/);
    if (review && method === "POST") {
      student(u);
      const m = await one(
        "SELECT * FROM mistakes WHERE id=? AND student_id=?",
        review[1],
        u.id,
      );
      if (!m) fail(404, "未找到错题。");
      if (m.next_review > Date.now())
        fail(409, "本次复习已完成，请到下次复习时间再作答。");
      const b = await body(),
        q = json(m.question),
        answer = required(b.answer, "答案", 2000),
        correct = isCorrect(answer, q.accepted),
        streak = correct ? m.streak + 1 : 0;
      const nextReview =
        Date.now() +
        (correct ? [1, 3, 7][Math.min(streak - 1, 2)] * 86400000 : 600000);
      const r = await run(
        "UPDATE mistakes SET streak=?,next_review=?,last_answer=?,resolved=?,error_count=error_count+? WHERE id=? AND next_review<=?",
        streak,
        nextReview,
        answer,
        streak >= 3 ? 1 : 0,
        correct ? 0 : 1,
        m.id,
        Date.now(),
      );
      if (!r.meta.changes)
        fail(409, "本次复习已完成，请到下次复习时间再作答。");
      return {
        correct,
        answer: q.answer,
        streak,
        nextReview,
        resolved: streak >= 3,
      };
    }
    fail(404, "未找到该接口。");
  }
  return { api, sweep };
}
export default {
  async fetch(request, env) {
    if (!new URL(request.url).pathname.startsWith("/api/"))
      return env.ASSETS.fetch(request);
    const headers = new Headers(SECURITY);
    try {
      return new Response(
        jsonString(await service(env, request, headers).api()),
        { headers },
      );
    } catch (e) {
      // Never log SQL arguments, request bodies, cookies or credentials.
      let status = e.status || 500;
      if (status === 500 && /UNIQUE constraint failed/.test(e.message || ""))
        status = 409;
      return new Response(
        jsonString({
          error:
            status === 409 && !e.status
              ? "账号或记录已存在，请刷新后重试。"
              : status === 500
                ? "服务器遇到问题，请稍后重试。"
                : e.message,
        }),
        { status, headers },
      );
    }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(service(env).sweep());
  },
};
