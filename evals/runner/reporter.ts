/**
 * reporter.ts — generate JSON + Markdown reports from eval run results.
 *
 * Outputs:
 *   - JSON: machine-readable, written to results/eval-YYYYMMDD-HHmmss.json
 *   - Markdown: human-readable, written to results/eval-YYYYMMDD-HHmmss.md
 *     and also printed to stdout.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { EvalReport, EvalResult } from "./run-eval.js";

// ---------------------------------------------------------------------------
// File paths
// ---------------------------------------------------------------------------

const RESULTS_DIR = new URL("../results", import.meta.url).pathname;

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

// ---------------------------------------------------------------------------
// writeReport
// ---------------------------------------------------------------------------

/**
 * Write the eval report to disk as both JSON and Markdown.
 * Returns the paths of the written files.
 */
export async function writeReport(report: EvalReport): Promise<{ json: string; md: string }> {
  await mkdir(RESULTS_DIR, { recursive: true });

  const ts = timestamp();
  const jsonPath = join(RESULTS_DIR, `eval-${ts}.json`);
  const mdPath = join(RESULTS_DIR, `eval-${ts}.md`);

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  return { json: jsonPath, md: mdPath };
}

// ---------------------------------------------------------------------------
// buildMarkdown
// ---------------------------------------------------------------------------

function buildMarkdown(report: EvalReport): string {
  const passRatePct = (report.passRate * 100).toFixed(1);
  const passIcon = report.passRate >= 0.8 ? "✅" : report.passRate >= 0.6 ? "⚠️" : "❌";

  const lines: string[] = [
    `# PageForge Eval Report`,
    ``,
    `**Run at:** ${report.timestamp}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Pass Rate | ${passIcon} ${passRatePct}% (${report.passed}/${report.totalTasks}) |`,
    `| Total Cost | $${report.totalCost.toFixed(4)} |`,
    `| Mean Tool Calls | ${report.meanToolCallsPerTask.toFixed(1)} |`,
    `| Mean Duration | ${(report.meanDurationMs / 1000).toFixed(1)}s |`,
    ``,
    `## Task Results`,
    ``,
    `| Task | Status | Tool Calls | Duration | Cost |`,
    `|------|--------|-----------|----------|------|`,
    ...report.results.map(r => formatResultRow(r)),
    ``,
    `## Failed Tasks`,
    ``,
    ...report.results.filter(r => !r.passed).map(r => formatFailedTask(r)),
  ];

  if (report.results.every(r => r.passed)) {
    lines.push(`_All tasks passed! 🎉_`);
  }

  return lines.join("\n");
}

function formatResultRow(r: EvalResult): string {
  const icon = r.passed ? "✅" : "❌";
  const dur = `${(r.durationMs / 1000).toFixed(1)}s`;
  const cost = `$${r.cost.toFixed(4)}`;
  return `| ${r.taskId} | ${icon} | ${r.toolCallCount} | ${dur} | ${cost} |`;
}

function formatFailedTask(r: EvalResult): string {
  const failedAssertions = r.assertionResults
    .filter(a => !a.passed)
    .map(a => `  - Assertion #${a.index} failed`)
    .join("\n");

  return [
    `### ${r.taskId}`,
    ``,
    `**Prompt:** ${r.prompt}`,
    ``,
    failedAssertions || `  - No assertions ran`,
    r.error ? `\n**Error:** \`${r.error}\`` : ``,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// printSummary — stdout summary for CI logs
// ---------------------------------------------------------------------------

export function printSummary(report: EvalReport): void {
  const passRatePct = (report.passRate * 100).toFixed(1);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`PageForge Eval Results`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Pass Rate:     ${passRatePct}% (${report.passed}/${report.totalTasks})`);
  console.log(`Total Cost:    $${report.totalCost.toFixed(4)}`);
  console.log(`Mean Calls:    ${report.meanToolCallsPerTask.toFixed(1)} tool calls/task`);
  console.log(`Mean Duration: ${(report.meanDurationMs / 1000).toFixed(1)}s/task`);
  console.log(`${"=".repeat(60)}`);

  for (const r of report.results) {
    const icon = r.passed ? "✓" : "✗";
    console.log(`  [${icon}] ${r.taskId} — ${r.toolCallCount} calls, ${r.durationMs}ms`);
    if (!r.passed && r.error) {
      console.log(`      Error: ${r.error}`);
    }
  }

  console.log(`${"=".repeat(60)}\n`);
}
