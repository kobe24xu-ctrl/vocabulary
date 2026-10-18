import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import { DatabaseSync } from "node:sqlite";
import { buildQuestions, isCorrect } from "../lib/domain.mjs";
import { SAMPLE_WORDS, PROGRAMS } from "../lib/words.mjs";

const dataDir = mkdtempSync(join(tmpdir(), "lexiclass-test-"));
let server, base;
class Client {
  cookie = "";
  async call(path, method = "GET", body) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Cookie: this.cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) this.cookie = cookie.split(";")[0];
    return { status: response.status, data: await response.json() };
  }
  async ok(path, method = "GET", body) {
    const r = await this.call(path, method, body);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data;
  }
}
const teacher = new Client();
let classes, students;
const taskInput = (overrides = {}) => ({
  title: "经济学场景听写",
  program: PROGRAMS[0],
  subject: "Economics",
  mode: "mixed",
  duration: 15,
  opensAt: new Date(Date.now() - 60000).toISOString(),
  closesAt: new Date(Date.now() + 3600000).toISOString(),
  wordIds: ["sample-1", "sample-2"],
  classIds: [classes[0].id],
  audience: "all",
  ...overrides,
});
before(async () => {
  server = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      PORT: "0",
      HOST: "127.0.0.1",
      ALLOW_DEMO: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Server startup timeout")),
      10000,
    );
    server.stdout.on("data", (chunk) => {
      output += chunk;
      const m = output.match(/listening on port (\d+)/);
      if (m) {
        base = `http://127.0.0.1:${m[1]}`;
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on("error", reject);
    server.on("exit", (code) => {
      if (!base) reject(new Error(`Server exited ${code}`));
    });
  });
});
after(async () => {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
  rmSync(dataDir, { recursive: true, force: true });
});

