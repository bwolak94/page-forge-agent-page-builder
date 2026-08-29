/**
 * preview.ts — accept or discard an agent-proposed change.
 *
 * POST /api/preview/:docId/commit  — apply the proposed patches to the event log.
 * POST /api/preview/:docId/discard — no-op; client clears the preview locally.
 *
 * The patches are sent back by the client (they were embedded in the
 * doc.preview SSE event). This avoids server-side pending state.
 */

import { Hono } from "hono";
import { z } from "zod";
import { DocumentRepository, DocumentEventRepository, getDb } from "@pageforge/db";
import { jsonPatchSchema, applyPatches } from "@pageforge/ir";
import { SNAPSHOT_INTERVAL } from "@pageforge/db";
import { authMiddleware } from "../middleware/auth.js";

const commitBodySchema = z.object({
  previewId: z.string().min(1),
  kind: z.string().min(1),
  patches: z.array(jsonPatchSchema),
  inverse: z.array(jsonPatchSchema),
});

export const previewRoute = new Hono();

previewRoute.post("/:docId/commit", authMiddleware, async c => {
  const docId = c.req.param("docId");

  const body = await c.req.json().catch(() => null);
  const parsed = commitBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Bad request", details: parsed.error.flatten() }, 400);
  }
  const { kind, patches, inverse } = parsed.data;

  const db = getDb();
  const docRepo = new DocumentRepository(db);
  const eventRepo = new DocumentEventRepository(db);

  let rehydrated: Awaited<ReturnType<DocumentRepository["rehydrate"]>>;
  try {
    rehydrated = await docRepo.rehydrate(docId);
  } catch {
    return c.json({ error: "not_found" }, 404);
  }

  const { doc, version } = rehydrated;
  const nextSeq = version + 1;
  const nextDoc = applyPatches(doc, patches);

  await db.transaction(async tx => {
    await eventRepo.append(tx, {
      documentId: docId,
      seq: nextSeq,
      actor: "agent",
      kind,
      patches,
      inverse,
    });

    if (nextSeq % SNAPSHOT_INTERVAL === 0) {
      await docRepo.updateSnapshot(tx, docId, nextDoc, nextSeq);
    } else {
      await docRepo.incrementVersion(tx, docId, nextSeq);
    }
  });

  return c.json({ ok: true, seq: nextSeq });
});

previewRoute.post("/:docId/discard", authMiddleware, async c => {
  // Client-side only operation — server has no pending state to clean up.
  return c.json({ ok: true });
});
