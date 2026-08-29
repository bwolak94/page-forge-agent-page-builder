/**
 * history.ts — document version history endpoints.
 *
 * GET /api/documents/:docId/history
 *   Query: after=<seq> (default 0), limit=<n> (default 50, max 200)
 *   Returns: { events: EventSummary[] }
 *
 * GET /api/documents/:docId/snapshot
 *   Query: atSeq=<seq>
 *   Returns: { doc: Document, version: number }
 *   Rehydrates the document up to and including `atSeq` so the client
 *   can preview the page at any historical version.
 */

import { Hono } from "hono";
import { z } from "zod";
import { DocumentRepository, DocumentEventRepository, getDb } from "@pageforge/db";
import { applyPatches } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";
import { authMiddleware } from "../middleware/auth.js";

export const historyRoute = new Hono();

// ---------------------------------------------------------------------------
// GET /api/documents/:docId/history
// ---------------------------------------------------------------------------

const historyQuerySchema = z.object({
  after: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

historyRoute.get("/:docId/history", authMiddleware, async c => {
  const docId = c.req.param("docId");
  const query = historyQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!query.success) {
    return c.json({ error: "Invalid query params", issues: query.error.issues }, 400);
  }
  const { after, limit } = query.data;

  const db = getDb();
  const eventRepo = new DocumentEventRepository(db);

  const rows = await eventRepo.getTail(docId, after);
  const sliced = rows.slice(0, limit);

  const events = sliced.map(row => ({
    seq: row.seq,
    actor: row.actor,
    kind: row.kind,
    createdAt: row.createdAt,
  }));

  return c.json({ events, total: rows.length });
});

// ---------------------------------------------------------------------------
// GET /api/documents/:docId/snapshot
// ---------------------------------------------------------------------------

const snapshotQuerySchema = z.object({
  atSeq: z.coerce.number().int().nonnegative(),
});

historyRoute.get("/:docId/snapshot", authMiddleware, async c => {
  const docId = c.req.param("docId");
  const query = snapshotQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!query.success) {
    return c.json({ error: "Invalid query params", issues: query.error.issues }, 400);
  }
  const { atSeq } = query.data;

  const db = getDb();
  const docRepo = new DocumentRepository(db);
  const eventRepo = new DocumentEventRepository(db);

  // Rehydrate from the DB snapshot (most recent snapshot ≤ atSeq)
  let { doc, version } = await docRepo.rehydrate(docId);

  // If the current version is past atSeq we need to replay from scratch.
  // For simplicity, rehydrate normally (gets latest) then re-apply only the
  // events up to atSeq from the beginning.
  // In practice, the snapshot table stores the last compacted doc;
  // we walk forward from there.

  if (version > atSeq) {
    // Rehydrate the baseline snapshot (seq 0) and replay up to atSeq.
    // Here we use a simplified approach: get all events up to atSeq.
    const allEvents = await eventRepo.getTail(docId, 0);
    const eventsUpTo = allEvents.filter(e => e.seq <= atSeq);

    // Start from snapshot 0 (EMPTY_DOCUMENT equivalent stored at creation time).
    // We use the stored snapshot as baseline even if it's past atSeq.
    // A full solution would store per-interval snapshots and find the closest one.
    // For this implementation, replay from event 0.
    const { EMPTY_DOCUMENT } = await import("@pageforge/ir");
    let replayDoc: Document = EMPTY_DOCUMENT;
    for (const event of eventsUpTo) {
      const patches = event.patches as Parameters<typeof applyPatches>[1];
      replayDoc = applyPatches(replayDoc, patches);
    }
    doc = replayDoc;
    version = atSeq;
  } else if (version < atSeq) {
    // Apply remaining events from current version up to atSeq
    const tail = await eventRepo.getTail(docId, version);
    const eventsUpTo = tail.filter(e => e.seq <= atSeq);
    for (const event of eventsUpTo) {
      const patches = event.patches as Parameters<typeof applyPatches>[1];
      doc = applyPatches(doc, patches);
    }
    version = atSeq;
  }

  return c.json({ doc, version });
});
