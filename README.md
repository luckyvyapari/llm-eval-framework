# LLM Eval Framework

Small evaluation framework for LLM/agent outputs, built on Cloudflare Workers AI. Runs a suite of test cases against a target model, scores each response, and gates CI on a minimum pass rate.

## Why

Agents shipping to production need automated regression checks — a prompt or model change should not silently degrade quality. This framework runs on every PR and blocks merge if the pass rate drops below threshold.

## Scorers

- **exact** — case-insensitive exact string match
- **regex** — response must match a pattern (e.g. validating structured output like emails)
- **schema** — response must be valid JSON
- **llm-judge** — a second model (Workers AI `llama-3.1-8b-instruct`) grades the response against a natural-language criterion (correctness, safety refusal, tone, etc.)

## Structure

```
src/
  types.ts     test case + result types
  scorers.ts   scoring logic per scorer type
  runner.ts    loads test cases, calls target model, scores, prints summary, exits non-zero on threshold miss
tests/
  cases.json   test case definitions
.github/workflows/eval.yml   CI quality gate
```

## Running locally

```bash
npm install
export WORKERS_AI_URL="https://api.cloudflare.com/client/v4/accounts/<account_id>/ai/run"
export WORKERS_AI_TOKEN="<api_token>"
npm run eval
```

## Adding a test case

Edit `tests/cases.json`:

```json
{
  "id": "my-case",
  "prompt": "...",
  "scorer": "llm-judge",
  "expected": "",
  "criteria": "What a correct response looks like, in plain language."
}
```

## CI gate

`EVAL_PASS_THRESHOLD` (default 0.8) sets the minimum pass rate. Below it, the workflow exits 1 and blocks the PR.

## Cost

Uses Cloudflare Workers AI free tier (10,000 Neurons/day) — a suite of a few dozen cases run a handful of times a day stays well within it.
