import { test } from "node:test";
import assert from "node:assert/strict";
import { gradingConfiguration, markWithAI } from "../lib/semantic-grading.mjs";

const question = (changes = {}) => ({
  id: "q1",
  wordId: "isolated-word",
  direction: "en-zh",
  subject: "Business",
  focus: "working capital",
  prompt: "The retailer needs working capital to pay suppliers.",
  answer: "营运资金",
  accepted: ["营运资金"],
  choices: null,
  ...changes,
});
const openai = {
  GRADING_PROVIDER: "openai",
  OPENAI_API_KEY: "isolated-placeholder",
  OPENAI_GRADING_MODEL: "isolated-model",
};
const verdict = (decision) =>
  new Response(
    JSON.stringify({
      status: "completed",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ verdicts: [{ id: "q1", decision }] }),
            },
          ],
        },
      ],
    }),
  );

test("grading defaults to Workers AI and requires explicit OpenAI configuration", () => {
  assert.equal(gradingConfiguration({ AI: {} }).provider, "workers-ai");
  assert.equal(
    gradingConfiguration({ GRADING_PROVIDER: "openai" }).configured,
    false,
  );
  assert.equal(gradingConfiguration(openai).model, "isolated-model");
});

test("choice and standard-matched answers never call either AI provider", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("No external call permitted");
  });
  const env = {
    ...openai,
    AI: {
      run() {
        throw new Error("No Workers AI call permitted");
      },
    },
  };
  const choice = question({
    choices: ["营运资金", "利息", "收入", "成本", "股息"],
  });
  assert.equal((await markWithAI([choice], { q1: "股息" }, env)).score, 0);
  assert.equal(
    (await markWithAI([question()], { q1: "营运资金" }, env)).score,
    100,
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test("OpenAI adapter sends only the unmatched subjective question and parses JSON", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.redirect, "error");
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.model, "isolated-model");
    const items = JSON.parse(body.input[1].content);
    assert.equal(items.length, 1);
    assert.equal(items[0].studentAnswer, "经营周转资金");
    assert.equal("studentName" in items[0], false);
    return verdict("correct");
  });
  const result = await markWithAI([question()], { q1: "经营周转资金" }, openai);
  assert.equal(result.score, 100);
  assert.equal(result.results[0].gradingMethod, "ai");
  assert.equal(fetch.mock.callCount(), 1);
});

test("provider errors preserve standard scores with an explicit fallback flag", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("unavailable", { status: 503 }),
  );
  const result = await markWithAI([question()], { q1: "经营周转资金" }, openai);
  assert.equal(result.score, 0);
  assert.equal(result.semanticGrading.fallback, true);
});

test("OpenAI can review English synonyms while mathematical notation remains deterministic", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    verdict("correct"),
  );
  const english = question({
    direction: "zh-en",
    focus: "营运资金",
    answer: "working capital",
    accepted: ["working capital"],
  });
  assert.equal(
    (await markWithAI([english], { q1: "net current assets" }, openai)).score,
    100,
  );
  const math = question({
    direction: "zh-en",
    subject: "Mathematics",
    answerKind: "math-notation",
    answer: "P(A')",
    accepted: ["P(A')"],
  });
  assert.equal((await markWithAI([math], { q1: "P(A)" }, openai)).score, 0);
  assert.equal(fetch.mock.callCount(), 1);
});
