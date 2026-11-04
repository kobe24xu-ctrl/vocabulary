import { randomInt } from "node:crypto";
import { buildQuestions, normalize } from "./domain.mjs";
import { SUBJECT_NAMES } from "./words.mjs";

// Keep the factual case intact. Vary the revision task around that case, rather
// than inventing numerical/scientific facts or making unmetered AI requests.
export function buildPracticeQuestions(
  words,
  mode,
  pool,
  questionType,
  references = [],
) {
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const optionPool = [...new Map(pool.map((word) => [word.id, word])).values()];
  for (let i = optionPool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [optionPool[i], optionPool[j]] = [optionPool[j], optionPool[i]];
  }
  optionPool.length = Math.min(optionPool.length, 80);
  const questions = buildQuestions(shuffled, mode, optionPool, questionType);
  return questions.map((q) => {
    const old = references.filter((r) => r.wordId === q.wordId);
    const subject = SUBJECT_NAMES[q.subject] || q.subject;
    const base = q.direction === "zh-en" ? q.sentenceZh : q.sentence;
    const variants =
      q.direction === "zh-en"
        ? [
            `课堂复习中，一位同学写道：“${base}” 请根据语境写出“${q.focus}”对应的英文词汇或短语。`,
            `请为这道${subject}题整理英文笔记：“${base}” 其中“${q.focus}”用英文应如何表达？`,
            `同伴互测：读完“${base}”，请把标出的“${q.focus}”译成准确的英文。`,
            `复习${subject}时，请阅读：“${base}” 写出语境中“${q.focus}”的英文表达。`,
          ]
        : [
            `A student is revising this statement: “${base}” Translate the highlighted expression “${q.focus}” into Chinese in this context.`,
            `Read this revision-card example: “${base}” What does “${q.focus}” mean in Chinese here?`,
            `For a peer-study activity, consider: “${base}” Give the Chinese meaning of “${q.focus}” as used in this example.`,
            `Use the following context for a vocabulary check: “${base}” Explain “${q.focus}” in Chinese.`,
          ];
    const fresh = variants.filter((v) => !old.some((r) => r.prompt === v));
    q.prompt = (fresh.length ? fresh : variants)[
      randomInt((fresh.length ? fresh : variants).length)
    ];
    if (q.choices) {
      const excluded = new Set(
        old.flatMap((r) => r.choices || []).map(normalize),
      );
      const existing = new Set(q.choices.map(normalize));
      const accepted = new Set(q.accepted.map(normalize));
      const extra = optionPool
        .filter(
          (w) =>
            !(
              q.direction === "zh-en" ? w.enAliases || [] : w.aliases || []
            ).some((a) => accepted.has(normalize(a))),
        )
        .map((w) => (q.direction === "zh-en" ? w.term : w.translation))
        .filter(
          (v) =>
            !excluded.has(normalize(v)) &&
            !existing.has(normalize(v)) &&
            !accepted.has(normalize(v)),
        );
      // Change a distractor where possible, not only its position.
      if (extra.length && old.some((r) => r.choices)) {
        const wrong = q.choices.findIndex(
          (v) => normalize(v) !== normalize(q.answer),
        );
        q.choices[wrong] = extra[randomInt(extra.length)];
      }
      let turns = 0;
      while (
        old.some(
          (r) => JSON.stringify(r.choices) === JSON.stringify(q.choices),
        ) &&
        turns++ < 5
      )
        q.choices.push(q.choices.shift());
    }
    return q;
  });
}
