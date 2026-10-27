import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  SHARED_WORD_BANKS,
  wordAvailableFor,
  reviewWordKey,
} from "../public/word-banks.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceProgram = "UNSW 新南预科",
  program = "UOW 沃隆港预科";
const fixtures = [
  ["Mathematics", "gradient", "斜率"],
  ["Mathematics", "integer", "整数"],
  ["Mathematics", "polynomial", "多项式"],
  ["Mathematics", "coefficient", "系数"],
  ["Computer Science", "cell", "单元格"],
  ["Computer Science", "formula", "公式"],
  ["Computer Science", "workbook", "工作簿"],
  ["Computer Science", "spreadsheet", "电子表格"],
  ["Economics", "demand", "需求"],
  ["Economics", "supply", "供给"],
  ["Economics", "scarcity", "稀缺性"],
  ["Economics", "equilibrium", "均衡"],
  ["English", "objective", "客观的"],
  ["English", "disclosure", "披露"],
  ["English", "integrity", "诚实"],
  ["English", "yield", "产出"],
  ["Accounting", "asset", "资产"],
].map(([subject, term, translation], i) => ({
  program: sourceProgram,
  subject,
  term,
  translation,
  sentence: `Use ${term} in the supplied ${subject} question.`,
  sentenceZh: `在给定的${subject}题目中使用${translation}这一概念。`,
  groups: [i % 2 ? "Unit 2" : "Unit 1"],
  aliases: [],
  enAliases: [],
  source: "隔离验证词条，不用于正式教学",
}));
const subjects = SHARED_WORD_BANKS.map((r) => r.subject);

test("shared review keys distinguish UOW English courses and preserve other word identities", () => {
  const a = reviewWordKey(program, "source-word", "Academic English"),
    b = reviewWordKey(program, "source-word", "Language Learning");
  assert.notEqual(a, b);
  assert.equal(a, reviewWordKey(program, "source-word", "Academic English"));
  assert.equal(
    reviewWordKey(program, "source-word", "Mathematics"),
    "source-word",
  );
  assert.equal(
    reviewWordKey(sourceProgram, "source-word", "English"),
    "source-word",
  );
});

