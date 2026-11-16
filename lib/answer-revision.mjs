export function answerRevisionBase(body, attempt) {
  if (body.baseRevision === undefined) return attempt.answer_revision || 0;
  if (
    !Number.isSafeInteger(body.baseRevision) ||
    body.baseRevision < 0 ||
    body.baseRevision >= Number.MAX_SAFE_INTEGER
  )
    throw Object.assign(new Error("答案保存版本无效，请刷新后重试。"), {
      status: 400,
    });
  return body.baseRevision;
}
export function answerRevisionConflict(attempt) {
  return new Response(
    JSON.stringify({
      error: "答案已更新，正在合并本机草稿。",
      answers: JSON.parse(attempt.answers),
      answerRevision: attempt.answer_revision || 0,
    }),
    {
      status: 409,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
