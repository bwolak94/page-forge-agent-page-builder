/**
 * DocumentEventRepository — append-only event log.
 *
 * Write path only: append() inserts one event inside a transaction.
 * Read path: getTail() fetches events after a given seq for rehydration.
 *
 * CQRS-lite: this repo never touches the documents snapshot table.
 */

import { eq, gt, and, asc } from "drizzle-orm";
import type { DrizzleDB } from "../client.js";
import { documentEvents } from "../schema.js";
import type { JsonPatch } from "@pageforge/ir";

export interface AppendEventInput {
  documentId: string;
  seq: number;
  actor: "user" | "agent";
  kind: string;
  patches: JsonPatch[];
  inverse: JsonPatch[];
  meta?: unknown;
}

export type DocumentEventRow = typeof documentEvents.$inferSelect;

export class DocumentEventRepository {
  constructor(private readonly db: DrizzleDB) {}

  /** Insert one event inside an existing transaction. */
  async append(
    tx: Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0],
    event: AppendEventInput,
  ): Promise<void> {
    await tx.insert(documentEvents).values({
      documentId: event.documentId,
      seq: event.seq,
      actor: event.actor,
      kind: event.kind,
      patches: event.patches as unknown as typeof documentEvents.$inferInsert["patches"],
      inverse: event.inverse as unknown as typeof documentEvents.$inferInsert["inverse"],
      meta: event.meta ?? null,
    });
  }

  /** Fetch all events with seq > afterSeq, ordered ascending. */
  async getTail(documentId: string, afterSeq: number): Promise<DocumentEventRow[]> {
    return this.db
      .select()
      .from(documentEvents)
      .where(
        and(
          eq(documentEvents.documentId, documentId),
          gt(documentEvents.seq, afterSeq),
        ),
      )
      .orderBy(asc(documentEvents.seq));
  }

  /** Fetch a specific event by seq (for audit / replay). */
  async getBySeq(documentId: string, seq: number): Promise<DocumentEventRow | null> {
    const [row] = await this.db
      .select()
      .from(documentEvents)
      .where(
        and(
          eq(documentEvents.documentId, documentId),
          eq(documentEvents.seq, seq),
        ),
      );
    return row ?? null;
  }
}
