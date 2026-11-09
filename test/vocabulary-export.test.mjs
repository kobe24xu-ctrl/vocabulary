import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildVocabularyWorkbook,
  exportableWords,
  vocabularyExportFilename,
} from "../public/vocabulary-export.js";

const word = {
  id: "fixture-word",
  program: "NCUK 国际预科",
  subject: "English",
  term: '=HYPERLINK("example") & <term>',
  translation: "测试词义",
  partOfSpeech: "n. 名词",
  partOfSpeechNote: "名词用法说明",
  sentence: 'Use the "term" & keep <context>.',
  sentenceZh: "保留中文例句与换行\n第二行。",
  groups: ["Week 01｜第1周", "Week 02｜第2周"],
  source: "老师词表.xlsx",
  aliases: ["测试释义"],
  enAliases: ["equivalent"],
  originalRows: [{ file: "英语单词w5-14.docx", row: 12, weeks: [5] }],
};
function unzipStored(bytes) {
  const result = new Map(),
    buffer = Buffer.from(bytes);
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(buffer.readUInt16LE(offset + 8), 0);
    const size = buffer.readUInt32LE(offset + 18),
      nameSize = buffer.readUInt16LE(offset + 26),
      extra = buffer.readUInt16LE(offset + 28);
    const name = buffer
      .subarray(offset + 30, offset + 30 + nameSize)
      .toString();
    const start = offset + 30 + nameSize + extra;
    result.set(name, buffer.subarray(start, start + size).toString());
    offset = start + size;
  }
  assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
  assert.equal(buffer.readUInt32LE(buffer.length - 22), 0x06054b50);
  return result;
}
test("vocabulary export selects real active words, excludes built-ins and preserves shared sources", () => {
  const input = [
    word,
    { ...word, id: "sample-1" },
    { ...word, id: "archived", archived: true },
    { ...word, id: "other-project", program: "UNSW 新南预科" },
    { ...word, id: "other-subject", subject: "Economics" },
  ];
  assert.deepEqual(exportableWords(input, word.program, "English"), [word]);
  assert.deepEqual(exportableWords(input, "all", "English"), []);
  assert.deepEqual(exportableWords(input, word.program, "all"), []);
  const shared = { ...word, id: "shared-word", program: "UNSW 新南预科" };
  assert.deepEqual(
    exportableWords([shared], "UOW 沃隆港预科", "Language Learning"),
    [shared],
  );
  assert.equal(shared.subject, "English");
});
test("vocabulary XLSX retains Chinese, POS, examples, weekly repeats and raw fields without formulas", () => {
  const before = JSON.stringify(word);
  const files = unzipStored(
    buildVocabularyWorkbook([word], {
      program: word.program,
      subjectName: "英语",
      exportedAt: 0,
    }),
  );
  assert.equal(files.size, 9);
  const main = files.get("xl/worksheets/sheet2.xml");
  for (const text of [
    "测试词义",
    "n. 名词",
    "名词用法说明",
    "中文例句",
    "老师词表.xlsx",
    "英语单词w5-14.docx",
    "&amp;",
    "&lt;",
    "HYPERLINK",
    't="inlineStr"',
  ])
    assert.ok(main.includes(text), text);
  assert.ok(!main.includes("<f>"));
  assert.equal((main.match(/<row /g) || []).length, 2);
  assert.equal(
    (files.get("xl/worksheets/sheet3.xml").match(/<row /g) || []).length,
    3,
  );
  assert.ok(files.get("xl/worksheets/sheet4.xml").includes("originalRows"));
  assert.equal(JSON.stringify(word), before);
  assert.throws(
    () =>
      buildVocabularyWorkbook([], {
        program: word.program,
        subjectName: "英语",
      }),
    /暂无/,
  );
});
test("vocabulary export uses a Chinese XLSX filename and Beijing date, sanitizing path characters", () => {
  assert.equal(
    vocabularyExportFilename(
      "NCUK 国际预科",
      "英语",
      Date.parse("2026-11-09T16:30:00Z"),
    ),
    "NCUK_英语_词库_2026-11-10.xlsx",
  );
  assert.ok(
    !/[<>:"/\\|?*]/.test(
      vocabularyExportFilename("NCUK 国际预科", "英/语:*?", 0),
    ),
  );
});
test("oversized raw metadata is split without losing Unicode or original fields", () => {
  const extended = { ...word, original: "😀课程".repeat(10000) };
  const files = unzipStored(
    buildVocabularyWorkbook([extended], {
      program: word.program,
      subjectName: "英语",
    }),
  );
  const raw = files.get("xl/worksheets/sheet4.xml");
  assert.ok((raw.match(/<row /g) || []).length > 2);
  assert.ok(!raw.includes("�"));
});
