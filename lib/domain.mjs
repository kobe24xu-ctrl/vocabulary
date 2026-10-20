import { randomInt } from "node:crypto";
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, "");
export const isCorrect = (value, answers) =>
  normalize(value).length > 0 &&
  answers.some((a) => normalize(a) === normalize(value));
export function buildQuestions(words, mode, pool = words) {
  return words.map((word, index) => {
    const direction = mode === "mixed" ? (index % 2 ? "zh-en" : "en-zh") : mode;
    const english = direction === "zh-en";
    let choices = null;
    if (direction === "choice") {
      const distractors = [
        ...new Set(
          pool
            .filter(
              (w) => w.id !== word.id && w.translation !== word.translation,
            )
            .map((w) => w.translation),
        ),
      ];
      for (let i = distractors.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
      }
      if (distractors.length < 3)
        throw new Error("选择题至少需要四个不同释义的词汇。");
      choices = [word.translation, ...distractors.slice(0, 3)];
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
      answer: english ? word.term : word.translation,
      accepted: english
        ? [word.term, ...(word.enAliases || [])]
        : [word.translation, ...(word.aliases || [])],
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
