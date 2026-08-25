/**
 * langfuse.ts — Langfuse SDK singleton + trace/span/generation helpers.
 *
 * Observability model:
 *   trace      = one conversation (POST /chat/:docId)
 *   span       = one loop step (onStepFinish event)
 *   generation = one model call (streamText invocation)
 *
 * Security: document content and prompts are NOT included in metadata
 * (security rule: no PII or content in logs). Only identifiers are used.
 */

import Langfuse from "langfuse";

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _langfuse: Langfuse | null = null;

export function getLangfuse(): Langfuse {
  if (!_langfuse) {
    _langfuse = new Langfuse({
      publicKey: process.env["LANGFUSE_PUBLIC_KEY"] ?? "",
      secretKey: process.env["LANGFUSE_SECRET_KEY"] ?? "",
      baseUrl: process.env["LANGFUSE_HOST"] ?? "https://cloud.langfuse.com",
      release: process.env["GIT_SHA"],
      // Flush eagerly in development for faster feedback
      flushAt: process.env["NODE_ENV"] === "production" ? 15 : 1,
    });
  }
  return _langfuse;
}

// ---------------------------------------------------------------------------
// Trace helpers
// ---------------------------------------------------------------------------

/**
 * Create a Langfuse trace for one agent loop run (one /chat request).
 *
 * @param conversationId - Conversation UUID (sessionId for Langfuse grouping).
 * @param documentId     - Document being edited (identifier only — no content).
 * @param userId         - Authenticated user ID from JWT.
 */
export function createLoopTrace(
  conversationId: string,
  documentId: string,
  userId: string,
): ReturnType<Langfuse["trace"]> {
  return getLangfuse().trace({
    name: "agent-loop",
    sessionId: conversationId,
    userId,
    metadata: { documentId },
  });
}

/**
 * Record a score on a trace (e.g. task success for evals).
 */
export function scoreTrace(
  traceId: string,
  name: string,
  value: number,
  comment?: string,
): void {
  getLangfuse().score({ traceId, name, value, comment });
}
