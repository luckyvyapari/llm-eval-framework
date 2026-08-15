export interface TestCase {
  id: string;
  prompt: string;
  scorer: "exact" | "regex" | "schema" | "llm-judge";
  expected: string;
  criteria?: string; // used by llm-judge: what "correct" means
}

export interface ScoreResult {
  id: string;
  pass: boolean;
  score: number; // 0-1
  actual: string;
  reason?: string;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: ScoreResult[];
}
