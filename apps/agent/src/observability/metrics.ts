/**
 * metrics.ts — Prometheus counters and histograms for PageForge agent quality.
 *
 * 6 core metrics tracked on the Grafana dashboard:
 *   1. pageforge_task_success_total          — eval pass/fail counter
 *   2. pageforge_tool_calls_per_task         — tool call distribution
 *   3. pageforge_tool_errors_total           — tool error counter by kind
 *   4. pageforge_cost_per_session_usd        — LLM cost per chat session
 *   5. pageforge_first_patch_latency_ms      — time to first doc.patch SSE event
 *   6. pageforge_manual_correction_total     — user edits after agent turn
 *
 * Metrics are exposed on GET /metrics (see apps/agent/src/index.ts).
 */

import { Counter, Histogram, register } from "prom-client";

// Prevent double-registration when module is hot-reloaded in dev
register.clear();

// ---------------------------------------------------------------------------
// 1. Task success rate (evals)
// ---------------------------------------------------------------------------

export const taskSuccessTotal = new Counter({
  name: "pageforge_task_success_total",
  help: "Number of eval tasks completed successfully",
  labelNames: ["task_id", "tag"] as const,
  registers: [register],
});

// ---------------------------------------------------------------------------
// 2. Tool calls per task / session
// ---------------------------------------------------------------------------

export const toolCallsPerTask = new Histogram({
  name: "pageforge_tool_calls_per_task",
  help: "Number of tool calls per agent task or chat session",
  buckets: [1, 2, 4, 6, 8, 12, 16, 24],
  registers: [register],
});

// ---------------------------------------------------------------------------
// 3. Tool error rate
// ---------------------------------------------------------------------------

export const toolErrorTotal = new Counter({
  name: "pageforge_tool_errors_total",
  help: "Tool call errors by tool name and error kind",
  labelNames: ["tool", "error_kind"] as const,
  registers: [register],
});

// ---------------------------------------------------------------------------
// 4. Cost per chat session (USD)
// ---------------------------------------------------------------------------

export const costPerSessionUsd = new Histogram({
  name: "pageforge_cost_per_session_usd",
  help: "Estimated LLM cost per chat session in USD (Sonnet 4 pricing)",
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0],
  registers: [register],
});

// ---------------------------------------------------------------------------
// 5. First-patch latency (ms) — time from request to first doc mutation SSE
// ---------------------------------------------------------------------------

export const firstPatchLatencyMs = new Histogram({
  name: "pageforge_first_patch_latency_ms",
  help: "Time from chat request receipt to first doc.patch SSE event (ms)",
  buckets: [100, 200, 500, 1000, 1500, 2000, 3000, 5000, 10000],
  registers: [register],
});

// ---------------------------------------------------------------------------
// 6. Manual corrections — user edits after agent turn
// ---------------------------------------------------------------------------

export const manualCorrectionTotal = new Counter({
  name: "pageforge_manual_correction_total",
  help: "Number of user-initiated manual edits made after an agent turn",
  registers: [register],
});

// ---------------------------------------------------------------------------
// Helpers — called from route handlers
// ---------------------------------------------------------------------------

/**
 * Estimate USD cost from Vercel AI SDK usage object.
 * Approximate Sonnet 4 pricing: $3/M input, $15/M output tokens.
 */
export function estimateSessionCost(usage: {
  promptTokens?: number;
  completionTokens?: number;
}): number {
  return ((usage.promptTokens ?? 0) / 1_000_000) * 3 +
         ((usage.completionTokens ?? 0) / 1_000_000) * 15;
}

// ---------------------------------------------------------------------------
// Prometheus registry — export for /metrics endpoint
// ---------------------------------------------------------------------------

export { register };
