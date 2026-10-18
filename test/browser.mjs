import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
const data = mkdtempSync(join(tmpdir(), "lexiclass-browser-"));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    DATA_DIR: data,
    HOST: "127.0.0.1",
    PORT: "0",
    ALLOW_DEMO: "true",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser, base;
try {
  base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Server startup timeout")),
      10000,
    );
    server.stdout.on("data", (chunk) => {
      const m = chunk.toString().match(/listening on port (\d+)/);
      if (m) {
        clearTimeout(timeout);
        resolve(`http://127.0.0.1:${m[1]}`);
      }
    });
    server.on("error", reject);
    server.on("exit", (code) => reject(new Error(`Server exited: ${code}`)));
  });
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || undefined,
    headless: true,
    args: process.env.BROWSER_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    serviceWorkers: "block",
  });
  const thirdPartyRequests = [];
  async function restrictToApp(context) {
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (
        ["http:", "https:", "ws:", "wss:"].includes(url.protocol) &&
        url.origin !== new URL(base).origin
      ) {
        thirdPartyRequests.push(url.origin);
        return route.abort("blockedbyclient");
      }
      return route.continue();
    });
  }
  await restrictToApp(page.context());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("button", { name: "体验教师与学生演示 →" }).click();
  await page.getByRole("heading", { name: "教学概览", exact: true }).waitFor();
  const shots = join(data, "screenshots");
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: join(shots, "teacher.png"), fullPage: true });
  await page.locator(".nav [data-view=classes]").click();
  await page.getByRole("button", { name: "新建班级", exact: true }).click();
  await page.locator("#class-form [name=name]").fill("NCUK 测试班");
  await page
    .locator("#class-form [name=program]")
    .selectOption("NCUK 国际预科");
  await page.getByRole("button", { name: "创建班级", exact: true }).click();
  await page.getByRole("heading", { name: "NCUK 测试班" }).waitFor();
  await page.locator(".nav [data-view=students]").click();
  await page.getByRole("button", { name: "添加学生", exact: true }).click();
  await page
    .locator("#students-form [name=classId]")
    .selectOption({ label: "UNSW 商科 A 班 · UNSW" });
  await page
    .locator("#students-form [name=names]")
    .fill("浏览器学生甲\n浏览器学生乙");
  await page.getByRole("button", { name: "添加并生成入口" }).click();
  await page.getByRole("heading", { name: "学生学习入口已生成" }).waitFor();
  assert.equal(await page.locator(".invite-link").count(), 2);
  const entry = await page.locator(".invite-link").first().textContent();
  const secondEntry = await page.locator(".invite-link").nth(1).textContent();
  assert.ok(entry.includes("/#invite="));
  const studentContext = await browser.newContext({ serviceWorkers: "block" });
  await restrictToApp(studentContext);
  const studentPage = await studentContext.newPage();
  await studentPage.goto(entry);
  await studentPage.locator("#auth-form").waitFor();
  assert.equal(
    await studentPage.locator("#auth-form [name=invite]").count(),
    0,
  );
  await studentPage.locator("#auth-form [name=name]").fill("浏览器学生甲");
  await studentPage
    .locator("#auth-form [name=username]")
    .fill("browser-student-01");
  await studentPage
    .locator("#auth-form [name=password]")
    .fill("BrowserPassword123!");
  await studentPage
    .locator("#auth-form [name=passwordConfirm]")
    .fill("BrowserPassword123!");
  await studentPage.getByRole("button", { name: "开通账号并进入" }).click();
  await studentPage
    .getByRole("heading", { name: "我的学习", exact: true })
    .waitFor();
  assert.equal(await studentPage.locator("select").count(), 0);
  await studentContext.close();
  await page.getByRole("button", { name: "已妥善保存" }).click();
  await page.locator(".nav [data-view=tasks]").click();
  await page.getByRole("button", { name: "发布听写", exact: true }).click();
  await page.locator("#task-form [name=title]").fill("浏览器验证 · 定向发布");
  await page.locator("#task-form [name=repeatDays]").fill("2");
  await page.locator("#task-form [name=audienceMode]").selectOption("selected");
  await page
    .locator("#task-students label")
    .filter({ hasText: "浏览器学生甲" })
    .locator("input")
    .check();
  await page.getByRole("button", { name: "确认发布" }).click();
  await page
    .getByRole("heading", { name: "考试已准备好，分享给学生吧" })
    .waitFor();
  const examLink = await page.locator(".share-exam input").first().inputValue();
  const futureLink = await page
    .locator(".share-exam input")
    .nth(1)
    .inputValue();
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page
    .getByRole("heading", { name: /浏览器验证 · 定向发布/ })
    .first()
    .waitFor();
  assert.equal(
    await page.getByRole("heading", { name: /浏览器验证 · 定向发布/ }).count(),
    2,
  );
  const taskId = new URL(examLink).searchParams.get("exam");
  const webContext = await browser.newContext({ serviceWorkers: "block" });
  await restrictToApp(webContext);
  const web = await webContext.newPage();
  await web.goto(examLink);
  await web.locator("#auth-form [name=username]").fill("browser-student-01");
  await web.locator("#auth-form [name=password]").fill("BrowserPassword123!");
  await web.getByRole("button", { name: "进入课堂" }).click();
  await web.getByRole("heading", { name: "考试入口", exact: true }).waitFor();
  assert.equal(
    await web.locator("[data-action=install]").count(),
    0,
    "students never need an installation flow",
  );
  const before = await (
    await page.request.get(`${base}/api/results?task=${taskId}`)
  ).json();
  assert.equal(
    before.results[0].state,
    "pending",
    "opening the exam link does not start the timer",
  );
  await web.getByRole("button", { name: "我已准备好，开始考试" }).click();
  const webAnswers = [
    "机会成本",
    "scarcity",
    "需求价格弹性",
    "equilibrium",
    "不会",
    "aggregate demand",
    "通货膨胀",
    "fiscal policy",
  ];
  for (let i = 0; i < webAnswers.length; i++)
    await web.locator("#exam-form input[type=text]").nth(i).fill(webAnswers[i]);
  await web.waitForFunction(
    () =>
      document.querySelector("#save-indicator")?.textContent ===
      "已保存到服务器",
  );
  await web.reload();
  await web.getByRole("button", { name: "继续考试", exact: true }).click();
  assert.equal(
    await web.locator("#exam-form [name=q1]").inputValue(),
    "机会成本",
  );
  await web.getByRole("button", { name: "提交本次听写" }).click();
  await web.getByRole("button", { name: "确认提交", exact: true }).click();
  await web.locator(".result-number").waitFor();
  assert.match(await web.locator(".result-number").textContent(), /88/);
  await web.getByRole("button", { name: "去错题本复习" }).click();
  await web
    .getByRole("heading", { name: "externality", exact: true })
    .waitFor();
  await webContext.close();
  const another = await browser.newContext({ serviceWorkers: "block" });
  await restrictToApp(another);
  const otherDevice = await another.newPage();
  await otherDevice.goto(examLink);
  await otherDevice
    .locator("#auth-form [name=username]")
    .fill("browser-student-01");
  await otherDevice
    .locator("#auth-form [name=password]")
    .fill("BrowserPassword123!");
  await otherDevice.getByRole("button", { name: "进入课堂" }).click();
  await otherDevice
    .getByRole("button", { name: /已完成 · 查看 88 分/ })
    .waitFor();
  await otherDevice.goto(futureLink);
  await otherDevice.getByRole("button", { name: "等待考试开放" }).waitFor();
  assert.equal(
    await otherDevice
      .getByRole("button", { name: "等待考试开放" })
      .isDisabled(),
    true,
  );
  await otherDevice.goto(`${base}/?exam=not-a-valid-exam`);
  await otherDevice
    .getByRole("heading", { name: "未找到分配给你的考试" })
    .waitFor();
  assert.equal(
    await otherDevice.locator("[data-action=start-task]").count(),
    0,
  );
  await another.close();
  const deniedContext = await browser.newContext({ serviceWorkers: "block" });
  await restrictToApp(deniedContext);
  const denied = await deniedContext.newPage();
  const deniedLink = new URL(secondEntry);
  deniedLink.searchParams.set("exam", taskId);
  await denied.goto(deniedLink.href);
  await denied.locator("#auth-form [name=name]").fill("浏览器学生乙");
  await denied.locator("#auth-form [name=username]").fill("browser-student-02");
  await denied
    .locator("#auth-form [name=password]")
    .fill("BrowserPassword123!");
  await denied
    .locator("#auth-form [name=passwordConfirm]")
    .fill("BrowserPassword123!");
  await denied.getByRole("button", { name: "开通账号并进入" }).click();
  await denied.getByRole("heading", { name: "未找到分配给你的考试" }).waitFor();
  assert.equal(await denied.locator("[data-action=start-task]").count(), 0);
  await deniedContext.close();
  await page.locator(`[data-action=task-results][data-id="${taskId}"]`).click();
  await page.getByRole("heading", { name: "成绩分析", exact: true }).waitFor();
  const gradeRow = page.locator("tbody tr").filter({ hasText: "浏览器学生甲" });
  assert.match(await gradeRow.textContent(), /88/);
  assert.match(await gradeRow.textContent(), /UNSW 商科 A 班/);
  await page.getByRole("button", { name: "体验学生端 →" }).click();
  await page
    .locator("[data-action=demo-student]")
    .filter({ hasText: "陈思远" })
    .click();
  await page.getByRole("heading", { name: "我的学习", exact: true }).waitFor();
  assert.equal(
    await page.locator("select").count(),
    0,
    "students do not choose programme or class",
  );
  await page.screenshot({ path: join(shots, "student.png"), fullPage: true });
  await page
    .locator(".assignment-card")
    .filter({ hasText: "经济学 · 核心概念场景听写" })
    .locator("[data-action=start-task]")
    .click();
  await page.locator("#exam-form").waitFor();
  const count = await page.locator("#exam-form input[type=text]").count();
  assert.equal(count, 6);
  for (const input of await page.locator("#exam-form input[type=text]").all()) {
    for (const [key, value] of Object.entries({
      spellcheck: "false",
      autocorrect: "off",
      autocomplete: "off",
      autocapitalize: "off",
    }))
      assert.equal(await input.getAttribute(key), value);
  }
  const prevented = await page
    .locator("#exam-form input[lang=en]")
    .first()
    .evaluate(
      (input) =>
        !input.dispatchEvent(
          new InputEvent("beforeinput", {
            inputType: "insertReplacementText",
            data: "automatic replacement",
            cancelable: true,
            bubbles: true,
          }),
        ),
    );
  assert.equal(
    prevented,
    true,
    "cancelable automatic English replacements are rejected",
  );
  const answers = [
    "机会成本",
    "scarcity",
    "需求价格弹性",
    "equilibrium",
    "不确定",
    "aggregate demand",
  ];
  for (let i = 0; i < answers.length; i++)
    await page.locator("#exam-form input[type=text]").nth(i).fill(answers[i]);
  await page.waitForFunction(
    () =>
      document.querySelector("#save-indicator")?.textContent ===
      "已保存到服务器",
  );
  await page.reload();
  await page.getByRole("heading", { name: "我的学习", exact: true }).waitFor();
  await page
    .locator("[data-action=start-task]")
    .filter({ hasText: "继续答题" })
    .first()
    .click();
  assert.equal(
    await page.locator("#exam-form [name=q1]").inputValue(),
    "机会成本",
  );
  await page.screenshot({ path: join(shots, "exam.png"), fullPage: true });
  await page.getByRole("button", { name: "提交本次听写" }).click();
  await page.getByRole("button", { name: "确认提交", exact: true }).click();
  await page.locator(".result-number").waitFor();
  assert.match(await page.locator(".result-number").textContent(), /83/);
  await page.screenshot({ path: join(shots, "result.png"), fullPage: true });
  await page.getByRole("button", { name: "去错题本复习" }).click();
  await page
    .getByRole("heading", { name: "我的错题本", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "再练一次" }).first().click();
  await page.locator("#review-form [name=answer]").fill("外部性");
  await page.getByRole("button", { name: "检查答案" }).click();
  await page.getByRole("heading", { name: "答对了，再向前一步。" }).waitFor();
  await page.getByRole("button", { name: "知道了" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(shots, "student-mobile.png"),
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false, "mobile must not overflow horizontally");
  assert.deepEqual(errors, [], "no uncaught browser errors");
  assert.deepEqual(
    thirdPartyRequests,
    [],
    "the complete workflow must not request third-party hosts",
  );
  console.log(
    "Browser workflow passed with all third-party hosts blocked: class creation, web account activation, shareable exam links and cross-device login, assigned-student access, future exam waiting, teacher class scores, autocorrection attributes, autosave/resume, scoring, review, responsive layout.",
  );
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
  rmSync(data, { recursive: true, force: true });
}
