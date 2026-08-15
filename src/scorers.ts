import type { TestCase, ScoreResult } from "./types.js";

const WORKERS_AI_URL = process.env.WORKERS_AI_URL ?? "";
const WORKERS_AI_TOKEN = process.env.WORKERS_AI_TOKEN ?? "";
const JUDGE_MODEL = "@cf/meta/llama-3.1-8b-instruct";

async function callWorkersAI(prompt: string): Promise<string> {
  const res = await fetch(`${WORKERS_AI_URL}/${JUDGE_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WORKERS_AI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
    }),
  });
  if (!res.ok) throw new Error(`Workers AI error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { result: { response: unknown } };
  const output = data.result.response;
  return (typeof output === "string" ? output : JSON.stringify(output)).trim();
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.!?]+$/, "");
}

function scoreExact(actual: string, expected: string): number {
  return normalize(actual) === normalize(expected) ? 1 : 0;
}

function scoreRegex(actual: string, pattern: string): number {
  return new RegExp(pattern).test(actual) ? 1 : 0;
}

function scoreSchema(actual: string): number {
  try {
    JSON.parse(actual);
    return 1;
  } catch {
    return 0;
  }
}

async function scoreLLMJudge(actual: string, criteria: string): Promise<{ score: number; reason: string }> {
  const judgePrompt = `You are grading an AI response against a criterion.
Criterion: ${criteria}
Response: ${actual}

Reply with exactly one line: "PASS" or "FAIL", followed by a short reason.`;
  const verdict = await callWorkersAI(judgePrompt);
  const pass = verdict.toUpperCase().startsWith("PASS");
  return { score: pass ? 1 : 0, reason: verdict };
}

export async function runCase(testCase: TestCase, getModelOutput: (prompt: string) => Promise<string>): Promise<ScoreResult> {
  const actual = await getModelOutput(testCase.prompt);

  let score = 0;
  let reason: string | undefined;

  switch (testCase.scorer) {
    case "exact":
      score = scoreExact(actual, testCase.expected);
      break;
    case "regex":
      score = scoreRegex(actual, testCase.expected);
      break;
    case "schema":
      score = scoreSchema(actual);
      break;
    case "llm-judge": {
      const result = await scoreLLMJudge(actual, testCase.criteria ?? testCase.expected);
      score = result.score;
      reason = result.reason;
      break;
    }
  }

  return {
    id: testCase.id,
    pass: score === 1,
    score,
    actual,
    reason,
  };
}
