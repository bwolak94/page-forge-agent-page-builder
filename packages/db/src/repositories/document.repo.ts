/**
 * DocumentRepository — snapshot store + rehydration.
 *
 * Read path (rehydrate):
 *   1. Fetch snapshot + snapshot_seq from documents table.
 *   2. Fetch tail events (seq > snapshot_seq) from document_events.
 *   3. Apply patches to snapshot → current document.
 *
 * Write path (updateSnapshot):
 *   Called every 50th event within the same DB transaction to keep
 *   snapshot_seq close to version (limits tail length to ≤ 49 events).
 *
 * CQRS-lite: read and write paths share no queries.
 */

import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../client.js";
import { documents } from "../schema.js";
import type { Document } from "@pageforge/ir";
import { applyPatches } from "@pageforge/ir";
import { DocumentEventRepository } from "./document-event.repo.js";

export type DocumentRow = typeof documents.$inferSelect;

export class DocumentRepository {
  private readonly eventRepo: DocumentEventRepository;

  constructor(private readonly db: DrizzleDB) {
    this.eventRepo = new DocumentEventRepository(db);
  }

  /**
   * Rehydrate the current document from snapshot + tail.
   *
   * Returns the latest document state and the current version number.
   * The version number should be sent to clients as baseVersion for OCC.
   */
  async rehydrate(documentId: string): Promise<{ doc: Document; version: number }> {
    const [snap] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!snap) throw new Error(`Document "${documentId}" not found`);

    const tail = await this.eventRepo.getTail(documentId, snap.snapshotSeq);

    const doc = tail.reduce(
      (d, event) => applyPatches(d, event.patches as Parameters<typeof applyPatches>[1]),
      snap.snapshot as Document,
    );

    return { doc, version: snap.version };
  }

  /**
   * Lock the document row for update and return its current version.
   * Must be called inside a transaction to hold the row lock until commit.
   */
  async getVersionForUpdate(
    tx: Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0],
    documentId: string,
  ): Promise<number> {
    const [row] = await tx
      .select({ version: documents.version })
      .from(documents)
      .where(eq(documents.id, documentId))
      .for("update");

    return row?.version ?? 0;
  }

  /**
   * Increment the version counter only (no snapshot update).
   * Called for events that are not multiples of SNAPSHOT_INTERVAL.
   */
  async incrementVersion(
    tx: Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0],
    documentId: string,
    newVersion: number,
  ): Promise<void> {
    await tx
      .update(documents)
      .set({ version: newVersion, updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  }

  /**
   * Persist a compacted snapshot and advance both version and snapshot_seq.
   * Called every SNAPSHOT_INTERVAL events within the same transaction.
   */
  async updateSnapshot(
    tx: Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0],
    documentId: string,
    doc: Document,
    version: number,
  ): Promise<void> {
    await tx
      .update(documents)
      .set({
        version,
        snapshotSeq: version,
        snapshot: doc as unknown as DocumentRow["snapshot"],
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  }

  /** Create a new document row with the initial snapshot. */
  async create(
    tx: Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0],
    input: {
      projectId: string;
      snapshot: Document;
    },
  ): Promise<string> {
    const [row] = await tx
      .insert(documents)
      .values({
        projectId: input.projectId,
        version: 0,
        snapshotSeq: 0,
        snapshot: input.snapshot as unknown as DocumentRow["snapshot"],
      })
      .returning({ id: documents.id });

    if (!row) throw new Error("Failed to create document");
    return row.id;
  }
}
