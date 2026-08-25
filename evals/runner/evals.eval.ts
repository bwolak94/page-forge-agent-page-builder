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

// Allow filtering to a subset of tasks for faster dev iteration.
// Treat empty string (GitHub Actions default for unset workflow_dispatch input) as no filter.
const rawFilter = process.env["EVAL_FILTER"]?.trim();
const EVAL_FILTER = rawFilter ? rawFilter.split(",").map(s => s.trim()).filter(Boolean) : null;
const tasks = EVAL_FILTER
  ? EVAL_DATASET.filter(t => EVAL_FILTER.includes(t.id))
  : EVAL_DATASET;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

const results: EvalResult[] = [];

const HAS_API_KEY = Boolean(process.env["ANTHROPIC_API_KEY"]);

describe("PageForge agent evals", () => {
  beforeAll(() => {
    if (!HAS_API_KEY) {
      console.warn("[eval] ANTHROPIC_API_KEY not set — skipping all eval tasks");
    }
  });

  for (const task of tasks) {
    it(`${task.id}: ${task.prompt.slice(0, 80)}`, async () => {
      if (!HAS_API_KEY) {
        console.warn(`[eval] ${task.id} skipped — no API key`);
        return; // skip without failing
      }

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
      } else {
        console.log(`[eval] ${task.id} PASSED (${result.toolCallCount} tool calls, ${result.durationMs}ms)`);
      }

      // Do NOT assert individual task pass/fail here — the 75% aggregate gate
      // in afterAll is the CI threshold. Individual tasks may fail by design.
    });
  }

  afterAll(async () => {
    if (results.length === 0) {
      if (!HAS_API_KEY) {
        console.warn("[eval] No tasks ran (ANTHROPIC_API_KEY not set) — skipping report and CI gate");
      }
      return;
    }

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
