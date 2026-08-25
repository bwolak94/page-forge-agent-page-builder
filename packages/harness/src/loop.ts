/**
 * loop.ts — the main agent loop.
 *
 * Runs `streamText` (Vercel AI SDK) with executable tool definitions.
 * Tool context is shared across all steps via `docRef` so mutations accumulate.
 *
 * Design:
 *   - Template Method: runLoop defines the skeleton; buildContext and tool handlers are steps.
 *   - Strategy: LLMAdapter interface — swap providers without touching loop logic.
 *   - Circuit Breaker: maxSteps + AbortSignal stop runaway loops.
 *   - Observer: sseEmit pushes doc.patch events to the SSE client after each mutation.
 */

import { streamText, tool } from "ai";
import type { CoreMessage } from "ai";
import type { Document, NodeId } from "@pageforge/ir";
import type { RegistryInterface } from "@pageforge/commands";
import type { Registry } from "@pageforge/registry";
import { canAccept } from "@pageforge/registry";
import { buildContext, type SystemPromptParts } from "./context.js";
import { TOOL_DEFINITIONS } from "./tools.js";
import { toolHandlers, type HarnessEvent, type ToolContext } from "./tool-handlers.js";
import type { LLMAdapter } from "./adapters/llm.adapter.js";
import type { EventLogAdapter } from "./adapters/event-log.adapter.js";

// ---------------------------------------------------------------------------
// Loop configuration
// ---------------------------------------------------------------------------

export interface LoopConfig {
  /** Maximum number of LLM + tool steps before the loop is force-stopped. Default: 24. */
  maxSteps?: number;
  /** Abort signal from the HTTP request — stops the loop on client disconnect. */
  abortSignal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Loop context
// ---------------------------------------------------------------------------

export interface LoopContext {
  /** Current document state — loop maintains this via docRef mutations. */
  doc: Document;
  /** Component registry — used for context prompt and constraint checks. */
  registry: Registry;
  /** Conversation history (user + assistant turns). */
  history: CoreMessage[];
  /** LLM adapter — provides the model instance. */
  llm: LLMAdapter;
  /** Event log adapter — persists agent-generated document events. */
  eventLog: EventLogAdapter;
  /** Push SSE events to the connected HTTP client. */
  sseEmit: (event: HarnessEvent) => void;
  /** Document identifier (stored with every appended event). */
  documentId: string;
  /** Loop configuration overrides. */
  config?: LoopConfig;
  /**
   * Node to focus-expand in the tree summary.
   * Typically the currently selected node in the editor.
   */
  focusNodeId?: NodeId;
}

// ---------------------------------------------------------------------------
// Create executable tools — wraps TOOL_DEFINITIONS with execute functions
// ---------------------------------------------------------------------------

function buildRegistryInterface(registry: Registry): RegistryInterface {
  return {
    canAccept: (parentType, childType, slot) =>
      canAccept(registry, parentType, childType, slot),
    propsSchema: (type) => registry[type]?.propsSchema ?? null,
  };
}

function createExecutableTools(toolCtx: ToolContext) {
  const executableTools: Record<string, unknown> = {};

  for (const [name, def] of Object.entries(TOOL_DEFINITIONS)) {
    const handler = toolHandlers[name as keyof typeof toolHandlers];
    if (!handler) continue;

    const description = (def as Record<string, unknown>)["description"] as string | undefined;
    const parameters = def.parameters;

    executableTools[name] = tool({
      description: description ?? "",
      parameters,
      execute: async (args: unknown) => handler(args as never, toolCtx),
    });
  }

  return executableTools as Parameters<typeof streamText>[0]["tools"];
}

// ---------------------------------------------------------------------------
// runLoop
// ---------------------------------------------------------------------------

/**
 * Run the agent loop for one user turn.
 *
 * Streams text chunks and doc.patch events to the client via sseEmit.
 * Resolves when the model finishes (text response, no more tool calls, or maxSteps).
 */
export interface LoopResult {
  /** Final document state after all tool mutations. */
  doc: Document;
  /** Total number of LLM steps executed. */
  steps: number;
  /** Aggregated token usage across all steps. */
  usage: Awaited<ReturnType<typeof streamText>>["usage"] extends Promise<infer U> ? U : unknown;
}

export async function runLoop(ctx: LoopContext): Promise<LoopResult> {
  const maxSteps = ctx.config?.maxSteps ?? 24;

  // Shared mutable document reference — all tool handlers write here.
  const docRef = { current: ctx.doc };

  const registryInterface = buildRegistryInterface(ctx.registry);

  const toolCtx: ToolContext = {
    docRef,
    registry: registryInterface,
    fullRegistry: ctx.registry,
    eventLog: ctx.eventLog,
    sseEmit: ctx.sseEmit,
    documentId: ctx.documentId,
  };

  const executableTools = createExecutableTools(toolCtx);

  let steps = 0;

  const contextParts: SystemPromptParts = buildContext(ctx.doc, ctx.registry, {
    focusId: ctx.focusNodeId,
  });

  const result = streamText({
    model: ctx.llm.model,
    system: contextParts.systemText,
    messages: ctx.history,
    tools: executableTools,
    maxSteps,
    abortSignal: ctx.config?.abortSignal,
    onStepFinish: ({ usage }) => {
      steps++;
      ctx.sseEmit({ type: "agent.step", step: steps, usage });
    },
  });

  // Stream text chunks to the client as they arrive.
  for await (const chunk of result.textStream) {
    ctx.sseEmit({ type: "agent.text", chunk });
  }

  const usage = await result.usage;
  ctx.sseEmit({ type: "agent.done", steps, usage });

  return { doc: docRef.current, steps, usage };
}
