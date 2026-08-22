/**
 * context.ts — system prompt assembler with token budget management.
 *
 * Assembles the agent system prompt in priority order:
 *   1. SYSTEM_INSTRUCTIONS  — fixed rules (~200 tokens, never compressed)
 *   2. Registry manifest    — stable component list (~800 tokens, Anthropic cache hit)
 *   3. Tree summary         — compressed until it fits the remaining budget
 *
 * The manifest is placed before the document tree with an Anthropic
 * `cache_control: ephemeral` breakpoint — after the first turn, manifest tokens
 * are cache hits and cost ~10% of their normal price.
 *
 * Returns `SystemPromptParts` which includes:
 *   - `system: SystemPromptPart[]` — structured parts for Anthropic caching
 *   - `systemText: string`         — flat concatenation for generic providers
 *   - `stats: ContextStats`        — token counts for T14 monitoring
 */

import type { Document, NodeId } from "@pageforge/ir";
import type { Registry } from "@pageforge/registry";
import { registryManifest } from "@pageforge/registry";
import { Cl100kEstimateCounter, type TokenCounter } from "./token-counter.js";
import { compressToFit, COMPRESSION_LEVELS } from "./compression.js";
import { renderTreeSummary } from "./tree-summary.js";

// ---------------------------------------------------------------------------
// System instructions — fixed, never compressed
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTIONS = `\
You are PageForge, an AI page builder. You build pages by calling tools that mutate
a document graph — you do NOT write code. Every change is immediately visible on the canvas.

Rules:
- Always call queryTree before inserting nodes to understand the current structure.
- Never guess node IDs — always use IDs from queryTree or previous tool results.
- Tool results tell you what changed (affected node IDs). Use them to track state.
- If a tool returns an error, read the hint and self-correct on the next step.
- Prefer fewer, targeted changes over many small updates.
- Never nest a node inside itself (cycle prevention).
- Use updateProps to change props; do not delete and re-insert unless restructuring.`.trim();

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** A single part of the structured system prompt. */
export interface SystemPromptPart {
  type: "text";
  text: string;
  /** Anthropic prompt caching breakpoint — set on the manifest part. */
  experimental_providerMetadata?: {
    anthropic: { cacheControl: { type: "ephemeral" } };
  };
}

/** Token usage breakdown for observability (T14). */
export interface ContextStats {
  /** Total tokens across all three parts. */
  totalTokens: number;
  /** Tokens consumed by the registry manifest. */
  manifestTokens: number;
  /** Tokens consumed by the tree summary. */
  treeTokens: number;
  /** Compression level applied (0–3), or -1 if the single-line fallback was used. */
  compressionLevel: number;
}

/** Full return value of buildContext. */
export interface SystemPromptParts {
  /**
   * Structured three-part prompt with Anthropic cache breakpoint on the manifest.
   * Use with Anthropic SDK directly for prompt caching.
   */
  system: SystemPromptPart[];
  /**
   * Flat concatenation of all parts.
   * Pass as `system` to Vercel AI SDK streamText for provider-agnostic use.
   */
  systemText: string;
  /** Actual token counts — used by T14 monitoring dashboards. */
  stats: ContextStats;
}

// ---------------------------------------------------------------------------
// buildContext
// ---------------------------------------------------------------------------

/**
 * Assemble the agent system prompt, compressed to fit within `tokenBudget`.
 *
 * @param doc               — current document state
 * @param registry          — component registry for manifest generation
 * @param opts.focusId      — node to focus-expand in the tree summary
 * @param opts.tokenBudget  — max tokens for the full prompt (default: 4000)
 * @param opts.counter      — token counting strategy (default: Cl100kEstimateCounter)
 */
export function buildContext(
  doc: Document,
  registry: Registry,
  opts: {
    focusId?: NodeId;
    tokenBudget?: number;
    counter?: TokenCounter;
  } = {},
): SystemPromptParts {
  const budget = opts.tokenBudget ?? 4000;
  const counter = opts.counter ?? new Cl100kEstimateCounter();

  // Part 1: Fixed instructions
  const instructionTokens = counter.count(SYSTEM_INSTRUCTIONS);

  // Part 2: Registry manifest (stable, placed early for caching)
  const manifest = registryManifest(registry);
  const manifestTokens = counter.count(manifest);

  // Part 3: Tree summary — compressed to fit remaining budget
  const remaining = Math.max(budget - instructionTokens - manifestTokens, 200);
  const treeSummary = compressToFit(doc, opts.focusId, remaining, counter);
  const treeTokens = counter.count(treeSummary);

  const stats: ContextStats = {
    totalTokens: instructionTokens + manifestTokens + treeTokens,
    manifestTokens,
    treeTokens,
    compressionLevel: resolveCompressionLevel(doc, opts.focusId, remaining, counter),
  };

  const system: SystemPromptPart[] = [
    {
      type: "text",
      text: SYSTEM_INSTRUCTIONS,
    },
    {
      type: "text",
      text: `## Available Components\n\n${manifest}`,
      experimental_providerMetadata: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
    {
      type: "text",
      text: `## Current Document\n\n${treeSummary}`,
    },
  ];

  const systemText = [
    SYSTEM_INSTRUCTIONS,
    "",
    "## Available Components",
    "",
    manifest,
    "",
    "## Current Document",
    "",
    treeSummary,
  ].join("\n");

  return { system, systemText, stats };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Identify which COMPRESSION_LEVELS entry produced the winning summary. */
function resolveCompressionLevel(
  doc: Document,
  focusId: NodeId | undefined,
  tokenBudget: number,
  counter: TokenCounter,
): number {
  for (let i = 0; i < COMPRESSION_LEVELS.length; i++) {
    const level = COMPRESSION_LEVELS[i]!;
    const summary = renderTreeSummary(doc, { ...level, focusId, maxNodes: 80 });
    if (counter.count(summary) <= tokenBudget) return i;
  }
  return -1; // fallback was used
}
