import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const folder = mkdtempSync(join(tmpdir(), "lexiclass-offline-test-"));
const file = join(folder, "词间课堂试用.html");
let browser;
try {
  execFileSync(process.execPath, ["scripts/build-demo.mjs", file], {
    cwd: new URL("..", import.meta.url),
  });
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || undefined,
    headless: true,
    args: process.env.BROWSER_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    serviceWorkers: "block",
  });
  // Managed Chromium prohibits file:// navigation. Supply the exact generated
  // document from memory at a loopback origin; this is not a hosted app/backend
  // and does not verify double-click opening on the user's Windows/Mac machine.
  const documentURL = "http://127.0.0.1:41731/lexiclass-demo.html";
  const html = readFileSync(file, "utf8");
  const external = [];
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      route.request().isNavigationRequest() &&
      url.origin === new URL(documentURL).origin &&
      url.pathname === new URL(documentURL).pathname
    )
      return route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: html,
      });
    external.push(url.origin);
    return route.abort("blockedbyclient");
  });
  await context.setOffline(true);
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(documentURL);
  await page.getByRole("heading", { name: "教学概览", exact: true }).waitFor();
  assert.match(
    await page.locator(".offline-guide").textContent(),
    /不能供全班共享/,
  );
  await page.getByRole("button", { name: "发布听写", exact: true }).click();
  await page.locator("#task-form [name=title]").fill("本机试用 · 经济学小测");
  await page.locator("#task-form [name=audienceMode]").selectOption("selected");
  await page
    .locator("#task-students label")
    .filter({ hasText: "陈思远" })
    .locator("input")
    .check();
  await page.getByRole("button", { name: "确认发布", exact: true }).click();
  await page
    .getByRole("heading", { name: "考试已准备好，分享给学生吧" })
    .waitFor();
  const link = await page.locator(".share-exam input").inputValue();
  assert.equal(new URL(link).origin, new URL(documentURL).origin);
  const taskId = new URL(link).searchParams.get("exam");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "体验学生端 →" }).click();
  await page
    .locator("[data-action=demo-student]")
    .filter({ hasText: "陈思远" })
    .click();
  await page.getByRole("heading", { name: "我的学习", exact: true }).waitFor();
  await page.goto(link);
  await page.getByRole("heading", { name: "考试入口", exact: true }).waitFor();
  await page.getByRole("button", { name: "我已准备好，开始考试" }).click();
  const answers = [
    "机会成本",
    "scarcity",
    "需求价格弹性",
    "equilibrium",
    "不确定",
    "aggregate demand",
    "通货膨胀",
    "fiscal policy",
  ];
  for (let i = 0; i < answers.length; i++)
    await page.locator("#exam-form input[type=text]").nth(i).fill(answers[i]);
  await page.waitForFunction(
    () =>
      document.querySelector("#save-indicator")?.textContent ===
      "已保存到本机浏览器",
  );
  await page.reload();
  await page.getByRole("button", { name: "继续考试", exact: true }).click();
  assert.equal(
    await page.locator("#exam-form [name=q1]").inputValue(),
    "机会成本",
  );
  await page.getByRole("button", { name: "提交本次听写" }).click();
  await page.getByRole("button", { name: "确认提交", exact: true }).click();
  await page.locator(".result-number").waitFor();
  assert.match(await page.locator(".result-number").textContent(), /88/);
  await page.getByRole("button", { name: "去错题本复习" }).click();
  await page
    .getByRole("heading", { name: "externality", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "再练一次" }).first().click();
  await page.locator("#review-form [name=answer]").fill("外部性");
  await page.getByRole("button", { name: "检查答案" }).click();
  await page.getByRole("heading", { name: "答对了，再向前一步。" }).waitFor();
  await page.getByRole("button", { name: "知道了" }).click();
  await page.getByRole("button", { name: "回到教师端", exact: true }).click();
  await page.getByRole("heading", { name: "教学概览", exact: true }).waitFor();
  await page.locator(".nav [data-view=tasks]").click();
  await page.locator(`[data-action=task-results][data-id="${taskId}"]`).click();
  await page.getByRole("heading", { name: "成绩分析", exact: true }).waitFor();
  const row = page.locator("tbody tr").filter({ hasText: "陈思远" });
  assert.match(await row.textContent(), /88/);
  assert.match(await row.textContent(), /UNSW 商科 A 班/);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "Single-file document passed with browser networking disabled and its HTML supplied from memory: teacher publishing, student exam link, autosave/refresh, scoring, review, and persisted teacher class results. Actual file:// opening is unverified because managed Chromium blocks it.",
  );
} finally {
  await browser?.close();
  rmSync(folder, { recursive: true, force: true });
}
