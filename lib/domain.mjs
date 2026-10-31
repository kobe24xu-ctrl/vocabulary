import { randomInt } from "node:crypto";
import { SAMPLE_WORDS } from "./words.mjs";
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, "");
export const isCorrect = (value, answers) =>
  normalize(value).length > 0 &&
  answers.some((a) => normalize(a) === normalize(value));
export function buildQuestions(
  words,
  mode,
  pool = words,
  questionType = mode === "choice" ? "choice" : "fill",
) {
  if (!["choice", "fill"].includes(questionType))
    throw new Error("请选择选择题或填空题。");
  return words.map((word, index) => {
    const direction = mode === "mixed" ? (index % 2 ? "zh-en" : "en-zh") : mode;
    const english = direction === "zh-en";
    const answer = english ? word.term : word.translation;
    const accepted = english
      ? [word.term, ...(word.enAliases || [])]
      : [word.translation, ...(word.aliases || [])];
    let choices = null;
    if (questionType === "choice") {
      const excluded = new Set(accepted.map(normalize));
      const seen = new Set(excluded);
      const collect = (candidates) => {
        const options = [];
        for (const w of candidates) {
          const value = english ? w.term : w.translation;
          const key = normalize(value);
          const aliases = english ? w.enAliases || [] : w.aliases || [];
          if (
            !key ||
            seen.has(key) ||
            aliases.some((a) => excluded.has(normalize(a)))
          )
            continue;
          seen.add(key);
          options.push(value);
        }
        for (let i = options.length - 1; i > 0; i--) {
          const j = randomInt(i + 1);
          [options[i], options[j]] = [options[j], options[i]];
        }
        return options;
      };
      // Prefer the full subject bank, even when just one word/unit was selected.
      // Small banks can use original teaching examples as fallback distractors.
      const distractors = collect(pool.filter((w) => w.id !== word.id));
      if (distractors.length < 4)
        distractors.push(
          ...collect(SAMPLE_WORDS.filter((w) => w.subject === word.subject)),
        );
      if (distractors.length < 4) distractors.push(...collect(SAMPLE_WORDS));
      if (distractors.length < 4)
        throw new Error("无法生成五个不同选项，请补充词库。");
      choices = [answer, ...distractors.slice(0, 4)];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
    }
    return {
      id: `q${index + 1}`,
      wordId: word.id,
      direction,
      subject: word.subject,
      focus: english ? word.translation : word.term,
      prompt: english ? word.sentenceZh : word.sentence,
      choices,
      answer,
      accepted,
      term: word.term,
      translation: word.translation,
      sentence: word.sentence,
      sentenceZh: word.sentenceZh,
    };
  });
}
export const publicQuestion = ({
  id,
  wordId,
  direction,
  subject,
  focus,
  prompt,
  choices,
}) => ({ id, wordId, direction, subject, focus, prompt, choices });
export function mark(questions, answers) {
  const results = questions.map((q) => ({
    questionId: q.id,
    wordId: q.wordId,
    prompt: q.prompt,
    focus: q.focus,
    direction: q.direction,
    questionType: q.choices ? "choice" : "fill",
    answer: q.answer,
    accepted: q.accepted,
    submitted: String(answers[q.id] ?? ""),
    correct: isCorrect(answers[q.id], q.accepted),
  }));
  const correct = results.filter((r) => r.correct).length;
  return {
    results,
    correct,
    total: questions.length,
    score: Math.round((correct / questions.length) * 100),
  };
}

// Use persisted server timestamps; cap automatic submissions at the deadline.
// Processing delays and client clock changes must not increase exam duration.
export function attemptTiming(startedAt, submittedAt, deadline) {
  const start = Number.isFinite(startedAt) ? startedAt : null;
  const finish = Number.isFinite(submittedAt)
    ? Math.min(submittedAt, Number.isFinite(deadline) ? deadline : submittedAt)
    : null;
  return {
    startedAt: start,
    finishedAt: finish,
    elapsedSeconds:
      start !== null && finish !== null
        ? Math.max(0, Math.floor((finish - start) / 1000))
        : null,
  };
}
