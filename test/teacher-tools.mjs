import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
const data = mkdtempSync(join(tmpdir(), "classwords-teacher-tools-"));
const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    DATA_DIR: data,
    HOST: "127.0.0.1",
    PORT: "0",
    ALLOW_DEMO: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
try {
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("startup timeout")), 10000);
    server.stdout.on("data", (chunk) => {
      const m = String(chunk).match(/listening on port (\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${m[1]}`);
      }
    });
    server.on("error", reject);
  });
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    serviceWorkers: "block",
  });
  await ctx.route("**/*", (r) =>
    new URL(r.request().url()).origin === base ? r.continue() : r.abort(),
  );
  async function api(
    path,
    body,
    method = body ? "POST" : "GET",
    context = ctx,
  ) {
    const res = await context.request.fetch(base + path, {
      method,
      ...(body ? { data: body } : {}),
    });
    const json = await res.json();
    assert.equal(res.status(), 200, JSON.stringify(json));
    return json;
  }
  await api("/api/setup", {
    setupKey: readFileSync(join(data, "setup-key"), "utf8"),
    name: "隔离管理台",
    password: "IsolatedPassword123!",
    email: "fixture@example.com",
    className: "隔离初始班",
  });
  const program = "NCUK 国际预科",
    subject = "Technical Mathematics";
  const cls = (await api("/api/classes", { name: "隔离工科班", program }))
    .class;
  await api(
    `/api/classes/${cls.id}/courses`,
    {
      courses: [
        { subject, title: "工科数学", content: "" },
        { subject: "Physics", title: "物理", content: "" },
      ],
    },
    "PUT",
  );
  const students = (
    await api("/api/students", {
      students: [
        { name: "隔离甲", classId: cls.id },
        { name: "隔离乙", classId: cls.id },
      ],
    })
  ).students;
  const words = (
    await api("/api/words", {
      words: Array.from({ length: 12 }, (_, i) => ({
        program,
        subject,
        term: `fixture term ${i}`,
        translation: `隔离词${i}`,
        sentence: `Use fixture term ${i} in this question.`,
        sentenceZh: `此题使用隔离词${i}。`,
        groups: [
          `Week ${String(5 + Math.floor(i / 4)).padStart(2, "0")}｜第${5 + Math.floor(i / 4)}周`,
        ],
        tracks: ["Technical"],
        source: "isolated fixture",
      })),
    })
  ).words;
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("heading", { name: "教学概览", exact: true }).waitFor();
  await page.getByRole("button", { name: "发布听写", exact: true }).click();
  assert.equal(await page.locator("#task-form [name=title]").count(), 0);
  await page.locator("[name=classId]").selectOption(cls.id);
  assert.deepEqual(
    await page.locator("[name=subject] option").evaluateAll((opts) =>
      opts
        .map((o) => o.value)
        .filter(Boolean)
        .sort(),
    ),
    ["Physics", subject],
  );
  await page.locator("[name=subject]").selectOption(subject);
  await page.locator("[name=opensAt]").fill("2027-01-06T13:00");
  await page.locator("[name=opensAt]").dispatchEvent("change");
  await page.locator("[name=closesAt]").fill("2027-01-06T14:00");
  await page.locator("[name=closesAt]").dispatchEvent("change");
  await page
    .locator('[data-action=schedule-date][data-date="2027-01-20"]')
    .click();
  await page
    .locator('[data-action=schedule-date][data-date="2027-01-27"]')
    .click();
  assert.match(
    await page.locator("#task-title-preview").textContent(),
    /NCUK · 工科数学 · W05/,
  );
  assert.equal(await page.locator("[data-schedule-date]").count(), 2);
  await page.getByRole("button", { name: "确认发布", exact: true }).click();
  await page
    .getByRole("heading", { name: "考试已准备好，分享给学生吧" })
    .waitFor();
  assert.equal(await page.locator(".share-exam input").count(), 3);
  const tasks = (await api("/api/tasks")).tasks;
  const scheduled = tasks.filter((t) => t.classIds.includes(cls.id));
  assert.equal(scheduled.length, 3);
  assert.deepEqual(
    scheduled
      .sort((a, b) => a.opensAt - b.opensAt)
      .map((t) => [
        t.title,
        new Date(t.opensAt).toISOString(),
        t.questionCount,
      ]),
    [5, 6, 7].map((w, i) => [
      `NCUK · 工科数学 · W0${w}`,
      `2027-01-${["06", "20", "27"][i]}T05:00:00.000Z`,
      4,
    ]),
  );
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.locator(".nav [data-view=tasks]").click();
  await page.getByRole("button", { name: "全部展开", exact: true }).click();
  assert.equal(await page.locator(".task-table-row:visible").count(), 3);
  await page.getByRole("button", { name: "全部收起", exact: true }).click();
  assert.equal(await page.locator(".task-table-row:visible").count(), 0);
  const active = (
    await api("/api/tasks", {
      program,
      subject,
      wordGroup: "Week 05｜第5周",
      autoTitle: true,
      wordIds: words.slice(0, 4).map((w) => w.id),
      classIds: [cls.id],
      audience: "all",
      mode: "en-zh",
      questionType: "fill",
      duration: 15,
      opensAt: new Date(Date.now() - 60000).toISOString(),
      closesAt: new Date(Date.now() + 3600000).toISOString(),
    })
  ).task;
  const studentCtx = await browser.newContext({ serviceWorkers: "block" });
  await api(
    "/api/login",
    { name: students[0].name, invite: students[0].invite },
    "POST",
    studentCtx,
  );
  const attempt = await api(
    `/api/tasks/${active.id}/start`,
    {},
    "POST",
    studentCtx,
  );
  await api(
    `/api/attempts/${attempt.attempt.id}/submit`,
    {
      answers: Object.fromEntries(
        attempt.questions.map((q, i) => [
          q.id,
          i < 2 ? words[i].translation : "",
        ]),
      ),
    },
    "POST",
    studentCtx,
  );
  await page.reload();
  await page.locator(".nav [data-view=dashboard]").click();
  await page.locator("[data-board-charts]>summary").click();
  await page.locator("[data-grade=program]").selectOption(program);
  await page.locator("[data-grade=subject]").selectOption(subject);
  await page.locator('[data-action=grade-group][data-group="Week 05"]').click();
  assert.equal(
    await page.locator("[data-grade=group]").inputValue(),
    "Week 05",
  );
  await page.locator("[data-action=grade-band][data-band=low]").click();
  assert.equal(await page.locator("[data-action=grade-student]").count(), 2);
  await page.locator("[data-action=grade-student]").first().click();
  await page.getByRole("heading", { name: /隔离甲 · 考试记录/ }).waitFor();
  await page.locator("[data-action=result-detail]").click();
  await page.getByRole("heading", { name: /隔离甲 · 50 分/ }).waitFor();
  await page.locator("[data-action=close-modal]").first().click();
  mkdirSync("dist/teacher-tools", { recursive: true });
  await page.screenshot({
    path: "dist/teacher-tools/overview.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS isolated browser: class courses, calendar holidays W05→W07, automatic titles, batch publish, collapse, weekly grades, score bands, student and answer drilldown.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await once(server, "exit").catch(() => {});
  rmSync(data, { recursive: true, force: true });
}
