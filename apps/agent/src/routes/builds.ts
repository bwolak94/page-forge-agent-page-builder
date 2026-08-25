/**
 * builds.ts — REST + SSE routes for HTML export builds.
 *
 * POST /builds/:docId  — enqueue an HTML build job; returns { buildId }.
 * GET  /builds/:buildId/status — SSE stream of build status events.
 *
 * Flow:
 *   1. Client POSTs to /builds/:docId
 *   2. Agent creates a build record (pending) and enqueues a BullMQ job.
 *   3. Client opens GET /builds/:buildId/status to watch progress.
 *   4. Worker processes the job, updates build status in DB.
 *   5. SSE polling detects status change and streams events to the client.
 *   6. Client receives build.ready | build.failed with the artifact URL.
 *
 * Patterns: Observer (SSE), Idempotent Worker (job enqueue is idempotent
 * on the build record — each POST creates a new build, not idempotent here).
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { BuildRepository, DocumentRepository, getDb } from "@pageforge/db";
import { authMiddleware } from "../middleware/auth.js";
import { getHtmlBuildQueue } from "../queues.js";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const postBuildsSchema = z.object({
  target: z.enum(["html", "react"]).default("html"),
});

// ---------------------------------------------------------------------------
// SSE polling interval and timeout
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 1_000;
const SSE_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes max

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const buildsRoute = new Hono();

/**
 * POST /builds/:docId — create a build and enqueue the BullMQ job.
 *
 * Returns 202 Accepted with { buildId } so the client can poll status.
 */
buildsRoute.post("/:docId", authMiddleware, async c => {
  const docId = c.req.param("docId");

  const body = await c.req.json().catch(() => ({}));
  const parsed = postBuildsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", issues: parsed.error.issues }, 400);
  }
  const { target } = parsed.data;

  const db = getDb();
  const buildRepo = new BuildRepository(db);
  const docRepo = new DocumentRepository(db);

  // Rehydrate to get current version for the idempotency key in the worker
  const { version } = await docRepo.rehydrate(docId).catch(() => {
    throw new Error("Document not found");
  });

  const build = await buildRepo.create({ documentId: docId, target });

  await getHtmlBuildQueue().add("html-build", {
    buildId: build.id,
    documentId: docId,
    version,
  });

  return c.json({ buildId: build.id }, 202);
});

/**
 * GET /builds/:buildId/status — SSE stream of build lifecycle events.
 *
 * Events:
 *   { event: "build.running", data: { status: "running" } }
 *   { event: "build.ready",   data: { status: "done", url: "..." } }
 *   { event: "build.failed",  data: { status: "failed", log: "..." } }
 */
buildsRoute.get("/:buildId/status", authMiddleware, async c => {
  const buildId = c.req.param("buildId");
  const db = getDb();
  const buildRepo = new BuildRepository(db);

  return streamSSE(c, async stream => {
    const deadline = Date.now() + SSE_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const build = await buildRepo.findById(buildId);

      if (!build) {
        await stream.writeSSE({
          event: "build.failed",
          data: JSON.stringify({ status: "failed", log: "Build not found" }),
        });
        break;
      }

      if (build.status === "done") {
        await stream.writeSSE({
          event: "build.ready",
          data: JSON.stringify({ status: "done", url: build.artifactUrl }),
        });
        break;
      }

      if (build.status === "failed") {
        await stream.writeSSE({
          event: "build.failed",
          data: JSON.stringify({ status: "failed", log: build.log }),
        });
        break;
      }

      // Still pending or running — emit heartbeat
      await stream.writeSSE({
        event: build.status === "running" ? "build.running" : "build.pending",
        data: JSON.stringify({ status: build.status }),
      });

      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  });
});
