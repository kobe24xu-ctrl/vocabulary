import { validateCourses } from "./lib/courses.mjs";
import {
  normalizeUsername,
  validStudentUsername,
  validNewPassword,
} from "./lib/accounts.mjs";
import {
  MASTER_ACCOUNT,
  MASTER_NAME,
  MANAGEMENT_MODEL,
  isMasterLogin,
} from "./lib/master.mjs";
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SAMPLE_WORDS,
  PROGRAMS,
  SUBJECTS,
  SUBJECT_NAMES,
} from "./lib/words.mjs";
import {
  buildQuestions,
  publicQuestion,
  mark,
  isCorrect,
} from "./lib/domain.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(process.env.DATA_DIR || join(ROOT, "data"));
mkdirSync(DATA, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(join(DATA, "lexiclass.sqlite"));
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,role TEXT NOT NULL,name TEXT NOT NULL,email TEXT UNIQUE,password TEXT,invite_hash TEXT UNIQUE,owner_id TEXT REFERENCES users(id),class_name TEXT,program TEXT,class_id TEXT REFERENCES classes(id),demo INTEGER DEFAULT 0,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS classes(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,program TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL,demo_owner_id TEXT);
CREATE TABLE IF NOT EXISTS words(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),content TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,program TEXT NOT NULL,subject TEXT NOT NULL,opens_at INTEGER NOT NULL,closes_at INTEGER NOT NULL,duration INTEGER NOT NULL,audience TEXT NOT NULL,questions TEXT NOT NULL,created_at INTEGER NOT NULL,class_ids TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,task_id TEXT NOT NULL REFERENCES tasks(id),student_id TEXT NOT NULL REFERENCES users(id),started_at INTEGER NOT NULL,deadline INTEGER NOT NULL,answers TEXT NOT NULL DEFAULT '{}',submitted_at INTEGER,score INTEGER,result TEXT,timed_out INTEGER DEFAULT 0,UNIQUE(task_id,student_id));
CREATE TABLE IF NOT EXISTS mistakes(id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES users(id),word_id TEXT NOT NULL,direction TEXT NOT NULL,question TEXT NOT NULL,error_count INTEGER NOT NULL DEFAULT 1,streak INTEGER NOT NULL DEFAULT 0,next_review INTEGER NOT NULL,last_answer TEXT NOT NULL,resolved INTEGER NOT NULL DEFAULT 0,UNIQUE(student_id,word_id,direction));
CREATE INDEX IF NOT EXISTS tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS attempts_student ON attempts(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS one_formal_teacher ON users(role) WHERE role='teacher' AND demo=0;
`);
const one = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
// Additive migration: preserve existing students, attempts and mistake records.
if (
  !all("PRAGMA table_info(users)").some((column) => column.name === "username")
)
  db.exec("ALTER TABLE users ADD COLUMN username TEXT");
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users(username) WHERE username IS NOT NULL",
);
if (
  !all("PRAGMA table_info(users)").some(
    (column) => column.name === "initial_password",
  )
)
  db.exec(
    "ALTER TABLE users ADD COLUMN initial_password INTEGER NOT NULL DEFAULT 0",
  );
db.exec(
  "CREATE TABLE IF NOT EXISTS class_courses(class_id TEXT NOT NULL REFERENCES classes(id),subject TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL DEFAULT '',source TEXT NOT NULL DEFAULT '',PRIMARY KEY(class_id,subject))",
);
const hash = (v) => createHash("sha256").update(String(v)).digest("hex");
const token = () => randomBytes(24).toString("hex");
const id = () => randomUUID();
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const required = (v, label, max = 300) => {
  if (typeof v !== "string" || !v.trim() || v.trim().length > max)
    fail(400, `${label}不能为空，且长度不能超过 ${max} 个字符。`);
  return v.trim();
};
const json = (v) => JSON.parse(v);
const passwordHash = (p) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
};
const passwordOK = (p, h) => {
  if (!h) return false;
  const [salt, digest] = h.split(":");
  const a = scryptSync(p, salt, 64);
  const b = Buffer.from(digest, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
};
const setupFile = join(DATA, "setup-key");
if (
  !one("SELECT id FROM users WHERE role='teacher' AND demo=0") &&
  !existsSync(setupFile)
)
  writeFileSync(setupFile, token(), { mode: 0o600, flag: "wx" });
const allowDemo =
  process.env.ALLOW_DEMO === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEMO !== "false");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
function userInfo(u, session) {
  return {
    id: u.id,
    role: u.role,
    name:
      u.role === "teacher"
        ? session?.demo_owner_id
          ? "演示 Master"
          : MASTER_NAME
        : u.name,
    className:
      u.role === "teacher"
        ? u.class_name
        : one("SELECT name FROM classes WHERE id=?", u.class_id)?.name,
    program: u.program,
    classId: u.class_id,
    username: u.role === "teacher" ? MASTER_ACCOUNT : u.username,
    initialPassword: u.role === "student" && !!u.initial_password,
    isDemo: !!session?.demo_owner_id,
  };
}
function cookie(req, res, value, age = 604800) {
  const secure = process.env.PUBLIC_ORIGIN?.startsWith("https://");
  res.setHeader(
    "Set-Cookie",
    `lexiclass=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`,
  );
}
function newSession(req, res, user, demoOwner = null) {
  const raw = token();
  run(
    "INSERT INTO sessions VALUES(?,?,?,?)",
    hash(raw),
    user.id,
    Date.now() + 7 * 86400000,
    demoOwner,
  );
  cookie(req, res, raw);
  return userInfo(user, { demo_owner_id: demoOwner });
}
function getSession(req) {
  const raw = (req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("lexiclass="))
    ?.slice(10);
  return raw
    ? one(
        "SELECT * FROM sessions WHERE token_hash=? AND expires_at>?",
        hash(raw),
        Date.now(),
      )
    : null;
}
function auth(req, role) {
  const session = getSession(req);
  const user =
    session && one("SELECT * FROM users WHERE id=?", session.user_id);
  if (!user) fail(401, "请先登录。");
  if (role && user.role !== role) fail(403, "当前身份无权执行此操作。");
  return { user, session };
}
function classViews(owner) {
  const classes = all(
    "SELECT c.*, (SELECT count(*) FROM users WHERE class_id=c.id) AS studentCount FROM classes c WHERE c.owner_id=? ORDER BY c.created_at",
    owner,
  );
  const courses = all(
    "SELECT cc.* FROM class_courses cc JOIN classes c ON cc.class_id=c.id WHERE c.owner_id=?",
    owner,
  );
  return classes.map((c) => ({
    ...c,
    courses: courses
      .filter((row) => row.class_id === c.id)
      .map(({ class_id, ...course }) => course),
  }));
}
function wordsFor(owner) {
  return [
    ...SAMPLE_WORDS,
    ...all("SELECT content FROM words WHERE owner_id=?", owner).map((r) =>
      json(r.content),
    ),
  ];
}
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
function classCreate(owner, raw) {
  const name = required(raw.name, "班级名称", 100),
    program = raw.program;
  if (!PROGRAMS.includes(program)) fail(400, "请选择有效课程项目。");
  const cid = id();
  run(
    "INSERT INTO classes VALUES(?,?,?,?,?)",
    cid,
    owner,
    name,
    program,
    Date.now(),
  );
  return { id: cid, name, program };
}
function studentCreate(owner, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    fail(400, "学生格式不正确。");
  const name = required(raw.name, "学生姓名", 60);
  const cls = one(
    "SELECT * FROM classes WHERE id=? AND owner_id=?",
    raw.classId,
    owner,
  );
  if (!cls) fail(400, "请选择有效班级。");
  if (
    one(
      "SELECT id FROM users WHERE class_id=? AND name=? AND role='student'",
      cls.id,
      name,
    )
  )
    fail(409, "该班级已有同名学生，请补充学号或姓名标识。");
  const studentId = id(),
    invite = randomBytes(9).toString("hex").toUpperCase();
  run(
    "INSERT INTO users(id,role,name,invite_hash,owner_id,program,class_id,created_at) VALUES(?,?,?,?,?,?,?,?)",
    studentId,
    "student",
    name,
    hash(invite),
    owner,
    cls.program,
    cls.id,
    Date.now(),
  );
  return { id: studentId, name, program: cls.program, classId: cls.id, invite };
}
function taskCreate(owner, b) {
  const title = required(b.title, "任务名称", 120);
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
  const pool = wordsFor(owner).filter(
    (w) =>
      w.subject === b.subject &&
      (w.program === "通用示例" || w.program === b.program),
  );
  if (!Array.isArray(b.wordIds) || !b.wordIds.length || b.wordIds.length > 100)
    fail(400, "每份任务请选择 1–100 个词汇。");
  const selected = [...new Set(b.wordIds)].map((wid) =>
    pool.find((w) => w.id === wid),
  );
  if (selected.some((w) => !w)) fail(400, "存在不属于该科目或课程的词汇。");
  if (!Array.isArray(b.classIds) || b.classIds.length > 100)
    fail(400, "请选择 1–100 个班级。");
  const classIds = [...new Set(b.classIds)];
  if (
    !classIds.length ||
    classIds.some(
      (cid) =>
        !one(
          "SELECT id FROM classes WHERE id=? AND owner_id=? AND program=?",
          cid,
          owner,
          b.program,
        ),
    )
  )
    fail(400, "请选择当前项目下的有效班级。");
  if (
    classIds.some((cid) => {
      const courses = all(
        "SELECT subject FROM class_courses WHERE class_id=?",
        cid,
      );
      return courses.length && !courses.some((c) => c.subject === b.subject);
    })
  )
    fail(400, "所选科目未配置给该班级，请先调整班级课程。");
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
          !one(
            "SELECT id,class_id FROM users WHERE id=? AND owner_id=? AND role='student'",
            sid,
            owner,
          ),
      )
    )
      fail(400, "所选学生不属于当前教师。");
    if (
      audience.some(
        (sid) =>
          !classIds.includes(
            one("SELECT class_id FROM users WHERE id=?", sid).class_id,
          ),
      )
    )
      fail(400, "所选学生不属于指定班级。");
  }
  const questions = buildQuestions(selected, b.mode, pool);
  const tid = id();
  run(
    "INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    tid,
    owner,
    title,
    b.program,
    b.subject,
    opens,
    closes,
    duration,
    jsonString(audience),
    jsonString(questions),
    Date.now(),
    jsonString(classIds),
  );
  return taskView(one("SELECT * FROM tasks WHERE id=?", tid));
}
const jsonString = JSON.stringify;
const canTake = (task, u) =>
  task.owner_id === u.owner_id &&
  json(task.class_ids).includes(u.class_id) &&
  (json(task.audience) === "all" || json(task.audience).includes(u.id));
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
function finalize(attempt, answers, timedOut = false) {
  if (attempt.submitted_at) return attemptView(attempt);
  const t = one("SELECT * FROM tasks WHERE id=?", attempt.task_id),
    qs = json(t.questions),
    result = mark(qs, answers),
    now = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    run(
      "UPDATE attempts SET answers=?,submitted_at=?,score=?,result=?,timed_out=? WHERE id=?",
      jsonString(answers),
      now,
      result.score,
      jsonString(result),
      timedOut ? 1 : 0,
      attempt.id,
    );
    for (const r of result.results) {
      if (r.correct) continue;
      const q = qs.find((q) => q.id === r.questionId);
      run(
        `INSERT INTO mistakes(id,student_id,word_id,direction,question,error_count,streak,next_review,last_answer,resolved) VALUES(?,?,?,?,?,1,0,?,?,0) ON CONFLICT(student_id,word_id,direction) DO UPDATE SET error_count=error_count+1,streak=0,next_review=excluded.next_review,last_answer=excluded.last_answer,resolved=0,question=excluded.question`,
        id(),
        attempt.student_id,
        q.wordId,
        q.direction,
        jsonString(q),
        now,
        r.submitted,
      );
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return attemptView(one("SELECT * FROM attempts WHERE id=?", attempt.id));
}
function sweep() {
  for (const a of all(
    "SELECT * FROM attempts WHERE submitted_at IS NULL AND deadline<=?",
    Date.now(),
  ))
    finalize(a, json(a.answers), true);
  run("DELETE FROM sessions WHERE expires_at<?", Date.now());
}
setInterval(() => {
  try {
    sweep();
  } catch (e) {
    console.error("Deadline processing failed:", e.message);
  }
}, 5000).unref();
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
function demoCreate(req, res) {
  const owner = id();
  run(
    "INSERT INTO users(id,role,name,email,class_name,demo,created_at) VALUES(?,?,?,?,?,1,?)",
    owner,
    "teacher",
    "林老师",
    `demo-${owner}@example.invalid`,
    "国际预科教学中心",
    Date.now(),
  );
  const classes = PROGRAMS.map((program, i) =>
    classCreate(owner, {
      name: ["UNSW 商科 A 班", "NCUK 国际预科 1 班", "UOW 商科 B 班"][i],
      program,
    }),
  );
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
  const students = names.map((name, i) =>
    studentCreate(owner, { name, classId: classes[i % 3].id }),
  );
  const now = Date.now(),
    pool = SAMPLE_WORDS.filter((w) => w.subject === "Economics");
  const tid = id();
  const qs = buildQuestions(pool.slice(0, 6), "mixed", pool);
  run(
    "INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    tid,
    owner,
    "市场机制与经济决策",
    PROGRAMS[0],
    "Economics",
    now - 86400000,
    now - 3600000,
    15,
    '"all"',
    jsonString(qs),
    now - 2 * 86400000,
    jsonString([classes[0].id]),
  );
  students
    .filter((s) => s.classId === classes[0].id)
    .forEach((s, i) => {
      const aid = id(),
        answers = Object.fromEntries(
          qs.map((q, j) => [q.id, j < 6 - (i % 3) ? q.answer : "不确定"]),
        );
      run(
        "INSERT INTO attempts(id,task_id,student_id,started_at,deadline) VALUES(?,?,?,?,?)",
        aid,
        tid,
        s.id,
        now - 7200000,
        now - 6300000,
      );
      finalize(one("SELECT * FROM attempts WHERE id=?", aid), answers);
    });
  taskCreate(owner, {
    title: "经济学 · 核心概念场景听写",
    program: PROGRAMS[0],
    subject: "Economics",
    opensAt: new Date(now - 60000).toISOString(),
    closesAt: new Date(now + 86400000).toISOString(),
    duration: 15,
    mode: "mixed",
    wordIds: pool.slice(0, 6).map((w) => w.id),
    audience: "all",
    classIds: [classes[0].id],
  });
  taskCreate(owner, {
    title: "数学 · 函数与统计词汇",
    program: PROGRAMS[1],
    subject: "Mathematics",
    opensAt: new Date(now + 3600000).toISOString(),
    closesAt: new Date(now + 2 * 86400000).toISOString(),
    duration: 10,
    mode: "choice",
    wordIds: SAMPLE_WORDS.filter((w) => w.subject === "Mathematics").map(
      (w) => w.id,
    ),
    audience: "all",
    classIds: [classes[1].id],
  });
  return {
    user: newSession(
      req,
      res,
      one("SELECT * FROM users WHERE id=?", owner),
      owner,
    ),
  };
}
const rate = new Map();
function limited(req, scope) {
  const now = Date.now(),
    key = `${req.socket.remoteAddress}:${scope}`;
  let item = rate.get(key);
  if (!item || item.until < now) {
    item = { count: 0, until: now + 900000 };
    rate.set(key, item);
  }
  if (++item.count > 20) fail(429, "尝试次数过多，请 15 分钟后再试。");
  if (rate.size > 10000)
    for (const [k, v] of rate) if (v.until < now) rate.delete(k);
}
async function body(req) {
  if (!(req.headers["content-type"] || "").startsWith("application/json"))
    fail(415, "请使用 JSON 请求。");
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) fail(413, "请求过大，请分批导入。");
  }
  let result;
  try {
    result = JSON.parse(raw || "{}");
  } catch {
    fail(400, "JSON 格式错误。");
  }
  if (!result || typeof result !== "object" || Array.isArray(result))
    fail(400, "请求必须是 JSON 对象。");
  return result;
}
async function api(req, res, url) {
  const path = url.pathname,
    method = req.method;
  if (method !== "GET") {
    if (!(req.headers["content-type"] || "").startsWith("application/json"))
      fail(415, "请使用 JSON 请求。");
    const origin = req.headers.origin;
    const expected = process.env.PUBLIC_ORIGIN || `http://${req.headers.host}`;
    if (origin && origin !== expected)
      fail(403, "请求来源不匹配，请检查 PUBLIC_ORIGIN 设置。");
  }
  if (path === "/api/config" && method === "GET")
    return {
      masterAccount: MASTER_ACCOUNT,
      managementModel: MANAGEMENT_MODEL,
      programs: PROGRAMS,
      subjects: SUBJECTS,
      subjectNames: SUBJECT_NAMES,
      setupRequired: !one(
        "SELECT id FROM users WHERE role='teacher' AND demo=0",
      ),
      demoAvailable: allowDemo,
      serverTime: Date.now(),
    };
  if (path === "/api/demo" && method === "POST") {
    if (!allowDemo) fail(403, "此部署未开放演示。");
    limited(req, "demo");
    return demoCreate(req, res);
  }
  if (path === "/api/setup" && method === "POST") {
    limited(req, "setup");
    const b = await body(req);
    if (one("SELECT id FROM users WHERE role='teacher' AND demo=0"))
      fail(409, "Master 账号已建立，请使用 master 和密码登录。");
    const key = existsSync(setupFile)
      ? readFileSync(setupFile, "utf8").trim()
      : "";
    if (!key || hash(b.setupKey || "") !== hash(key))
      fail(403, "设置密钥不正确，请由服务器管理员从 data/setup-key 获取。");
    const pass = required(b.password, "Master 密码", 200),
      className = required(b.className, "首个班级名称", 100);
    if (pass.length < 10) fail(400, "密码至少需要 10 个字符。");
    const uid = id();
    run(
      "INSERT INTO users(id,role,name,password,class_name,created_at) VALUES(?,?,?,?,?,?)",
      uid,
      "teacher",
      MASTER_NAME,
      passwordHash(pass),
      className,
      Date.now(),
    );
    classCreate(uid, { name: className, program: PROGRAMS[0] });
    return {
      user: newSession(req, res, one("SELECT * FROM users WHERE id=?", uid)),
    };
  }
  if (path === "/api/student/activate" && method === "POST") {
    const b = await body(req);
    const invite = String(b.invite || "")
      .replace(/\s/g, "")
      .toUpperCase();
    limited(req, `activate:${hash(invite)}`);
    const student = one(
      "SELECT * FROM users WHERE invite_hash=? AND role='student'",
      hash(invite),
    );
    if (!student || student.name !== String(b.name || "").trim())
      fail(401, "姓名或学习码不正确，请向老师核对。");
    if (student.password) fail(409, "账号已开通，请使用账号和密码登录。");
    const username = normalizeUsername(required(b.username, "学生账号", 60));
    if (username === MASTER_ACCOUNT)
      fail(400, "master 为管理账号，请选择其他学生账号。");
    if (!validStudentUsername(username))
      fail(
        400,
        "账号支持学生姓名、英文、数字、点、下划线或连字符，最多 60 个字符。",
      );
    const password = b.password;
    if (
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 200 ||
      !password.trim()
    )
      fail(400, "密码需要 10–200 个字符。");
    if (
      one(
        "SELECT id FROM users WHERE username=? AND id<>?",
        username,
        student.id,
      )
    )
      fail(409, "该账号已被使用，请选择其他账号。");
    run(
      "UPDATE users SET username=?,password=?,invite_hash=NULL,initial_password=0 WHERE id=?",
      username,
      passwordHash(password),
      student.id,
    );
    run("DELETE FROM sessions WHERE user_id=?", student.id);
    return {
      user: newSession(
        req,
        res,
        one("SELECT * FROM users WHERE id=?", student.id),
      ),
    };
  }
  if (path === "/api/login" && method === "POST") {
    const b = await body(req);
    const identity =
      b.role === "teacher"
        ? MASTER_ACCOUNT
        : b.username
          ? normalizeUsername(b.username)
          : String(b.invite || "")
              .replace(/\s/g, "")
              .toUpperCase();
    limited(req, `login:${hash(identity)}`);
    if (typeof b.password === "string" && b.password.length > 200)
      fail(401, "账号或密码不正确。");
    let u;
    if (b.role === "teacher") {
      if (!isMasterLogin(b)) fail(401, "管理账号为 master，请核对账号和密码。");
      u = one("SELECT * FROM users WHERE role='teacher' AND demo=0");
      if (!u || !passwordOK(String(b.password || ""), u.password))
        fail(401, "Master 账号或密码不正确。");
    } else if (b.username) {
      u = one(
        "SELECT * FROM users WHERE username=? AND role='student'",
        normalizeUsername(b.username),
      );
      if (!u || !passwordOK(String(b.password || ""), u.password))
        fail(401, "学生账号或密码不正确。");
    } else {
      u = one(
        "SELECT * FROM users WHERE invite_hash=? AND role='student'",
        hash(
          String(b.invite || "")
            .replace(/\s/g, "")
            .toUpperCase(),
        ),
      );
      if (!u || u.name !== String(b.name || "").trim())
        fail(401, "姓名或学习码不正确，请向老师核对。");
    }
    return { user: newSession(req, res, u) };
  }
  if (path === "/api/logout" && method === "POST") {
    const s = getSession(req);
    if (s) run("DELETE FROM sessions WHERE token_hash=?", s.token_hash);
    cookie(req, res, "", 0);
    return { ok: true };
  }
  const { user: u, session } = auth(req);
  sweep();
  if (path === "/api/account/password" && method === "POST") {
    if (u.role !== "student") fail(403, "请使用学生账号。");
    limited(req, `password:${u.id}`);
    const b = await body(req);
    if (
      typeof b.currentPassword !== "string" ||
      b.currentPassword.length > 200 ||
      !passwordOK(b.currentPassword, u.password)
    )
      fail(403, "当前密码不正确。");
    if (!validNewPassword(b.newPassword))
      fail(400, "新密码需要 10–200 个字符。");
    const next = passwordHash(b.newPassword);
    const changed = run(
      "UPDATE users SET password=?,initial_password=0,invite_hash=NULL WHERE id=? AND password=?",
      next,
      u.id,
      u.password,
    );
    if (!changed.changes) fail(409, "账号状态已变化，请重新登录后操作。");
    run("DELETE FROM sessions WHERE user_id=?", u.id);
    return {
      user: newSession(
        req,
        res,
        one("SELECT * FROM users WHERE id=?", u.id),
        session.demo_owner_id,
      ),
      ok: true,
    };
  }
  const courseRoute = path.match(/^\/api\/classes\/([^/]+)\/courses$/);
  if (courseRoute && method === "PUT") {
    if (
      u.role !== "teacher" ||
      !one(
        "SELECT id FROM classes WHERE id=? AND owner_id=?",
        courseRoute[1],
        u.id,
      )
    )
      fail(404, "未找到班级。");
    const b = await body(req),
      courses = validateCourses(b.courses);
    db.exec("BEGIN");
    try {
      run("DELETE FROM class_courses WHERE class_id=?", courseRoute[1]);
      for (const c of courses)
        run(
          "INSERT INTO class_courses VALUES(?,?,?,?,?)",
          courseRoute[1],
          c.subject,
          c.title,
          c.content,
          c.source,
        );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { courses };
  }
  if (path === "/api/me" && method === "GET")
    return { user: userInfo(u, session), serverTime: Date.now() };
  if (path === "/api/demo/switch" && method === "POST") {
    if (!session.demo_owner_id) fail(403, "仅演示账号可切换身份。");
    const b = await body(req),
      target = b.studentId
        ? one(
            "SELECT * FROM users WHERE id=? AND owner_id=? AND role='student'",
            b.studentId,
            session.demo_owner_id,
          )
        : one(
            "SELECT * FROM users WHERE id=? AND demo=1",
            session.demo_owner_id,
          );
    if (!target) fail(404, "演示学生不存在。");
    run("DELETE FROM sessions WHERE token_hash=?", session.token_hash);
    return { user: newSession(req, res, target, session.demo_owner_id) };
  }
  if (path === "/api/words" && method === "GET") {
    if (u.role !== "teacher") fail(403, "词库仅供教师管理。");
    return { words: wordsFor(u.id) };
  }
  if (path === "/api/words" && method === "POST") {
    if (u.role !== "teacher") fail(403, "仅教师可录入词汇。");
    const b = await body(req),
      rows = Array.isArray(b.words) ? b.words : [b];
    if (!rows.length || rows.length > 300)
      fail(400, "每批请导入 1–300 个词汇。");
    const words = rows.map(validateWord);
    db.exec("BEGIN");
    try {
      for (const w of words)
        run("INSERT INTO words VALUES(?,?,?)", w.id, u.id, jsonString(w));
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { words };
  }
  if (path === "/api/classes" && method === "GET") {
    if (u.role !== "teacher") fail(403, "仅教师可查看班级。");
    return { classes: classViews(u.id) };
  }
  if (path === "/api/classes" && method === "POST") {
    if (u.role !== "teacher") fail(403, "仅教师可创建班级。");
    return { class: classCreate(u.id, await body(req)) };
  }
  if (path === "/api/students" && method === "GET") {
    if (u.role !== "teacher") fail(403, "仅教师可查看名单。");
    return {
      students: all(
        "SELECT id,name,program,class_id AS classId,username,password IS NOT NULL AS accountReady,created_at FROM users WHERE owner_id=? AND role='student' ORDER BY created_at",
        u.id,
      ).map((s) => ({
        ...s,
        attempts: one(
          "SELECT count(*) AS n FROM attempts WHERE student_id=? AND submitted_at IS NOT NULL",
          s.id,
        ).n,
        average: one(
          "SELECT round(avg(score)) AS n FROM attempts WHERE student_id=? AND submitted_at IS NOT NULL",
          s.id,
        ).n,
        mistakes: one(
          "SELECT count(*) AS n FROM mistakes WHERE student_id=? AND resolved=0",
          s.id,
        ).n,
      })),
    };
  }
  if (path === "/api/students" && method === "POST") {
    if (u.role !== "teacher") fail(403, "仅教师可添加学生。");
    const b = await body(req),
      rows = Array.isArray(b.students) ? b.students : [b];
    if (!rows.length || rows.length > 200)
      fail(400, "每批请添加 1–200 名学生。");
    db.exec("BEGIN");
    try {
      const students = rows.map((s) => studentCreate(u.id, s));
      db.exec("COMMIT");
      return { students };
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  const reset = path.match(/^\/api\/students\/([^/]+)\/invite$/);
  if (reset && method === "POST") {
    if (
      u.role !== "teacher" ||
      !one("SELECT id FROM users WHERE id=? AND owner_id=?", reset[1], u.id)
    )
      fail(404, "未找到学生。");
    const invite = randomBytes(9).toString("hex").toUpperCase();
    run(
      "UPDATE users SET invite_hash=?,password=NULL,initial_password=0 WHERE id=?",
      hash(invite),
      reset[1],
    );
    run("DELETE FROM sessions WHERE user_id=?", reset[1]);
    return { invite };
  }
  if (path === "/api/tasks/batch" && method === "POST") {
    if (u.role !== "teacher") fail(403, "仅教师可发布任务。");
    const b = await body(req);
    if (!Array.isArray(b.tasks) || !b.tasks.length || b.tasks.length > 30)
      fail(400, "连续发布支持 1–30 天。");
    db.exec("BEGIN");
    try {
      const tasks = b.tasks.map((t) => taskCreate(u.id, t));
      db.exec("COMMIT");
      return { tasks };
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  if (path === "/api/tasks" && method === "POST") {
    if (u.role !== "teacher") fail(403, "仅教师可发布任务。");
    return { task: taskCreate(u.id, await body(req)) };
  }
  if (path === "/api/tasks" && method === "GET") {
    const tasks = all(
      "SELECT * FROM tasks WHERE owner_id=? ORDER BY created_at DESC",
      u.role === "teacher" ? u.id : u.owner_id,
    )
      .filter((t) => u.role === "teacher" || canTake(t, u))
      .map((t) => {
        const view = taskView(t);
        if (u.role === "student") {
          const a = one(
            "SELECT * FROM attempts WHERE task_id=? AND student_id=?",
            t.id,
            u.id,
          );
          return { ...view, attempt: a ? attemptView(a) : null };
        }
        const audience = json(t.audience);
        const total =
          audience === "all"
            ? all(
                "SELECT class_id FROM users WHERE owner_id=? AND role='student'",
                u.id,
              ).filter((s) => json(t.class_ids).includes(s.class_id)).length
            : audience.length;
        const stats = one(
          "SELECT count(*) AS submitted,round(avg(score)) AS average FROM attempts WHERE task_id=? AND submitted_at IS NOT NULL",
          t.id,
        );
        return { ...view, studentCount: total, ...stats };
      });
    return { tasks, serverTime: Date.now() };
  }
  const start = path.match(/^\/api\/tasks\/([^/]+)\/start$/);
  if (start && method === "POST") {
    if (u.role !== "student") fail(403, "请使用学生账号答题。");
    const t = one("SELECT * FROM tasks WHERE id=?", start[1]);
    if (!t || !canTake(t, u)) fail(404, "未找到分配给你的任务。");
    const existing = one(
      "SELECT * FROM attempts WHERE task_id=? AND student_id=?",
      t.id,
      u.id,
    );
    if (existing)
      return {
        attempt: attemptView(existing),
        questions: existing.submitted_at
          ? []
          : json(t.questions).map(publicQuestion),
        task: taskView(t),
        serverTime: Date.now(),
      };
    const now = Date.now();
    if (now < t.opens_at) fail(409, "任务尚未开始。");
    if (now >= t.closes_at) fail(409, "任务已经截止。");
    const aid = id();
    run(
      "INSERT INTO attempts(id,task_id,student_id,started_at,deadline) VALUES(?,?,?,?,?)",
      aid,
      t.id,
      u.id,
      now,
      Math.min(now + t.duration * 60000, t.closes_at),
    );
    return {
      attempt: attemptView(one("SELECT * FROM attempts WHERE id=?", aid)),
      questions: json(t.questions).map(publicQuestion),
      task: taskView(t),
      serverTime: now,
    };
  }
  const attemptRoute = path.match(/^\/api\/attempts\/([^/]+)(\/submit)?$/);
  if (attemptRoute && (method === "PATCH" || method === "POST")) {
    const a = one(
      "SELECT * FROM attempts WHERE id=? AND student_id=?",
      attemptRoute[1],
      u.id,
    );
    if (!a) fail(404, "未找到答题记录。");
    if (a.submitted_at)
      return { attempt: attemptView(a), expired: !!a.timed_out };
    if (Date.now() >= a.deadline)
      return { attempt: finalize(a, json(a.answers), true), expired: true };
    const b = await body(req),
      questions = json(
        one("SELECT questions FROM tasks WHERE id=?", a.task_id).questions,
      ),
      answers = answerObject(b.answers, questions);
    if (attemptRoute[2] && method === "POST")
      return { attempt: finalize(a, answers) };
    if (method !== "PATCH") fail(405, "请求方法不正确。");
    run("UPDATE attempts SET answers=? WHERE id=?", jsonString(answers), a.id);
    return { savedAt: Date.now(), serverTime: Date.now() };
  }
  if (path === "/api/results" && method === "GET") {
    if (u.role !== "teacher") fail(403, "仅教师可查看班级成绩。");
    const taskId = url.searchParams.get("task");
    const tasks = all("SELECT * FROM tasks WHERE owner_id=?", u.id).filter(
      (t) => !taskId || t.id === taskId,
    );
    return {
      results: tasks.flatMap((t) => {
        const audience = json(t.audience);
        return all(
          "SELECT id,name,program,class_id AS classId FROM users WHERE owner_id=? AND role='student'",
          u.id,
        )
          .filter(
            (s) =>
              json(t.class_ids).includes(s.classId) &&
              (audience === "all" || audience.includes(s.id)),
          )
          .map((s) => {
            const a = one(
              "SELECT * FROM attempts WHERE task_id=? AND student_id=?",
              t.id,
              s.id,
            );
            return {
              taskId: t.id,
              taskTitle: t.title,
              subject: t.subject,
              program: t.program,
              studentId: s.id,
              name: s.name,
              classId: s.classId,
              className: one("SELECT name FROM classes WHERE id=?", s.classId)
                ?.name,
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
            };
          });
      }),
    };
  }
  if (path === "/api/mistakes" && method === "GET") {
    if (u.role !== "student") fail(403, "请使用学生账号查看错题。");
    return {
      mistakes: all(
        "SELECT * FROM mistakes WHERE student_id=? ORDER BY resolved,next_review",
        u.id,
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
    if (u.role !== "student") fail(403, "请使用学生账号复习。");
    const m = one(
      "SELECT * FROM mistakes WHERE id=? AND student_id=?",
      review[1],
      u.id,
    );
    if (!m) fail(404, "未找到错题。");
    if (m.next_review > Date.now())
      fail(409, "本次复习已完成，请到下次复习时间再作答。");
    const b = await body(req),
      q = json(m.question),
      answer = required(b.answer, "答案", 2000),
      correct = isCorrect(answer, q.accepted),
      streak = correct ? m.streak + 1 : 0,
      days = correct ? [1, 3, 7][Math.min(streak - 1, 2)] : 0;
    run(
      "UPDATE mistakes SET streak=?,next_review=?,last_answer=?,resolved=?,error_count=error_count+? WHERE id=?",
      streak,
      Date.now() + (correct ? days * 86400000 : 600000),
      answer,
      streak >= 3 ? 1 : 0,
      correct ? 0 : 1,
      m.id,
    );
    return {
      correct,
      answer: q.answer,
      streak,
      nextReview: Date.now() + (correct ? days * 86400000 : 600000),
      resolved: streak >= 3,
    };
  }
  fail(404, "未找到该接口。");
}

const server = http.createServer(async (req, res) => {
  try {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
    );
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
      const result = await api(req, res, url);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(jsonString(result));
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) fail(405, "请求方法不正确。");
    const publicRoot = join(ROOT, "public");
    let name = decodeURIComponent(url.pathname);
    if (name === "/") name = "/index.html";
    const file = resolve(publicRoot, `.${name}`);
    if (
      !file.startsWith(`${publicRoot}/`) ||
      !existsSync(file) ||
      !statSync(file).isFile()
    )
      fail(404, "页面不存在。");
    res.setHeader("Cache-Control", "no-cache");
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
    });
    res.end(req.method === "HEAD" ? undefined : readFileSync(file));
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error("Request failed:", e.message);
    if (!res.headersSent)
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
    res.end(
      jsonString({
        error: status === 500 ? "服务器遇到问题，请稍后重试。" : e.message,
      }),
    );
  }
});
server.listen(
  Number(process.env.PORT || 3000),
  process.env.HOST || "127.0.0.1",
  () => {
    console.log(`LexiClass listening on port ${server.address().port}`);
    if (
      existsSync(setupFile) &&
      !one("SELECT id FROM users WHERE role='teacher' AND demo=0")
    )
      console.log(
        `First teacher setup: use the private setup key at ${setupFile}. Never share it with students.`,
      );
  },
);
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
