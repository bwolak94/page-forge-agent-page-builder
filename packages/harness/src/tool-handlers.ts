/**
 * tool-handlers.ts — one handler function per tool.
 *
 * Each handler receives parsed, type-safe args (already Zod-validated by the SDK)
 * and a mutable ToolContext. Mutating tools update docRef.current so state is
 * shared across all tool calls in a single loop run.
 *
 * Anti-Corruption Layer (ACL): executeCommand performs its own Zod parse + domain
 * validate. Errors are formatted into human-readable hint strings (never exceptions).
 */

import type { Document, NodeId } from "@pageforge/ir";
import type { RegistryInterface } from "@pageforge/commands";
import { executeCommand } from "@pageforge/commands";
import type { Registry } from "@pageforge/registry";
import { renderTreeSummary } from "./tree-summary.js";
import { formatDomainError, ok, fail, type ToolResult } from "./errors.js";
import type { EventLogAdapter } from "./adapters/event-log.adapter.js";
import type { JsonPatch } from "@pageforge/ir";

// ---------------------------------------------------------------------------
// Harness-internal SSE event types
// ---------------------------------------------------------------------------

export type HarnessEvent =
  | { type: "doc.patch"; seq: number; patches: JsonPatch[]; affected: NodeId[] }
  | { type: "agent.text"; chunk: string }
  | { type: "agent.step"; step: number; usage: unknown }
  | { type: "agent.done"; steps: number; usage: unknown }
  | { type: "agent.error"; message: string };

// ---------------------------------------------------------------------------
// Tool execution context
// ---------------------------------------------------------------------------

export interface ToolContext {
  /** Shared mutable reference — mutating tools update this after each command. */
  docRef: { current: Document };
  /** Registry adapter for canAccept / propsSchema lookups. */
  registry: RegistryInterface;
  /** Full registry for component listing. */
  fullRegistry: Registry;
  /** Event log for persisting agent-generated events. */
  eventLog: EventLogAdapter;
  /** Push SSE events to the connected client. */
  sseEmit: (event: HarnessEvent) => void;
  /** Owning document id (for event log). */
  documentId: string;
}

// ---------------------------------------------------------------------------
// Helper — dispatch a mutating command and update shared state
// ---------------------------------------------------------------------------

async function dispatchCommand(
  kind: string,
  args: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  const result = executeCommand(ctx.docRef.current, ctx.registry, kind, args);
  if (result.isErr()) return fail(formatDomainError(result.error));

  const { doc: nextDoc, patches, inverse, affected } = result.value;
  ctx.docRef.current = nextDoc;

  const seq = await ctx.eventLog.append({ kind, patches, inverse, actor: "agent" });
  ctx.sseEmit({ type: "doc.patch", seq, patches, affected });

  return ok({ affected, seq });
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

export const toolHandlers = {
  // ── Read-only ─────────────────────────────────────────────────────────────

  queryTree: async (
    args: { focusId?: string; maxDepth?: number; maxNodes?: number },
    ctx: ToolContext,
  ): Promise<ToolResult> => {
    const tree = renderTreeSummary(ctx.docRef.current, {
      focusId: args.focusId,
      maxDepth: args.maxDepth ?? 4,
      maxNodes: args.maxNodes ?? 80,
    });
    return ok({ tree });
  },

  inspectNode: async (
    args: { id: string },
    ctx: ToolContext,
  ): Promise<ToolResult> => {
    const node = ctx.docRef.current.nodes[args.id as NodeId];
    if (!node) {
      return fail(`Node "${args.id}" not found. Use queryTree to list valid node IDs.`);
    }
    return ok({
      node: {
        id: args.id,
        type: node.type,
        props: node.props,
        slots: node.slots,
        meta: node.meta,
      },
    });
  },

  listComponents: async (
    args: { category?: string },
    ctx: ToolContext,
  ): Promise<ToolResult> => {
    const entries = Object.values(ctx.fullRegistry);
    const filtered = args.category
      ? entries.filter(def => def.category === args.category)
      : entries;

    const components = filtered.map(def => ({
      type: def.type,
      category: def.category,
      description: def.description,
      slots: Object.keys(def.slots),
      allowedParents: def.allowedParents,
    }));

    return ok({ components });
  },

  // ── Mutating ──────────────────────────────────────────────────────────────

  insertNode: async (args: unknown, ctx: ToolContext): Promise<ToolResult> => {
    const result = await dispatchCommand("insert-node", args, ctx);
    if (result.ok && typeof args === "object" && args !== null) {
      const typedArgs = args as { type?: string };
      return { ...result, message: `Inserted ${typedArgs.type ?? "node"}.` };
    }
    return result;
  },

  updateProps: async (args: unknown, ctx: ToolContext): Promise<ToolResult> =>
    dispatchCommand("update-props", args, ctx),

  moveNode: async (args: unknown, ctx: ToolContext): Promise<ToolResult> =>
    dispatchCommand("move-node", args, ctx),

  wrapNode: async (args: unknown, ctx: ToolContext): Promise<ToolResult> =>
    dispatchCommand("wrap-node", args, ctx),

  deleteNode: async (args: unknown, ctx: ToolContext): Promise<ToolResult> =>
    dispatchCommand("delete-node", args, ctx),

  applyTheme: async (args: unknown, ctx: ToolContext): Promise<ToolResult> =>
    dispatchCommand("apply-theme", args, ctx),

  preview: async (_args: unknown, _ctx: ToolContext): Promise<ToolResult> =>
    ok({ message: "Preview requested. Assess the current canvas state visually." }),
} as const;

export type ToolHandlers = typeof toolHandlers;
