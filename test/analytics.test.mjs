import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enrichGradeRows,
  gradeAverage,
  summarizeGrades,
  scoreBand,
} from "../public/analytics.js";
test("grades exclude pending attempts and preserve zero scores", () => {
  const rows = [
    { state: "submitted", score: 0 },
    { state: "submitted", score: 80 },
    { state: "pending", score: null },
  ];
  assert.equal(gradeAverage(rows), 40);
  assert.equal(gradeAverage([rows[2]]), null);
  assert.equal(scoreBand(rows[0]), "low");
  assert.equal(scoreBand(rows[2]), "pending");
});
test("historical maths grades map to class course and actual vocabulary weeks, never calendar dates", () => {
  const rows = enrichGradeRows(
    [
      {
        taskId: "t",
        program: "NCUK 国际预科",
        subject: "Mathematics",
        classId: "c",
        state: "submitted",
        score: 80,
      },
    ],
    [{ id: "t", wordIds: ["a", "b"], opensAt: Date.now() }],
    [
      { id: "a", groups: ["Week 05｜第5周"] },
      { id: "b", groups: ["Week 06｜第6周"] },
    ],
    [{ id: "c", courses: [{ subject: "Technical Mathematics" }] }],
  );
  assert.equal(rows[0].subject, "Technical Mathematics");
  assert.deepEqual(rows[0].groups, ["Week 05", "Week 06"]);
  assert.equal(summarizeGrades(rows, "groups").length, 2);
  assert.equal(gradeAverage(rows), 80);
});
test("saved task groups survive bank edits; unknown historical groups stay ungrouped", () => {
  const rows = enrichGradeRows(
    [
      { taskId: "a" },
      { taskId: "b", result: { results: [{ wordId: "gone" }] } },
    ],
    [
      { id: "a", wordGroups: ["Week 07｜第7周"], title: "Exam" },
      { id: "b", title: "Exam" },
    ],
    [],
    [],
  );
  assert.deepEqual(rows[0].groups, ["Week 07"]);
  assert.deepEqual(rows[1].groups, []);
  assert.equal(summarizeGrades(rows, "groups")[1].value, "未标注周次 / 单元");
});
