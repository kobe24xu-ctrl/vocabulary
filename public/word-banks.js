// Explicit programme/subject sharing; ownership and task audiences remain
// enforced by the server. References keep the original vocabulary IDs.
export const SHARED_WORD_BANKS = [
  {
    program: "UOW 沃隆港预科",
    subject: "Mathematics",
    sourceProgram: "UNSW 新南预科",
    sourceSubject: "Mathematics",
  },
  {
    program: "UOW 沃隆港预科",
    subject: "Computer Science",
    sourceProgram: "UNSW 新南预科",
    sourceSubject: "Computer Science",
  },
  {
    program: "UOW 沃隆港预科",
    subject: "Economics",
    sourceProgram: "UNSW 新南预科",
    sourceSubject: "Economics",
  },
  {
    program: "UOW 沃隆港预科",
    subject: "Academic English",
    sourceProgram: "UNSW 新南预科",
    sourceSubject: "English",
  },
  {
    program: "UOW 沃隆港预科",
    subject: "Language Learning",
    sourceProgram: "UNSW 新南预科",
    sourceSubject: "English",
  },
];
export function wordAvailableFor(word, program, subject = "all") {
  if (program === "all") return subject === "all" || word.subject === subject;
  if (
    (word.program === program || word.program === "通用示例") &&
    (subject === "all" || word.subject === subject)
  )
    return true;
  return SHARED_WORD_BANKS.some(
    (rule) =>
      rule.program === program &&
      rule.sourceProgram === word.program &&
      rule.sourceSubject === word.subject &&
      (subject === "all" || rule.subject === subject),
  );
}
export function sharedWordSubjects(program) {
  return [
    ...new Set(
      SHARED_WORD_BANKS.filter((rule) => rule.program === program).map(
        (rule) => rule.subject,
      ),
    ),
  ];
}

// Shared source IDs stay unchanged in questions. Separate the review identity
// only where two UOW courses reuse the same English source vocabulary.
export function reviewWordKey(program, wordId, subject) {
  return program === "UOW 沃隆港预科" &&
    ["Academic English", "Language Learning"].includes(subject)
    ? `uow-review:${subject}:${wordId}`
    : wordId;
}
