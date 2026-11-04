import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { automaticTaskTitle, planSchedule } from "../public/scheduling.js";
const groups = ["Week 05｜第5周", "Week 06｜第6周", "Week 07｜第7周"];
const settings = {
  opensAt: "2026-11-04T13:00",
  closesAt: "2026-11-04T14:00",
  groups,
  startGroup: groups[0],
};
test("calendar skips holiday dates while advancing the vocabulary group in Beijing time", () => {
  const plan = planSchedule({
    ...settings,
    dates: ["2026-11-25", "2026-11-18"],
  });
  assert.deepEqual(
    plan.map((x) => x.group),
    groups,
  );
  assert.equal(plan[1].opensAt, "2026-11-18T05:00:00.000Z");
  assert.equal(plan[1].closesAt, "2026-11-18T06:00:00.000Z");
});
test("calendar supports explicit group overrides and rejects missing groups and past dates", () => {
  assert.equal(
    planSchedule({
      ...settings,
      dates: ["2026-11-18"],
      overrides: { "2026-11-18": groups[2] },
    })[1].group,
    groups[2],
  );
  assert.throws(() =>
    planSchedule({
      ...settings,
      dates: ["2026-11-18", "2026-11-25", "2026-12-02"],
    }),
  );
  assert.throws(() => planSchedule({ ...settings, dates: ["2026-11-03"] }));
  assert.throws(() =>
    planSchedule({ ...settings, dates: ["2026-11-18"], startGroup: "all" }),
  );
});
test("automatic names include project, separate maths course and week", () => {
  assert.equal(
    automaticTaskTitle("NCUK 国际预科", "Technical Mathematics", groups[0], {
      "Technical Mathematics": "工科数学",
    }),
    "NCUK · 工科数学 · W05",
  );
});
test("math course migration retains word identities, accounts and unrelated courses", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE users(id TEXT,password TEXT); INSERT INTO users VALUES('student','isolated-stored-password');
 CREATE TABLE classes(id TEXT,program TEXT);INSERT INTO classes VALUES('business','NCUK 国际预科'),('technical','NCUK 国际预科');
 CREATE TABLE class_courses(class_id TEXT,subject TEXT,title TEXT,content TEXT,source TEXT,PRIMARY KEY(class_id,subject));
 INSERT INTO class_courses VALUES('business','Mathematics','数学','',''),('business','Business','商务','',''),('technical','Mathematics','数学','',''),('technical','Physics','物理','','');
 CREATE TABLE words(id TEXT,content TEXT);`);
  for (const [id, track] of [
    ["a", "Integrated"],
    ["b", "Technical"],
  ])
    db.prepare("INSERT INTO words VALUES(?,?)").run(
      id,
      JSON.stringify({
        program: "NCUK 国际预科",
        subject: "Mathematics",
        tracks: [track],
      }),
    );
  const migration = readFileSync(
    new URL(
      "../cloudflare/migrations/0005_ncuk_math_courses.sql",
      import.meta.url,
    ),
    "utf8",
  );
  db.exec(migration);
  db.exec(migration);
  assert.equal(
    JSON.parse(
      db.prepare("SELECT content FROM words WHERE id='a'").get().content,
    ).subject,
    "Integrated Mathematics",
  );
  assert.equal(
    JSON.parse(
      db.prepare("SELECT content FROM words WHERE id='b'").get().content,
    ).subject,
    "Technical Mathematics",
  );
  assert.equal(
    db
      .prepare(
        "SELECT count(*) AS n FROM class_courses WHERE subject='Mathematics'",
      )
      .get().n,
    0,
  );
  assert.equal(
    db.prepare("SELECT password FROM users WHERE id='student'").get().password,
    "isolated-stored-password",
  );
  assert.equal(
    db
      .prepare(
        "SELECT count(*) AS n FROM class_courses WHERE subject='Physics'",
      )
      .get().n,
    1,
  );
  db.close();
});