class Client {
  constructor(base) {
    this.base = base;
    this.cookie = "";
  }
  async call(path, method = "GET", body) {
    const r = await fetch(this.base + path, {
      method,
      headers: { "Content-Type": "application/json", Cookie: this.cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookie = r.headers.get("set-cookie");
    if (cookie) this.cookie = cookie.split(";")[0];
    return { status: r.status, data: await r.json() };
  }
  async ok(...args) {
    const r = await this.call(...args);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data;
  }
}
async function start(backend) {
  const folder = mkdtempSync(join(tmpdir(), `lexiclass-shared-${backend}-`));
  const setupKey = randomUUID();
  let child, base;
  const env = {
    ...process.env,
    ALLOW_DEMO: "false",
    WRANGLER_SEND_METRICS: "false",
    XDG_CONFIG_HOME: join(folder, "cli"),
    WRANGLER_LOG_PATH: join(folder, "wrangler.log"),
  };
  try {
    if (backend === "node") {
      child = spawn(process.execPath, ["server.mjs"], {
        cwd: root,
        env: { ...env, DATA_DIR: folder, HOST: "127.0.0.1", PORT: "0" },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } else {
      const config = join(folder, "wrangler.json"),
        persist = join(folder, "local-d1");
      writeFileSync(
        config,
        JSON.stringify({
          name: "shared-vocabulary-isolated",
          main: join(root, "cloudflare/worker.mjs"),
          compatibility_date: "2026-10-01",
          compatibility_flags: ["nodejs_compat"],
          assets: {
            directory: join(root, "public"),
            binding: "ASSETS",
            run_worker_first: ["/api/*"],
          },
          d1_databases: [
            {
              binding: "DB",
              database_name: "shared-isolated",
              database_id: "00000000-0000-0000-0000-000000000000",
              migrations_dir: join(root, "cloudflare/migrations"),
            },
          ],
          vars: { ALLOW_DEMO: "false", SETUP_KEY: setupKey },
        }),
      );
      const migrated = spawnSync(
        process.execPath,
        [
          join(root, "node_modules/wrangler/bin/wrangler.js"),
          "d1",
          "migrations",
          "apply",
          "DB",
          "--local",
          "--config",
          config,
          "--persist-to",
          persist,
        ],
        { cwd: root, env, encoding: "utf8", timeout: 45000 },
      );
      assert.equal(migrated.status, 0, "isolated D1 migration failed");
      const listener = net.createServer();
      await new Promise((r) => listener.listen(0, "127.0.0.1", r));
      const port = listener.address().port;
      await new Promise((r) => listener.close(r));
      child = spawn(
        process.execPath,
        [
          join(root, "node_modules/wrangler/bin/wrangler.js"),
          "dev",
          "--local",
          "--config",
          config,
          "--persist-to",
          persist,
          "--ip",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
      );
    }
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`${backend} startup timeout`)),
        45000,
      );
      let output = "";
      const inspect = (chunk) => {
        output += chunk;
        const m =
          backend === "node"
            ? output.match(/listening on port (\d+)/)
            : output.match(/Ready on http:\/\/[^: ]+:(\d+)/);
        if (m) {
          base = `http://127.0.0.1:${m[1]}`;
          clearTimeout(timeout);
          resolve();
        }
      };
      child.stdout.on("data", inspect);
      child.stderr.on("data", inspect);
      child.on("error", (e) => {
        clearTimeout(timeout);
        reject(e);
      });
      child.on("exit", (code) => {
        if (!base) {
          clearTimeout(timeout);
          reject(new Error(`${backend} exited ${code}`));
        }
      });
    });
    return {
      base,
      setupKey:
        backend === "node"
          ? readFileSync(join(folder, "setup-key"), "utf8").trim()
          : setupKey,
      async close() {
        if (child.exitCode === null) {
          child.kill("SIGTERM");
          await once(child, "exit");
        }
        rmSync(folder, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (child?.exitCode === null) child.kill("SIGTERM");
    rmSync(folder, { recursive: true, force: true });
    throw error;
  }
}

for (const backend of (process.env.SHARED_BACKENDS || "node,worker").split(
  ",",
)) {
  test(
    `${backend}: UOW shared vocabulary integration (isolated database)`,
    { timeout: 150000 },
    async (t) => {
      const runtime = await start(backend);
      try {
        const teacher = new Client(runtime.base);
        await teacher.ok("/api/setup", "POST", {
          setupKey: runtime.setupKey,
          password: "IsolatedTestPassword123!",
          className: "隔离新南班",
        });
        const cls = (
          await teacher.ok("/api/classes", "POST", {
            name: "隔离UOW班",
            program,
          })
        ).class;
        await teacher.ok(`/api/classes/${cls.id}/courses`, "PUT", {
          courses: subjects.map((subject) => ({
            subject,
            title: subject,
            content: "",
          })),
        });
        const roster = (
          await teacher.ok("/api/students", "POST", {
            students: [{ name: "隔离学生甲", classId: cls.id }],
          })
        ).students;
        const student = new Client(runtime.base);
        await student.ok("/api/student/activate", "POST", {
          name: roster[0].name,
          invite: roster[0].invite,
          username: "shared-fixture-student",
          password: "IsolatedStudentPassword123!",
        });
        const imported = (
          await teacher.ok("/api/words", "POST", { words: fixtures })
        ).words;
        const makeTask = (subject, wordIds) => ({
          title: `隔离-${subject}`,
          program,
          subject,
          mode: "mixed",
          duration: 15,
          opensAt: new Date(Date.now() - 1000).toISOString(),
          closesAt: new Date(Date.now() + 3600000).toISOString(),
          classIds: [cls.id],
          audience: "all",
          wordIds,
        });
        for (const subject of subjects) {
          await t.test(
            `${subject}: groups, examples, score and mistake subject`,
            async () => {
              const pool = imported.filter((w) =>
                wordAvailableFor(w, program, subject),
              );
              assert.equal(pool.length, 4);
              assert.deepEqual(
                [...new Set(pool.flatMap((w) => w.groups))].sort(),
                ["Unit 1", "Unit 2"],
              );
              const { task } = await teacher.ok(
                "/api/tasks",
                "POST",
                makeTask(
                  subject,
                  pool.map((w) => w.id),
                ),
              );
              assert.equal(task.program, program);
              assert.equal(task.subject, subject);
              const started = await student.ok(
                `/api/tasks/${task.id}/start`,
                "POST",
                {},
              );
              assert.equal(started.questions.length, 4);
              for (const [i, q] of started.questions.entries()) {
                assert.equal(q.subject, subject);
                assert.equal(
                  q.prompt,
                  i % 2 ? pool[i].sentenceZh : pool[i].sentence,
                );
                assert.ok(!("answer" in q));
              }
              const answers = Object.fromEntries(
                started.questions.map((q, i) => [
                  q.id,
                  i % 2 ? "intentional-error" : pool[i].translation,
                ]),
              );
              const final = (
                await student.ok(
                  `/api/attempts/${started.attempt.id}/submit`,
                  "POST",
                  { answers },
                )
              ).attempt;
              assert.equal(final.score, 50);
              assert.ok(Number.isFinite(final.elapsedSeconds));
              const rows = (await teacher.ok(`/api/results?task=${task.id}`))
                .results;
              const row = rows.find((r) => r.studentId === roster[0].id);
              assert.equal(row.program, program);
              assert.equal(row.subject, subject);
              assert.equal(row.score, 50);
              const mistakes = (
                await student.ok("/api/mistakes")
              ).mistakes.filter((m) => m.question.subject === subject);
              assert.equal(mistakes.length, 2);
              for (const m of mistakes)
                assert.ok(pool.some((w) => w.term === m.question.term));
            },
          );
        }
        if (backend === "node" && process.env.SHARED_BROWSER === "1") {
          await t.test(
            "browser: UOW subject mapping, shared groups, examples and publish selection",
            async () => {
              const { chromium } = await import("playwright");
              const browser = await chromium.launch({
                executablePath: process.env.BROWSER_PATH || undefined,
                headless: true,
                args:
                  process.env.BROWSER_NO_SANDBOX === "1"
                    ? ["--no-sandbox"]
                    : [],
              });
              try {
                const context = await browser.newContext({
                  serviceWorkers: "block",
                });
                const errors = [],
                  external = [];
                await context.route("**/*", (route) => {
                  const url = new URL(route.request().url());
                  if (
                    ["http:", "https:"].includes(url.protocol) &&
                    url.origin !== runtime.base
                  ) {
                    external.push(url.origin);
                    return route.abort("blockedbyclient");
                  }
                  return route.continue();
                });
                const cookie = teacher.cookie.slice(
                  teacher.cookie.indexOf("=") + 1,
                );
                await context.addCookies([
                  { name: "lexiclass", value: cookie, url: runtime.base },
                ]);
                const page = await context.newPage();
                page.on("pageerror", (error) => errors.push(error.message));
                await page.goto(runtime.base);
                await page.locator('.nav [data-view="words"]').click();
                await page
                  .locator('[data-filter="program"]')
                  .selectOption(program);
                const options = await page
                  .locator('[data-filter="subject"] option')
                  .evaluateAll((nodes) =>
                    nodes.map((n) => n.value).filter((x) => x !== "all"),
                  );
                assert.deepEqual(options.sort(), [...subjects].sort());
                for (const subject of subjects) {
                  await page
                    .locator('[data-filter="subject"]')
                    .selectOption(subject);
                  const groupOptions = await page
                    .locator('[data-filter="group"] option')
                    .evaluateAll((nodes) => nodes.map((n) => n.value));
                  assert.ok(
                    groupOptions.includes("Unit 1") &&
                      groupOptions.includes("Unit 2"),
                  );
                  await page
                    .locator('[data-filter="group"]')
                    .selectOption("Unit 1");
                  const pool = imported.filter(
                    (w) =>
                      wordAvailableFor(w, program, subject) &&
                      w.groups.includes("Unit 1"),
                  );
                  const cards = page.locator(".word-card");
                  assert.equal(await cards.count(), 2);
                  for (let i = 0; i < pool.length; i++) {
                    assert.equal(
                      await cards.nth(i).locator("h3").textContent(),
                      pool[i].term,
                    );
                    assert.equal(
                      await cards
                        .nth(i)
                        .locator(".word-sentence")
                        .textContent(),
                      pool[i].sentence,
                    );
                    assert.equal(
                      await cards
                        .nth(i)
                        .locator(".table-secondary")
                        .textContent(),
                      pool[i].sentenceZh,
                    );
                    assert.ok(
                      (await cards.nth(i).textContent()).includes(
                        "新南共用词库",
                      ),
                    );
                  }
                }
                await page.locator('.nav [data-view="tasks"]').click();
                await page.locator('[data-action="create-task"]').click();
                await page
                  .locator('#task-form [name="classId"]')
                  .selectOption(cls.id);
                for (const subject of subjects) {
                  await page
                    .locator('#task-form [name="subject"]')
                    .selectOption(subject);
                  assert.equal(
                    await page.locator("#task-words input").count(),
                    2,
                  );
                  assert.equal(
                    await page.locator("#task-students input:checked").count(),
                    1,
                  );
                  await page
                    .locator('#task-form [name="wordGroup"]')
                    .selectOption("Unit 2");
                  assert.equal(
                    await page.locator("#task-words input").count(),
                    2,
                  );
                  assert.equal(
                    await page.locator("#task-students input:checked").count(),
                    1,
                  );
                }
                assert.deepEqual(errors, []);
                assert.deepEqual(external, []);
              } finally {
                await browser.close();
              }
            },
          );
        }
        await t.test(
          "both English courses retain their own mistake subjects",
          async () => {
            const mistakes = (await student.ok("/api/mistakes")).mistakes;
            assert.equal(
              mistakes.filter((m) => m.question.subject === "Academic English")
                .length,
              2,
            );
            assert.equal(
              mistakes.filter((m) => m.question.subject === "Language Learning")
                .length,
              2,
            );
          },
        );
        await t.test(
          "repeating an English course increments its own errors without duplicating or relabelling the other",
          async () => {
            const subject = "Academic English",
              pool = imported.filter((w) =>
                wordAvailableFor(w, program, subject),
              );
            const { task } = await teacher.ok(
              "/api/tasks",
              "POST",
              makeTask(
                subject,
                pool.map((w) => w.id),
              ),
            );
            const started = await student.ok(
              `/api/tasks/${task.id}/start`,
              "POST",
              {},
            );
            const answers = Object.fromEntries(
              started.questions.map((q, i) => [
                q.id,
                i % 2 ? "intentional-error" : pool[i].translation,
              ]),
            );
            await student.ok(
              `/api/attempts/${started.attempt.id}/submit`,
              "POST",
              { answers },
            );
            await student.ok(
              `/api/attempts/${started.attempt.id}/submit`,
              "POST",
              { answers },
            );
            const mistakes = (await student.ok("/api/mistakes")).mistakes;
            const academic = mistakes.filter(
                (m) => m.question.subject === "Academic English",
              ),
              language = mistakes.filter(
                (m) => m.question.subject === "Language Learning",
              );
            assert.equal(academic.length, 2);
            assert.equal(language.length, 2);
            academic.forEach((m) => assert.equal(m.errorCount, 2));
            language.forEach((m) => assert.equal(m.errorCount, 1));
          },
        );
        await t.test(
          "unrelated UNSW Accounting and NCUK cross-program access are rejected",
          async () => {
            const account = imported.find((w) => w.subject === "Accounting");
            assert.equal(
              (
                await teacher.call(
                  "/api/tasks",
                  "POST",
                  makeTask("Economics", [account.id]),
                )
              ).status,
              400,
            );
            const ncuk = (
              await teacher.ok("/api/classes", "POST", {
                name: "隔离NCUK班",
                program: "NCUK 国际预科",
              })
            ).class;
            assert.equal(
              (
                await teacher.call("/api/tasks", "POST", {
                  ...makeTask("Economics", [
                    imported.find((w) => w.subject === "Economics").id,
                  ]),
                  program: "NCUK 国际预科",
                  classIds: [ncuk.id],
                })
              ).status,
              400,
            );
          },
        );
      } finally {
        await runtime.close();
      }
    },
  );
}
