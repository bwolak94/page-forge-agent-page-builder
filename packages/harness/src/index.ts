/**
 * @pageforge/harness — public API
 *
 * The harness is the boundary between the LLM and the domain layer.
 * It wires: tool definitions → tool handlers → agent loop → SSE stream.
 */

// Loop
export { runLoop } from "./loop.js";
export type { LoopContext, LoopConfig } from "./loop.js";

// Tool handlers
export { toolHandlers } from "./tool-handlers.js";
export type { ToolContext, ToolHandlers, HarnessEvent } from "./tool-handlers.js";

// Tool definitions
export { TOOL_DEFINITIONS } from "./tools.js";
export type { ToolName } from "./tools.js";

// Context builder
export { buildContext } from "./context.js";

// Tree summary
export { renderTreeSummary } from "./tree-summary.js";
export type { TreeNodeSummary } from "./tree-summary.js";

// Errors
export { formatDomainError, ok, fail } from "./errors.js";
export type { ToolResult } from "./errors.js";

// Adapters
export { AnthropicAdapter, getLangfuse } from "./adapters/llm.adapter.js";
export type { LLMAdapter, AnthropicAdapterOptions } from "./adapters/llm.adapter.js";

export { NoopEventLogAdapter } from "./adapters/event-log.adapter.js";
export type { EventLogAdapter, AppendInput } from "./adapters/event-log.adapter.js";
