/**
 * POST /chat/:docId — agent chat endpoint with SSE streaming.
 *
 * Pipeline:
 *   1. Authenticate (authMiddleware)
 *   2. Parse request body: { message, conversationId }
 *   3. Rehydrate document from DB
 *   4. Load conversation history
 *   5. Run agent loop — streams HarnessEvents via SSE
 *   6. Persist assistant reply + tool call records
 *
 * SSE event format: data: <JSON>\n\n
 *
 * Error handling:
 *   - 400: missing required fields
 *   - 401: unauthenticated
 *   - 404: document not found
 *   - 500: unexpected (emitted as SSE error event before stream closes)
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { DocumentRepository, ConversationRepository, getDb } from "@pageforge/db";
import { REGISTRY, canAccept } from "@pageforge/registry";
import { runLoop, AnthropicAdapter, NoopEventLogAdapter } from "@pageforge/harness";
import type { HarnessEvent } from "@pageforge/harness";
import type { CoreMessage } from "ai";
import { authMiddleware } from "../middleware/auth.js";
import { createLoopTrace } from "../observability/langfuse.js";
import {
  toolCallsPerTask,
  costPerSessionUsd,
  firstPatchLatencyMs,
  toolErrorTotal,
  estimateSessionCost,
} from "../observability/metrics.js";

// ---------------------------------------------------------------------------
// Lazy singleton adapter — reused across requests
// ---------------------------------------------------------------------------

let _anthropicAdapter: AnthropicAdapter | null = null;

function getAnthropicAdapter(): AnthropicAdapter {
  if (!_anthropicAdapter) {
    _anthropicAdapter = new AnthropicAdapter({
      modelId: process.env["CLAUDE_MODEL_ID"] ?? "claude-sonnet-4-6",
    });
  }
  return _anthropicAdapter;
}

// ---------------------------------------------------------------------------
// Drizzle-backed event log adapter
// ---------------------------------------------------------------------------

import type { EventLogAdapter, AppendInput } from "@pageforge/harness";
import { DocumentEventRepository } from "@pageforge/db";
import type { DrizzleDB } from "@pageforge/db";

class DrizzleEventLogAdapter implements EventLogAdapter {
  private repo: DocumentEventRepository;
  private seq: number;

  constructor(
    private readonly db: DrizzleDB,
    private readonly documentId: string,
    initialSeq: number,
  ) {
    this.repo = new DocumentEventRepository(db);
    this.seq = initialSeq;
  }

  async append(input: AppendInput): Promise<number> {
    const seq = ++this.seq;
    await this.db.transaction(async tx => {
      await this.repo.append(tx, {
        documentId: this.documentId,
        seq,
        actor: input.actor,
        kind: input.kind,
        patches: input.patches,
        inverse: input.inverse,
      });
    });
    return seq;
  }
}

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const chatRoute = new Hono();

chatRoute.post("/chat/:docId", authMiddleware, async c => {
  const docId = c.req.param("docId");

  const rawBody = await c.req.json().catch(() => null);
  const parsed = chatBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: "Bad request", details: parsed.error.flatten() }, 400);
  }
  const { message, conversationId } = parsed.data;

  const db = getDb();
  const docRepo = new DocumentRepository(db);
  const convRepo = new ConversationRepository(db);

  // Rehydrate document
  let rehydrated: Awaited<ReturnType<DocumentRepository["rehydrate"]>>;
  try {
    rehydrated = await docRepo.rehydrate(docId);
  } catch {
    return c.json({ error: "not_found" }, 404);
  }
  const { doc, version } = rehydrated;

  // Resolve or create conversation
  const convId =
    conversationId ?? (await convRepo.create(docId)).id;

  // Load history and append the new user message
  const historyRows = await convRepo.getHistory(convId);
  await convRepo.addMessage({
    conversationId: convId,
    role: "user",
    content: message,
  });

  const history: CoreMessage[] = [
    ...historyRows.map(row => ({
      role: row.role as "user" | "assistant",
      content: row.content as string,
    })),
    { role: "user" as const, content: message },
  ];

  const session = c.get("session");

  return streamSSE(c, async stream => {
    const requestStart = Date.now();
    let firstPatchEmitted = false;
    let toolCallCount = 0;

    // Langfuse trace — one per /chat request (one agent turn)
    const trace = createLoopTrace(convId, docId, session.userId);

    const emit = (event: HarnessEvent) => {
      // Record first-patch latency
      if (event.type === "doc.patch" && !firstPatchEmitted) {
        firstPatchEmitted = true;
        firstPatchLatencyMs.observe(Date.now() - requestStart);
      }
      if (event.type === "doc.patch") toolCallCount++;
      if (event.type === "agent.error") {
        toolErrorTotal.inc({ tool: "loop", error_kind: "agent_error" });
      }
      return stream.writeSSE({ data: JSON.stringify(event) });
    };

    try {
      const eventLog = new DrizzleEventLogAdapter(db, docId, version);

      const result = await runLoop({
        doc,
        registry: REGISTRY,
        history,
        llm: getAnthropicAdapter(),
        eventLog,
        sseEmit: emit,
        documentId: docId,
        config: {
          maxSteps: 24,
          abortSignal: c.req.raw.signal,
        },
      });

      // Record session-level Prometheus metrics
      const usage = result.usage as { promptTokens?: number; completionTokens?: number };
      const cost = estimateSessionCost(usage);
      costPerSessionUsd.observe(cost);
      toolCallsPerTask.observe(toolCallCount);

      // Score in Langfuse (tool efficiency proxy)
      trace.score({ name: "tool_calls", value: toolCallCount });
      trace.score({ name: "cost_usd", value: cost });

      // Persist assistant turn marker in conversation
      await convRepo.addMessage({
        conversationId: convId,
        role: "assistant",
        content: "[agent turn complete]",
      });
    } catch (err) {
      toolErrorTotal.inc({ tool: "loop", error_kind: "unexpected" });
      emit({
        type: "agent.error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
});
