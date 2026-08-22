/**
 * EventLogAdapter — interface for persisting agent-generated events.
 *
 * The harness loop calls `append()` after every successful tool execution.
 * This keeps the event log and the in-memory document in sync.
 *
 * The Drizzle implementation is used in production (apps/agent).
 * The NoopAdapter is used in unit tests.
 */

import type { JsonPatch } from "@pageforge/ir";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface AppendInput {
  kind: string;
  patches: JsonPatch[];
  inverse: JsonPatch[];
  actor: "user" | "agent";
  meta?: unknown;
}

export interface EventLogAdapter {
  /** Append one event and return the assigned seq number. */
  append(input: AppendInput): Promise<number>;
}

// ---------------------------------------------------------------------------
// No-op adapter (unit tests)
// ---------------------------------------------------------------------------

export class NoopEventLogAdapter implements EventLogAdapter {
  private seq = 0;
  readonly events: AppendInput[] = [];

  async append(input: AppendInput): Promise<number> {
    this.events.push(input);
    return ++this.seq;
  }
}
