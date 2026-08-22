/**
 * POST /commands/:docId — command execution endpoint.
 *
 * Pipeline (Unit of Work pattern):
 *   1. Authenticate (authMiddleware)
 *   2. Validate request body with Zod
 *   3. Open DB transaction:
 *      a. SELECT FOR UPDATE — get current version (OCC lock)
 *      b. Check baseVersion === currentVersion — 409 if mismatch
 *      c. Rehydrate document (snapshot + tail events)
 *      d. Execute command via @pageforge/commands
 *      e. INSERT document_event
 *      f. UPDATE documents.version (+ snapshot every 50 events)
 *   4. Return 200 { seq, patches, affected }
 *
 * Errors:
 *   - 400: malformed body
 *   - 401: missing/invalid auth
 *   - 404: document not found
 *   - 409: OCC conflict (baseVersion mismatch)
 *   - 422: command validation failure
 *   - 500: unexpected errors
 */

import { Hono } from "hono";
import { z } from "zod";
import {
  DocumentRepository,
  DocumentEventRepository,
  SNAPSHOT_INTERVAL,
} from "@pageforge/db";
import { executeCommand } from "@pageforge/commands";
import { REGISTRY, canAccept } from "@pageforge/registry";
import { getDb } from "@pageforge/db";
import { authMiddleware } from "../middleware/auth.js";

// ---------------------------------------------------------------------------
// Registry adapter
// ---------------------------------------------------------------------------

const registryInterface = {
  canAccept: (parentType: string, childType: string, slot: string) =>
    canAccept(REGISTRY, parentType, childType, slot),
  propsSchema: (type: string) => REGISTRY[type]?.propsSchema ?? null,
};

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const commandBodySchema = z.object({
  baseVersion: z.number().int().nonnegative(),
  command: z.object({
    kind: z.string().min(1),
    args: z.record(z.unknown()),
  }),
});

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const commandsRoute = new Hono();

commandsRoute.post("/commands/:docId", authMiddleware, async c => {
  const docId = c.req.param("docId");
  const session = c.get("session");

  // 1. Parse body
  const rawBody = await c.req.json().catch(() => null);
  const parsed = commandBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: "Bad request", details: parsed.error.flatten() }, 400);
  }
  const { baseVersion, command } = parsed.data;

  const db = getDb();
  const docRepo = new DocumentRepository(db);
  const eventRepo = new DocumentEventRepository(db);

  try {
    const result = await db.transaction(async tx => {
      // 2. OCC check — lock the row
      const currentVersion = await docRepo.getVersionForUpdate(tx, docId);
      if (currentVersion !== baseVersion) {
        // Signal conflict — caught below
        throw Object.assign(new Error("conflict"), {
          type: "conflict",
          serverVersion: currentVersion,
        });
      }

      // 3. Rehydrate
      const { doc } = await docRepo.rehydrate(docId);

      // 4. Execute command (pure — no IO)
      const cmdResult = executeCommand(
        doc,
        registryInterface,
        command.kind,
        command.args,
      );

      if (cmdResult.isErr()) {
        throw Object.assign(new Error(cmdResult.error.message), {
          type: "domain",
          error: cmdResult.error,
        });
      }

      const { doc: nextDoc, patches, inverse, affected } = cmdResult.value;
      const nextSeq = currentVersion + 1;

      // 5. Persist event
      await eventRepo.append(tx, {
        documentId: docId,
        seq: nextSeq,
        actor: session.actor,
        kind: command.kind,
        patches,
        inverse,
      });

      // 6. Update version (+ snapshot every SNAPSHOT_INTERVAL events)
      if (nextSeq % SNAPSHOT_INTERVAL === 0) {
        await docRepo.updateSnapshot(tx, docId, nextDoc, nextSeq);
      } else {
        await docRepo.incrementVersion(tx, docId, nextSeq);
      }

      return { seq: nextSeq, patches, affected };
    });

    return c.json(result, 200);
  } catch (err: unknown) {
    if (err instanceof Error) {
      const typed = err as Error & { type?: string; serverVersion?: number; error?: unknown };

      if (typed.type === "conflict") {
        return c.json(
          { error: "conflict", serverVersion: typed.serverVersion },
          409,
        );
      }

      if (typed.type === "domain") {
        return c.json({ error: "command_failed", detail: typed.error }, 422);
      }

      if (err.message.includes("not found")) {
        return c.json({ error: "not_found" }, 404);
      }
    }

    console.error("[commands] unexpected error", err);
    return c.json({ error: "internal_server_error" }, 500);
  }
});
