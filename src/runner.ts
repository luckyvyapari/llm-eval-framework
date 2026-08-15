import { readFileSync } from "node:fs";
import type { TestCase, EvalSummary } from "./types.js";
import { runCase } from "./scorers.js";

const THRESHOLD = Number(process.env.EVAL_PASS_THRESHOLD ?? "0.8");
const WORKERS_AI_URL = process.env.WORKERS_AI_URL ?? "";
const WORKERS_AI_TOKEN = process.env.WORKERS_AI_TOKEN ?? "";
const TARGET_MODEL = process.env.TARGET_MODEL ?? "@cf/meta/llama-3.1-8b-instruct";

async function getModelOutput(prompt: string): Promise<string> {
  const res = await fetch(`${WORKERS_AI_URL}/${TARGET_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WORKERS_AI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    }),
  });
  if (!res.ok) throw new Error(`Target model error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { result: { response: unknown } };
  const output = data.result.response;
  return (typeof output === "string" ? output : JSON.stringify(output)).trim();
}

async function main() {
  const raw = readFileSync(new URL("../tests/cases.json", import.meta.url), "utf-8");
  const cases: TestCase[] = JSON.parse(raw);

  const results = [];
  for (const testCase of cases) {
    const result = await runCase(testCase, getModelOutput);
    results.push(result);
    console.log(`${result.pass ? "PASS" : "FAIL"}  ${result.id}  score=${result.score}  actual="${result.actual.slice(0, 120)}"`);
    if (!result.pass && result.reason) console.log(`   reason: ${result.reason}`);
  }

  const passed = results.filter((r) => r.pass).length;
  const summary: EvalSummary = {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: passed / results.length,
    results,
  };

  console.log(`\nPass rate: ${(summary.passRate * 100).toFixed(1)}% (${passed}/${results.length})`);

  if (summary.passRate < THRESHOLD) {
    console.error(`FAIL: pass rate below threshold (${THRESHOLD * 100}%)`);
    process.exit(1);
  }
  console.log("Quality gate passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