test("teacher setup requires server key and persists multiple programmes and classes", async () => {
  const config = await teacher.ok("/api/config");
  assert.equal(config.setupRequired, true);
  assert.equal(config.programs.length, 3);
  assert.equal(
    (await teacher.call("/api/setup", "POST", { setupKey: "wrong" })).status,
    403,
  );
  const result = await teacher.ok("/api/setup", "POST", {
    setupKey: readFileSync(join(dataDir, "setup-key"), "utf8"),
    name: "测试老师",
    email: "teacher@example.com",
    password: "SecurePassword123!",
    className: "UNSW A 班",
  });
  assert.equal(result.user.role, "teacher");
  assert.equal((await teacher.ok("/api/config")).setupRequired, false);
  const ncuk = (
    await teacher.ok("/api/classes", "POST", {
      name: "NCUK 1 班",
      program: PROGRAMS[1],
    })
  ).class;
  const second = (
    await teacher.ok("/api/classes", "POST", {
      name: "UNSW B 班",
      program: PROGRAMS[0],
    })
  ).class;
  classes = (await teacher.ok("/api/classes")).classes;
  assert.equal(classes.length, 3);
  assert.ok(classes.some((c) => c.id === ncuk.id));
  assert.ok(classes.some((c) => c.id === second.id));
});
test("teacher adds students; student name plus private entry resolves class without a programme choice", async () => {
  students = (
    await teacher.ok("/api/students", "POST", {
      students: [
        { name: "学生甲", classId: classes[0].id },
        { name: "学生乙", classId: classes[0].id },
        { name: "学生丙", classId: classes[1].id },
        { name: "学生丁", classId: classes[2].id },
      ],
    })
  ).students;
  const client = new Client(),
    u = await client.ok("/api/login", "POST", {
      name: students[0].name,
      invite: students[0].invite,
    });
  assert.equal(u.user.classId, classes[0].id);
  assert.equal(u.user.program, PROGRAMS[0]);
  assert.equal(u.user.className, "UNSW A 班");
  for (const route of [
    "/api/students",
    "/api/results",
    "/api/classes",
    "/api/words",
  ])
    assert.equal((await client.call(route)).status, 403);
  assert.equal(
    (await client.call("/api/tasks", "POST", taskInput())).status,
    403,
  );
  const before = (await teacher.ok("/api/students")).students.length;
  assert.equal(
    (
      await teacher.call("/api/students", "POST", {
        students: [
          { name: "临时姓名", classId: classes[0].id },
          { name: "学生甲", classId: classes[0].id },
        ],
      })
    ).status,
    409,
  );
  assert.equal(
    (await teacher.ok("/api/students")).students.length,
    before,
    "bulk import must roll back on errors",
  );
});
test("word imports validate context and are transactional", async () => {
  const word = {
    ...SAMPLE_WORDS[0],
    program: PROGRAMS[0],
    term: "marginal cost",
    translation: "边际成本",
    sentence: "Calculate the marginal cost of producing one additional unit.",
    sentenceZh: "计算再生产一个单位产品的边际成本。",
    aliases: ["边际生产成本"],
  };
  const { words } = await teacher.ok("/api/words", "POST", { words: [word] });
  assert.equal(words.length, 1);
  assert.ok(words[0].id !== word.id);
  const before = (await teacher.ok("/api/words")).words.length;
  assert.equal(
    (
      await teacher.call("/api/words", "POST", {
        words: [word, { ...word, sentenceZh: "没有词义" }],
      })
    ).status,
    400,
  );
  assert.equal((await teacher.ok("/api/words")).words.length, before);
});
test("individual targeting, answer secrecy, autosave/resume, grading and repeat submission", async () => {
  const { task } = await teacher.ok(
    "/api/tasks",
    "POST",
    taskInput({ audience: [students[0].id] }),
  );
  const a = new Client(),
    b = new Client(),
    c = new Client();
  await a.ok("/api/login", "POST", {
    name: students[0].name,
    invite: students[0].invite,
  });
  await b.ok("/api/login", "POST", {
    name: students[1].name,
    invite: students[1].invite,
  });
  await c.ok("/api/login", "POST", {
    name: students[2].name,
    invite: students[2].invite,
  });
  assert.ok(!(await b.ok("/api/tasks")).tasks.some((t) => t.id === task.id));
  assert.equal(
    (await b.call(`/api/tasks/${task.id}/start`, "POST", {})).status,
    404,
  );
  assert.equal(
    (await c.call(`/api/tasks/${task.id}/start`, "POST", {})).status,
    404,
  );
  const started = await a.ok(`/api/tasks/${task.id}/start`, "POST", {});
  assert.equal(started.questions.length, 2);
  assert.ok(!JSON.stringify(started.questions).includes("accepted"));
  assert.ok(!("answer" in started.questions[0]));
  assert.equal(started.questions[1].direction, "zh-en");
  assert.ok(!started.questions[1].prompt.includes("scarcity"));
  const answers = { q1: "机会成本", q2: "wrong" };
  await a.ok(`/api/attempts/${started.attempt.id}`, "PATCH", { answers });
  const resumed = await a.ok(`/api/tasks/${task.id}/start`, "POST", {});
  assert.equal(resumed.attempt.id, started.attempt.id);
  assert.deepEqual(resumed.attempt.answers, answers);
  assert.equal(resumed.attempt.deadline, started.attempt.deadline);
  const submitted = (
    await a.ok(`/api/attempts/${started.attempt.id}/submit`, "POST", {
      answers,
    })
  ).attempt;
  assert.equal(submitted.score, 50);
  assert.equal(submitted.result.correct, 1);
  assert.ok(submitted.submittedAt);
  const again = (
    await a.ok(`/api/attempts/${started.attempt.id}/submit`, "POST", {
      answers: { q1: "机会成本", q2: "scarcity" },
    })
  ).attempt;
  assert.equal(again.score, 50, "finished answers are immutable");
  const mistakes = (await a.ok("/api/mistakes")).mistakes;
  assert.equal(mistakes.length, 1);
  assert.equal(mistakes[0].errorCount, 1);
  assert.equal(mistakes[0].question.term, "scarcity");
  const results = (await teacher.ok(`/api/results?task=${task.id}`)).results;
  assert.equal(results.length, 1);
  assert.equal(results[0].name, "学生甲");
  assert.equal(results[0].score, 50);
  assert.equal(results[0].classId, classes[0].id);
  const review = await a.ok(`/api/mistakes/${mistakes[0].id}/review`, "POST", {
    answer: "Scarcity",
  });
  assert.equal(review.correct, true);
  assert.equal(review.streak, 1);
  assert.equal(
    (
      await a.call(`/api/mistakes/${mistakes[0].id}/review`, "POST", {
        answer: "scarcity",
      })
    ).status,
    409,
  );
});
test("a whole-class task reaches that class only and future tasks cannot start early", async () => {
  const { task } = await teacher.ok(
    "/api/tasks",
    "POST",
    taskInput({
      opensAt: new Date(Date.now() + 3600000).toISOString(),
      closesAt: new Date(Date.now() + 7200000).toISOString(),
    }),
  );
  const same = new Client(),
    other = new Client();
  await same.ok("/api/login", "POST", {
    name: students[1].name,
    invite: students[1].invite,
  });
  await other.ok("/api/login", "POST", {
    name: students[3].name,
    invite: students[3].invite,
  });
  assert.ok((await same.ok("/api/tasks")).tasks.some((t) => t.id === task.id));
  assert.equal(
    (await same.call(`/api/tasks/${task.id}/start`, "POST", {})).status,
    409,
  );
  assert.ok(
    !(await other.ok("/api/tasks")).tasks.some((t) => t.id === task.id),
  );
  assert.equal(
    (
      await teacher.call(
        "/api/tasks",
        "POST",
        taskInput({ classIds: [classes[1].id] }),
      )
    ).status,
    400,
    "cross-programme class selection is rejected",
  );
});
test("daily batch publishing is atomic and retains one independent task per day", async () => {
  const before = (await teacher.ok("/api/tasks")).tasks.length;
  const oneDay = taskInput({ title: "第一天" }),
    twoDay = taskInput({
      title: "第二天",
      opensAt: new Date(Date.now() + 86400000).toISOString(),
      closesAt: new Date(Date.now() + 90000000).toISOString(),
    });
  assert.equal(
    (
      await teacher.call("/api/tasks/batch", "POST", {
        tasks: [oneDay, { ...twoDay, classIds: [] }],
      })
    ).status,
    400,
  );
  assert.equal((await teacher.ok("/api/tasks")).tasks.length, before);
  const { tasks } = await teacher.ok("/api/tasks/batch", "POST", {
    tasks: [oneDay, twoDay],
  });
  assert.equal(tasks.length, 2);
  assert.notEqual(tasks[0].id, tasks[1].id);
  assert.equal((await teacher.ok("/api/tasks")).tasks.length, before + 2);
});
test("deadlines use saved answers, reject late changes and prevent a second attempt", async () => {
  const { task } = await teacher.ok(
    "/api/tasks",
    "POST",
    taskInput({
      wordIds: ["sample-1"],
      closesAt: new Date(Date.now() + 900).toISOString(),
    }),
  );
  const a = new Client();
  await a.ok("/api/login", "POST", {
    name: students[1].name,
    invite: students[1].invite,
  });
  const started = await a.ok(`/api/tasks/${task.id}/start`, "POST", {});
  await a.ok(`/api/attempts/${started.attempt.id}`, "PATCH", {
    answers: { q1: "机会成本" },
  });
  await pause(1000);
  const late = (
    await a.ok(`/api/attempts/${started.attempt.id}/submit`, "POST", {
      answers: { q1: "late wrong answer" },
    })
  ).attempt;
  assert.equal(late.score, 100);
  assert.equal(late.timedOut, true);
  assert.equal(late.answers.q1, "机会成本");
  const resumed = await a.ok(`/api/tasks/${task.id}/start`, "POST", {});
  assert.equal(resumed.attempt.id, started.attempt.id);
  assert.ok(resumed.attempt.submittedAt);
});
test("review scheduling reaches mastery only across due dates, errors schedule a retry", async () => {
  const a = new Client();
  await a.ok("/api/login", "POST", {
    name: students[0].name,
    invite: students[0].invite,
  });
  const m = (await a.ok("/api/mistakes")).mistakes[0];
  const direct = new DatabaseSync(join(dataDir, "lexiclass.sqlite"));
  direct.prepare("UPDATE mistakes SET next_review=0 WHERE id=?").run(m.id);
  const wrong = await a.ok(`/api/mistakes/${m.id}/review`, "POST", {
    answer: "incorrect",
  });
  assert.equal(wrong.streak, 0);
  assert.equal(wrong.correct, false);
  assert.ok(wrong.nextReview > Date.now() + 590000);
  for (let i = 1; i <= 3; i++) {
    direct.prepare("UPDATE mistakes SET next_review=0 WHERE id=?").run(m.id);
    const r = await a.ok(`/api/mistakes/${m.id}/review`, "POST", {
      answer: "scarcity",
    });
    assert.equal(r.streak, i);
    assert.equal(r.resolved, i === 3);
  }
  direct.close();
  assert.equal((await a.ok("/api/mistakes")).mistakes[0].resolved, true);
});
test("resetting entry revokes old student code and active sessions", async () => {
  const a = new Client();
  await a.ok("/api/login", "POST", {
    name: students[0].name,
    invite: students[0].invite,
  });
  const { invite } = await teacher.ok(
    `/api/students/${students[0].id}/invite`,
    "POST",
    {},
  );
  assert.equal((await a.call("/api/me")).status, 401);
  assert.equal(
    (
      await a.call("/api/login", "POST", {
        name: students[0].name,
        invite: students[0].invite,
      })
    ).status,
    401,
  );
  assert.equal(
    (await a.ok("/api/login", "POST", { name: students[0].name, invite })).user
      .name,
    students[0].name,
  );
});
test("student web accounts consume invitations and keep results and mistakes across devices and password resets", async () => {
  const student = (
    await teacher.ok("/api/students", "POST", {
      name: "网页账号学生",
      classId: classes[0].id,
    })
  ).students[0];
  const legacy = new Client();
  await legacy.ok("/api/login", "POST", {
    name: student.name,
    invite: student.invite,
  });
  const { task } = await teacher.ok(
    "/api/tasks",
    "POST",
    taskInput({ audience: [student.id] }),
  );
  const started = await legacy.ok(`/api/tasks/${task.id}/start`, "POST", {});
  await legacy.ok(`/api/attempts/${started.attempt.id}/submit`, "POST", {
    answers: { q1: "机会成本", q2: "wrong" },
  });
  const activated = await new Client().ok("/api/student/activate", "POST", {
    name: student.name,
    invite: student.invite,
    username: "student-web-01",
    password: " WebPassword123! ",
  });
  assert.equal(activated.user.id, student.id);
  assert.equal(activated.user.username, "student-web-01");
  assert.equal((await legacy.call("/api/me")).status, 401);
  assert.equal(
    (
      await new Client().call("/api/login", "POST", {
        name: student.name,
        invite: student.invite,
      })
    ).status,
    401,
    "consumed invitation cannot bypass the password",
  );
  const device = new Client();
  await device.ok("/api/login", "POST", {
    role: "student",
    username: "STUDENT-WEB-01",
    password: " WebPassword123! ",
  });
  assert.equal(
    (await device.ok("/api/tasks")).tasks.find((t) => t.id === task.id).attempt
      .score,
    50,
  );
  assert.equal((await device.ok("/api/mistakes")).mistakes.length, 1);
  const roster = (await teacher.ok("/api/students")).students.find(
    (s) => s.id === student.id,
  );
  assert.equal(roster.username, "student-web-01");
  assert.equal(roster.accountReady, 1);
  assert.equal(
    (
      await new Client().call("/api/login", "POST", {
        username: "student-web-01",
        password: "wrong",
      })
    ).status,
    401,
  );
  const reset = await teacher.ok(
    `/api/students/${student.id}/invite`,
    "POST",
    {},
  );
  assert.equal((await device.call("/api/me")).status, 401);
  assert.equal(
    (
      await device.call("/api/login", "POST", {
        username: "student-web-01",
        password: " WebPassword123! ",
      })
    ).status,
    401,
  );
  const restored = await device.ok("/api/student/activate", "POST", {
    name: student.name,
    invite: reset.invite,
    username: "student-web-01",
    password: "NewPassword123!",
  });
  assert.equal(restored.user.id, student.id);
  assert.equal((await device.ok("/api/mistakes")).mistakes.length, 1);
  assert.equal(
    (await device.ok("/api/tasks")).tasks.find((t) => t.id === task.id).attempt
      .score,
    50,
  );
});

