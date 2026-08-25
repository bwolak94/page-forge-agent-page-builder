/**
 * run-eval.ts — eval runner: orchestrates agent loop + structural assertions.
 *
 * Design:
 *   Template Method — runEvalTask defines the skeleton:
 *     prompt → loop → collect doc → run assertions → score.
 *   Strategy — each task provides its own assertions array.
 *   Observer — Langfuse SDK observes the loop run via the LLM adapter.
 *   Factory — makeEvalRunner produces a runner configured for CI vs local.
 *
 * The runner reuses runLoop from @pageforge/harness — no duplicate logic.
 */

import type { Document } from "@pageforge/ir";
import {
  runLoop,
  AnthropicAdapter,
  NoopEventLogAdapter,
  getLangfuse,
} from "@pageforge/harness";
import type { HarnessEvent } from "@pageforge/harness";
import { REGISTRY } from "@pageforge/registry";
import { EMPTY_DOCUMENT } from "../fixtures/empty-doc.js";
import type { EvalTask } from "../dataset/tasks.js";

// ---------------------------------------------------------------------------
// EvalResult
// ---------------------------------------------------------------------------

export interface AssertionResult {
  index: number;
  passed: boolean;
}

export interface EvalResult {
  taskId: string;
  prompt: string;
  passed: boolean;
  assertionResults: AssertionResult[];
  toolCallCount: number;
  steps: number;
  durationMs: number;
  /** Estimated USD cost from token usage (rough Sonnet 4 pricing). */
  cost: number;
  /** LLM-as-judge visual score (0–5). Optional — requires a screenshot. */
  visualScore?: number;
  error?: string;
}

export interface EvalReport {
  timestamp: string;
  passRate: number;
  totalTasks: number;
  passed: number;
  failed: number;
  results: EvalResult[];
  totalCost: number;
  meanToolCallsPerTask: number;
  meanDurationMs: number;
}

// ---------------------------------------------------------------------------
// Cost estimation (Sonnet 4 pricing as of Aug 2026)
// Approximate: $3/M input tokens, $15/M output tokens
// ---------------------------------------------------------------------------

function estimateCost(usage: { promptTokens?: number; completionTokens?: number }): number {
  const input = usage.promptTokens ?? 0;
  const output = usage.completionTokens ?? 0;
  return (input / 1_000_000) * 3 + (output / 1_000_000) * 15;
}

// ---------------------------------------------------------------------------
// runEvalTask
// ---------------------------------------------------------------------------

/**
 * Run a single eval task:
 *   1. Invoke the agent loop with the task prompt.
 *   2. Collect the final document from the loop result.
 *   3. Inject __evalMeta for tool-call-count assertions.
 *   4. Run all assertions.
 *   5. Score in Langfuse.
 *
 * Returns a structured EvalResult — never throws.
 */
export async function runEvalTask(task: EvalTask): Promise<EvalResult> {
  const startMs = Date.now();
  const langfuse = getLangfuse();

  const trace = langfuse.trace({
    name: `eval-${task.id}`,
    tags: task.tags,
    metadata: { prompt: task.prompt },
  });

  let toolCallCount = 0;
  let finalDoc: Document = task.startDoc ?? EMPTY_DOCUMENT;
  let steps = 0;
  let cost = 0;

  try {
    const llm = new AnthropicAdapter({
      modelId: process.env["CLAUDE_MODEL_ID"] ?? "claude-sonnet-4-6",
    });

    const events: HarnessEvent[] = [];
    const sseEmit = (event: HarnessEvent) => {
      events.push(event);
      if (event.type === "doc.patch") toolCallCount++;
    };

    const result = await runLoop({
      doc: finalDoc,
      registry: REGISTRY,
      history: [{ role: "user", content: task.prompt }],
      llm,
      eventLog: new NoopEventLogAdapter(),
      sseEmit,
      documentId: `eval-${task.id}`,
      config: { maxSteps: task.maxToolCalls ?? 24 },
    });

    finalDoc = result.doc;
    steps = result.steps;
    cost = estimateCost(
      (result.usage as { promptTokens?: number; completionTokens?: number }) ?? {},
    );

    // Inject eval metadata so assertions can access toolCallCount
    (finalDoc as unknown as { __evalMeta: unknown }).__evalMeta = { toolCallCount };

    // Run structural assertions
    const assertionResults: AssertionResult[] = task.assertions.map((assert, i) => {
      try {
        return { index: i, passed: assert(finalDoc) };
      } catch {
        return { index: i, passed: false };
      }
    });

    const passed = assertionResults.every(r => r.passed);

    // Score in Langfuse
    trace.score({ name: "task_success", value: passed ? 1 : 0, comment: `${assertionResults.filter(r => r.passed).length}/${assertionResults.length} assertions passed` });

    return {
      taskId: task.id,
      prompt: task.prompt,
      passed,
      assertionResults,
      toolCallCount,
      steps,
      durationMs: Date.now() - startMs,
      cost,
    };
  } catch (err) {
    trace.score({ name: "task_success", value: 0, comment: String(err) });

    return {
      taskId: task.id,
      prompt: task.prompt,
      passed: false,
      assertionResults: [],
      toolCallCount,
      steps,
      durationMs: Date.now() - startMs,
      cost,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await langfuse.flushAsync();
  }
}

// ---------------------------------------------------------------------------
// runAllEvals
// ---------------------------------------------------------------------------

/**
 * Run the full EVAL_DATASET sequentially (avoids rate-limit spikes) and
 * produce an aggregate report.
 */
export async function runAllEvals(tasks: EvalTask[]): Promise<EvalReport> {
  const results: EvalResult[] = [];

  for (const task of tasks) {
    console.log(`[eval] Running ${task.id}: ${task.prompt.slice(0, 60)}…`);
    const result = await runEvalTask(task);
    results.push(result);
    console.log(`[eval] ${task.id}: ${result.passed ? "PASS ✓" : "FAIL ✗"} (${result.toolCallCount} tool calls, ${result.durationMs}ms)`);
  }

  const passed = results.filter(r => r.passed).length;
  const totalCost = results.reduce((s, r) => s + r.cost, 0);
  const meanToolCalls = results.reduce((s, r) => s + r.toolCallCount, 0) / results.length;
  const meanDuration = results.reduce((s, r) => s + r.durationMs, 0) / results.length;

  return {
    timestamp: new Date().toISOString(),
    passRate: passed / results.length,
    totalTasks: results.length,
    passed,
    failed: results.length - passed,
    results,
    totalCost,
    meanToolCallsPerTask: meanToolCalls,
    meanDurationMs: meanDuration,
  };
}
