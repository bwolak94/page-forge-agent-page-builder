/**
 * evals.eval.ts — vitest test suite wrapping the 20 eval tasks.
 *
 * Run with: pnpm --filter evals eval
 *
 * Design:
 *   - Each task is a `it()` test — vitest handles timeouts and reporting.
 *   - The full report is written at the end via afterAll.
 *   - CI fails if global pass rate drops below BASELINE_PASS_RATE.
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY  — required for actual LLM calls
 *   LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY — optional, enables Langfuse traces
 *   EVAL_FILTER        — comma-separated task IDs to run (e.g. "T001,T003")
 *   CLAUDE_MODEL_ID    — override model (default: claude-sonnet-4-6)
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { EVAL_DATASET } from "../dataset/tasks.js";
import { runEvalTask, runAllEvals } from "./run-eval.js";
import { writeReport, printSummary } from "./reporter.js";
import type { EvalResult, EvalReport } from "./run-eval.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASELINE_PASS_RATE = 0.75; // 75% — CI threshold

// Allow filtering to a subset of tasks for faster dev iteration
const EVAL_FILTER = process.env["EVAL_FILTER"]?.split(",").map(s => s.trim());
const tasks = EVAL_FILTER
  ? EVAL_DATASET.filter(t => EVAL_FILTER.includes(t.id))
  : EVAL_DATASET;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

const results: EvalResult[] = [];

describe("PageForge agent evals", () => {
  beforeAll(() => {
    if (!process.env["ANTHROPIC_API_KEY"]) {
      console.warn("[eval] ANTHROPIC_API_KEY not set — evals will fail immediately");
    }
  });

  for (const task of tasks) {
    it(`${task.id}: ${task.prompt.slice(0, 80)}`, async () => {
      const result = await runEvalTask(task);
      results.push(result);

      if (!result.passed) {
        const failedIndexes = result.assertionResults
          .filter(a => !a.passed)
          .map(a => `#${a.index}`)
          .join(", ");

        console.error(
          `[eval] ${task.id} FAILED — assertions: ${failedIndexes || "none ran"}` +
          (result.error ? `\n  Error: ${result.error}` : ""),
        );
      }

      // Individual task assertion: every structural assertion must pass
      expect(result.passed, `Task ${task.id} failed — see logs for details`).toBe(true);
    });
  }

  afterAll(async () => {
    if (results.length === 0) return;

    const report: EvalReport = {
      timestamp: new Date().toISOString(),
      passRate: results.filter(r => r.passed).length / results.length,
      totalTasks: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
      totalCost: results.reduce((s, r) => s + r.cost, 0),
      meanToolCallsPerTask: results.reduce((s, r) => s + r.toolCallCount, 0) / results.length,
      meanDurationMs: results.reduce((s, r) => s + r.durationMs, 0) / results.length,
    };

    printSummary(report);

    try {
      const { json, md } = await writeReport(report);
      console.log(`[eval] Report written:\n  JSON: ${json}\n  MD:   ${md}`);
    } catch (err) {
      console.warn("[eval] Failed to write report:", err);
    }

    // Global pass rate check — CI gate
    if (!EVAL_FILTER) {
      expect(
        report.passRate,
        `Pass rate ${(report.passRate * 100).toFixed(1)}% is below baseline ${(BASELINE_PASS_RATE * 100).toFixed(1)}%`,
      ).toBeGreaterThanOrEqual(BASELINE_PASS_RATE);
    }
  });
});
