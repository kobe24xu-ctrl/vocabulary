// Explicit programme/subject sharing; ownership and task audiences remain
// enforced by the server. References keep the original vocabulary IDs.
export const SHARED_WORD_BANKS = [
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
    subject: "Language Learning",
    sourceProgram: "UNSW 新南预科",
    sourceSubject: "English",
  },
];
export function wordAvailableFor(word, program, subject = "all") {
  if (word.archived) return false;
  if (program === "UNSW 新南预科" && subject === "Mathematics")
    return word.program === program && word.subject === subject;
  if (
    program === "UNSW 新南预科" &&
    word.program === "通用示例" &&
    word.subject === "Mathematics"
  )
    return false;
  if (program === "all") return subject === "all" || word.subject === subject;
  if (program === "NCUK 国际预科") {
    if (
      [
        "Business",
        "Economics",
        "English",
        "Physics",
        "Chemistry",
        "Integrated Mathematics",
        "Technical Mathematics",
      ].includes(subject)
    )
      return word.program === program && word.subject === subject;
    if (
      word.program === "通用示例" &&
      [
        "Business",
        "Economics",
        "English",
        "Physics",
        "Chemistry",
        "Integrated Mathematics",
        "Technical Mathematics",
      ].includes(word.subject)
    )
      return false;
  }
  // UOW mathematics and academic writing use their own imported banks.
  // Keep language learning on the existing shared UNSW English bank.
  if (program === "UOW 沃隆港预科") {
    if (["Academic English", "Mathematics"].includes(subject))
      return word.program === program && word.subject === subject;
    if (
      word.program === "通用示例" &&
      ["Academic English", "Mathematics"].includes(word.subject)
    )
      return false;
  }
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

// Student learning follows their class courses, including explicit shared banks.
// Return only learning material, without teacher-only grading/import metadata.
export function wordAvailableToClass(word, cls) {
  if (
    word.program === "通用示例" &&
    word.subject === "Mathematics" &&
    cls?.program === "NCUK 国际预科" &&
    cls.courses?.length
  )
    return false;
  if (!word.tracks?.length) return true;
  if (!cls) return false;
  const courses = (cls.courses || []).map((c) => c.subject);
  const track = courses.some((s) =>
    ["Physics", "Chemistry", "Technical Mathematics"].includes(s),
  )
    ? "Technical"
    : courses.some((s) =>
          ["Business", "Economics", "Integrated Mathematics"].includes(s),
        )
      ? "Integrated"
      : "";
  return word.tracks.includes(track);
}
export function learningWords(words, program, subjects, cls) {
  return [...new Set(subjects)].flatMap((subject) =>
    words
      .filter(
        (w) =>
          wordAvailableFor(w, program, subject) && wordAvailableToClass(w, cls),
      )
      .map((w) => ({
        id: w.id,
        program,
        subject,
        term: w.term,
        ...(w.partOfSpeech
          ? {
              partOfSpeech: w.partOfSpeech,
              partOfSpeechNote: w.partOfSpeechNote || "",
            }
          : {}),
        translation: w.translation,
        sentence: w.sentence,
        sentenceZh: w.sentenceZh,
        groups: Array.isArray(w.groups) ? w.groups : [],
        source: w.source || "",
      })),
  );
}

// Shared source IDs stay unchanged in questions. Separate the review identity
// only where two UOW courses reuse the same English source vocabulary.
export function reviewWordKey(program, wordId, subject) {
  return program === "UOW 沃隆港预科" &&
    ["Academic English", "Language Learning"].includes(subject)
    ? `uow-review:${subject}:${wordId}`
    : wordId;
}