test("student activation checks roster identity, password length and username uniqueness", async () => {
  const student = (
    await teacher.ok("/api/students", "POST", {
      name: "账号验证学生",
      classId: classes[0].id,
    })
  ).students[0];
  const data = {
    name: student.name,
    invite: student.invite,
    username: "student-web-01",
    password: "WebPassword123!",
  };
  const client = new Client();
  assert.equal(
    (
      await client.call("/api/student/activate", "POST", {
        ...data,
        name: "其他姓名",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await client.call("/api/student/activate", "POST", {
        ...data,
        password: "short",
      })
    ).status,
    400,
  );
  assert.equal(
    (await client.call("/api/student/activate", "POST", data)).status,
    409,
  );
  await client.ok("/api/student/activate", "POST", {
    ...data,
    username: "student-web-02",
  });
  assert.equal((await client.ok("/api/me")).user.classId, classes[0].id);
});

test("demonstration data stays in a separate tenant, including role switching", async () => {
  const demo = new Client();
  const login = await demo.ok("/api/demo", "POST", {});
  assert.equal(login.user.isDemo, true);
  assert.equal((await demo.ok("/api/classes")).classes.length, 3);
  const demoStudents = (await demo.ok("/api/students")).students;
  assert.equal(demoStudents.length, 12);
  assert.ok(!demoStudents.some((s) => s.id === students[0].id));
  const r = await demo.ok("/api/demo/switch", "POST", {
    studentId: demoStudents[0].id,
  });
  assert.equal(r.user.role, "student");
  assert.equal((await demo.call("/api/students")).status, 403);
  const teacherView = await demo.ok("/api/demo/switch", "POST", {});
  assert.equal(teacherView.user.role, "teacher");
  assert.notEqual(teacherView.user.id, (await teacher.ok("/api/me")).user.id);
});
test("sessions survive process restart because authentication and task data are persisted", async () => {
  const stored = (await teacher.ok("/api/tasks")).tasks;
  server.kill("SIGTERM");
  await once(server, "exit");
  base = null;
  server = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      PORT: "0",
      HOST: "127.0.0.1",
      ALLOW_DEMO: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (chunk) => {
      const m = chunk.toString().match(/listening on port (\d+)/);
      if (m) {
        base = `http://127.0.0.1:${m[1]}`;
        resolve();
      }
    });
    server.on("error", reject);
  });
  assert.equal((await teacher.ok("/api/tasks")).tasks.length, stored.length);
  assert.equal((await teacher.ok("/api/me")).user.role, "teacher");
  assert.equal((await new Client().call("/api/demo", "POST", {})).status, 403);
});
test("origin checks and student-input settings are enforced on the served app", async () => {
  const response = await fetch(`${base}/api/logout`, {
    method: "POST",
    headers: {
      Origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(response.status, 403);
  const html = await fetch(`${base}/`);
  assert.equal(html.status, 200);
  assert.match(
    html.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  const app = await (await fetch(`${base}/app.js`)).text();
  for (const attr of [
    'spellcheck="false"',
    'autocorrect="off"',
    'autocomplete="off"',
    'autocapitalize="off"',
  ])
    assert.ok(app.includes(attr));
});
test("answer matching normalizes casing and punctuation, without fuzzy guessing", () => {
  assert.equal(isCorrect(" Opportunity-cost ", ["opportunity cost"]), true);
  assert.equal(isCorrect("inflaton", ["inflation"]), false);
  assert.equal(isCorrect("", [""]), false);
  const q = buildQuestions(
    SAMPLE_WORDS.filter((w) => w.subject === "Mathematics"),
    "choice",
  );
  assert.equal(q.length, 4);
  for (const question of q) {
    assert.equal(question.choices.length, 4);
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.choices.includes(question.answer));
  }
});
