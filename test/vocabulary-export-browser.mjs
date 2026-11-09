import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";
const folder = mkdtempSync(join(tmpdir(), "lexiclass-export-")),
  out = resolve("dist/vocabulary-export-check");
mkdirSync(out, { recursive: true });
const child = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    DATA_DIR: folder,
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
    child.stdout.on("data", (b) => {
      const m = String(b).match(/listening on port (\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${m[1]}`);
      }
    });
    child.on("exit", (c) => reject(Error(`server ${c}`)));
  });
  const client = () => ({
    cookie: "",
    async call(path, data) {
      const r = await fetch(base + path, {
        method: data ? "POST" : "GET",
        headers: { "Content-Type": "application/json", Cookie: this.cookie },
        body: data ? JSON.stringify(data) : undefined,
      });
      const cookie = r.headers.get("set-cookie");
      if (cookie) this.cookie = cookie.split(";")[0];
      return { status: r.status, data: await r.json() };
    },
    async ok(...args) {
      const r = await this.call(...args);
      assert.equal(r.status, 200, JSON.stringify(r.data));
      return r.data;
    },
  });
  const teacher = client(),
    student = client();
  await teacher.ok("/api/setup", {
    setupKey: readFileSync(join(folder, "setup-key"), "utf8"),
    password: "IsolatedExportPassword123!",
    className: "导出隔离班",
  });
  const teacherId = (await teacher.ok("/api/me")).user.id;
  const cls = (await teacher.ok("/api/classes")).classes[0];
  const roster = (
    await teacher.ok("/api/students", {
      students: [{ name: "隔离测试学生", classId: cls.id }],
    })
  ).students;
  await student.ok("/api/student/activate", {
    name: roster[0].name,
    invite: roster[0].invite,
    username: "export-fixture-student",
    password: "IsolatedStudentPassword123!",
  });
  const input = process.env.EXPORT_FIXTURE_FILE
    ? JSON.parse(readFileSync(process.env.EXPORT_FIXTURE_FILE, "utf8")).map(
        (r) => ({ ...JSON.parse(r.content), id: r.id }),
      )
    : Array.from({ length: 80 }, (_, i) => ({
        id: `export-word-${i}`,
        program: "NCUK 国际预科",
        subject: "English",
        term: `vocabulary ${i}`,
        translation: `词义${i}`,
        partOfSpeech: "n. 名词",
        partOfSpeechNote: "名词用法说明",
        sentence: `Use vocabulary ${i} in the sentence.`,
        sentenceZh: `在句子中使用词义${i}。`,
        groups: [
          `Week ${String((i % 4) + 1).padStart(2, "0")}｜第${(i % 4) + 1}周`,
        ],
        source: "隔离词表",
        originalRows: [{ file: "隔离老师词表.docx", row: i + 1 }],
      }));
  const db = new DatabaseSync(join(folder, "lexiclass.sqlite"));
  const insert = db.prepare(
    "INSERT INTO words(id,owner_id,content) VALUES(?,?,?)",
  );
  for (const word of input)
    insert.run(word.id, teacherId, JSON.stringify(word));
  for (const [id, program, subject] of [
    ["other-subject", "NCUK 国际预科", "Economics"],
    ["other-program", "UOW 沃隆港预科", "Mathematics"],
    ["archived-word", "NCUK 国际预科", "English"],
  ]) {
    const w = {
      ...input[0],
      id,
      program,
      subject,
      archived: id === "archived-word",
    };
    insert.run(id, teacherId, JSON.stringify(w));
  }
  db.prepare(
    "INSERT INTO users(id,role,name,demo,created_at) VALUES(?,?,?,?,?)",
  ).run("foreign-owner", "teacher", "Other isolated owner", 1, Date.now());
  insert.run(
    "foreign-secret",
    "foreign-owner",
    JSON.stringify({
      ...input[0],
      id: "foreign-secret",
      term: "MUST_NOT_EXPORT_FOREIGN_OWNER",
    }),
  );
  assert.equal((await client().call("/api/words")).status, 401);
  assert.equal((await student.call("/api/words")).status, 403);
  assert.ok(
    !(await teacher.ok("/api/words")).words.some(
      (w) => w.id === "foreign-secret",
    ),
  );
  const tables = ["users", "words", "tasks", "attempts", "mistakes"],
    snapshot = () =>
      Object.fromEntries(
        tables.map((t) => [
          t,
          JSON.stringify(db.prepare(`SELECT * FROM ${t} ORDER BY id`).all()),
        ]),
      );
  const before = snapshot(),
    errors = [];
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    serviceWorkers: "block",
    acceptDownloads: true,
  });
  await context.addCookies([
    {
      name: "lexiclass",
      value: teacher.cookie.slice(teacher.cookie.indexOf("=") + 1),
      url: base,
    },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator('.nav [data-view="words"]').click();
  await page
    .locator('[data-action="library-program"][data-key="NCUK 国际预科"]')
    .click();
  await page
    .locator('[data-action="library-subject"][data-key="English"]')
    .click();
  assert.equal(await page.locator(".word-card").count(), 60);
  await page.locator('[data-filter="search"]').fill(input[0].term);
  await page.locator('[data-filter="search"]').press("Tab");
  await page.getByRole("button", { name: "导出单词", exact: true }).click();
  await page
    .locator('#vocabulary-export-form [name="subject"]')
    .selectOption("Economics");
  assert.match(
    await page.locator("#vocabulary-export-count").textContent(),
    /1 条/,
  );
  await page
    .locator('#vocabulary-export-form [name="program"]')
    .selectOption("UOW 沃隆港预科");
  assert.equal(
    await page.locator('#vocabulary-export-form [name="subject"]').inputValue(),
    "Mathematics",
  );
  await page
    .locator('#vocabulary-export-form [name="program"]')
    .selectOption("NCUK 国际预科");
  await page
    .locator('#vocabulary-export-form [name="subject"]')
    .selectOption("English");
  assert.match(
    await page.locator("#vocabulary-export-count").textContent(),
    new RegExp(`${input.length} 条`),
  );
  await page.screenshot({
    path: join(out, "desktop.png"),
    animations: "disabled",
  });
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Excel", exact: true }).click();
  const download = await downloading;
  assert.match(
    download.suggestedFilename(),
    /^NCUK_英语_词库_\d{4}-\d{2}-\d{2}\.xlsx$/,
  );
  const path = join(out, download.suggestedFilename());
  await download.saveAs(path);
  assert.equal(await download.failure(), null);
  const expectedFile = join(out, "expected.json");
  writeFileSync(expectedFile, JSON.stringify(input));
  const verify = `import json,sys,zipfile,collections\nfrom openpyxl import load_workbook\np,expected=sys.argv[1:]\nwords=json.load(open(expected));w=load_workbook(p,read_only=True,data_only=False)\nassert w.sheetnames==['导出说明','词库总表','按周词表','完整JSON']\nassert w['词库总表'].max_row-1==len(words)\nn=sum(len(x.get('groups') or ['未分组'])for x in words)\nassert w['按周词表'].max_row-1==n\nparts=collections.defaultdict(list)\nfor row in w['完整JSON'].iter_rows(min_row=2,values_only=True):parts[row[0]].append((row[2],row[3]))\nactual={k:json.loads(''.join(text for _,text in sorted(v)))for k,v in parts.items()}\nassert actual=={x['id']:x for x in words}\nassert not any(c.data_type=='f'for s in w for row in s for c in row)\nwith zipfile.ZipFile(p)as z:\n assert z.testzip() is None\n assert all(b'MUST_NOT_EXPORT_FOREIGN_OWNER'not in z.read(name)for name in z.namelist())\nprint(json.dumps({'records':len(words),'weeklyRows':n,'allFieldsMatched':True,'xlsxZipCRC':True}))\n`;
  const workbook = JSON.parse(
    execFileSync("python3", ["-c", verify, path, expectedFile], {
      encoding: "utf8",
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "导出单词", exact: true }).click();
  await page.screenshot({
    path: join(out, "mobile.png"),
    animations: "disabled",
  });
  assert.deepEqual(
    await page.evaluate(() => [
      innerWidth,
      document.documentElement.scrollWidth,
    ]),
    [390, 390],
  );
  const mobileDownloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Excel", exact: true }).click();
  const mobileDownload = await mobileDownloading;
  await mobileDownload.saveAs(join(out, "mobile.xlsx"));
  assert.equal(await mobileDownload.failure(), null);
  const studentContext = await browser.newContext({ serviceWorkers: "block" });
  await studentContext.addCookies([
    {
      name: "lexiclass",
      value: student.cookie.slice(student.cookie.indexOf("=") + 1),
      url: base,
    },
  ]);
  const learner = await studentContext.newPage();
  await learner.goto(base);
  assert.equal(
    await learner.locator('[data-action="export-words"]').count(),
    0,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(snapshot(), before);
  db.close();
  const report = {
    ...workbook,
    filename: download.suggestedFilename(),
    mobileDownload: true,
    mobileOverflow: false,
    studentForbidden: true,
    foreignOwnerExcluded: true,
    dataUnchanged: true,
    errors,
  };
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit").catch(() => {});
  }
  rmSync(folder, { recursive: true, force: true });
}
