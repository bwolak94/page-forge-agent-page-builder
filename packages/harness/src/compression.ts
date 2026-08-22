/**
 * compression.ts — lazy compression pipeline for the context tree summary.
 *
 * Iterates through 4 compression levels (0 = default, 3 = maximum) until
 * the rendered tree summary fits within the remaining token budget.
 *
 * Compression levels trade completeness for conciseness:
 *   Level 0: depth=4, focusDepth=6, siblingThreshold=4  (default — shows most of the tree)
 *   Level 1: depth=3, focusDepth=5, siblingThreshold=3  (moderate compression)
 *   Level 2: depth=2, focusDepth=4, siblingThreshold=2  (aggressive compression)
 *   Level 3: depth=1, focusDepth=3, siblingThreshold=1  (maximum — root children only)
 *
 * If no level fits, a single-line fallback is returned. compressToFit never throws.
 */

import type { Document, NodeId } from "@pageforge/ir";
import { renderTreeSummary } from "./tree-summary.js";
import type { TokenCounter } from "./token-counter.js";

// ---------------------------------------------------------------------------
// Compression configuration
// ---------------------------------------------------------------------------

export interface CompressionConfig {
  maxDepth: number;
  focusDepth: number;
  siblingThreshold: number;
}

export const COMPRESSION_LEVELS: readonly CompressionConfig[] = [
  { maxDepth: 4, focusDepth: 6, siblingThreshold: 4 }, // 0 — default
  { maxDepth: 3, focusDepth: 5, siblingThreshold: 3 }, // 1 — moderate
  { maxDepth: 2, focusDepth: 4, siblingThreshold: 2 }, // 2 — aggressive
  { maxDepth: 1, focusDepth: 3, siblingThreshold: 1 }, // 3 — maximum
];

// ---------------------------------------------------------------------------
// compressToFit
// ---------------------------------------------------------------------------

/**
 * Find the least-compressed tree summary that fits within `tokenBudget`.
 *
 * Tries COMPRESSION_LEVELS[0..3] in order. Returns the first summary whose
 * token count ≤ tokenBudget. If none fit, returns a single-line fallback
 * (always within budget for any reasonable value).
 *
 * @param doc          — document to summarise
 * @param focusId      — optional node to focus-expand (passed through to renderTreeSummary)
 * @param tokenBudget  — maximum allowed tokens for the summary
 * @param counter      — token counting strategy
 */
export function compressToFit(
  doc: Document,
  focusId: NodeId | undefined,
  tokenBudget: number,
  counter: TokenCounter,
): string {
  for (const level of COMPRESSION_LEVELS) {
    const summary = renderTreeSummary(doc, {
      ...level,
      focusId,
      maxNodes: 80,
    });
    if (counter.count(summary) <= tokenBudget) return summary;
  }

  // Fallback: single-line summary (fits within any reasonable budget)
  const totalNodes = Object.keys(doc.nodes).length;
  return `<Page id=${doc.root}> [${totalNodes - 1} nodes — use queryTree to explore] </Page>`;
}
