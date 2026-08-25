/**
 * @pageforge/harness — public API
 *
 * The harness is the boundary between the LLM and the domain layer.
 * It wires: context assembly → tool definitions → tool handlers → agent loop → SSE stream.
 */

// Loop
export { runLoop } from "./loop.js";
export type { LoopContext, LoopConfig, LoopResult } from "./loop.js";

// Tool handlers
export { toolHandlers } from "./tool-handlers.js";
export type { ToolContext, ToolHandlers, HarnessEvent } from "./tool-handlers.js";

// Tool definitions
export { TOOL_DEFINITIONS } from "./tools.js";
export type { ToolName } from "./tools.js";

// Context builder (T10)
export { buildContext } from "./context.js";
export type { SystemPromptPart, SystemPromptParts, ContextStats } from "./context.js";

// Tree summary (T10)
export { renderTreeSummary } from "./tree-summary.js";
export type { TreeSummaryConfig } from "./tree-summary.js";

// Token counter (T10)
export { Cl100kEstimateCounter, CharCounterApprox } from "./token-counter.js";
export type { TokenCounter } from "./token-counter.js";

// Compression (T10)
export { compressToFit, COMPRESSION_LEVELS } from "./compression.js";
export type { CompressionConfig } from "./compression.js";

// Errors
export { formatDomainError, ok, fail } from "./errors.js";
export type { ToolResult } from "./errors.js";

// Adapters
export { AnthropicAdapter, getLangfuse } from "./adapters/llm.adapter.js";
export type { LLMAdapter, AnthropicAdapterOptions } from "./adapters/llm.adapter.js";

export { NoopEventLogAdapter } from "./adapters/event-log.adapter.js";
export type { EventLogAdapter, AppendInput } from "./adapters/event-log.adapter.js";
