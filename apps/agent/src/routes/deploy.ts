/**
 * deploy.ts — one-click deploy to Vercel or Cloudflare Pages.
 *
 * POST /api/deploy/:docId
 *   Body: { provider: "vercel" | "cloudflare", hookUrl: string }
 *   Returns: 202 { deployId, provider }
 *
 * GET /api/deploy/:deployId/status
 *   SSE stream of deploy lifecycle events until complete or failed.
 *
 * Flow:
 *   1. Rehydrate document.
 *   2. Enqueue a BullMQ deploy job.
 *   3. Client polls SSE status until build.ready or build.failed.
 *
 * The actual deploy happens in apps/worker/src/jobs/deploy.job.ts.
 * Provider-specific logic is encapsulated in the worker to keep this route thin.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { BuildRepository, DocumentRepository, getDb } from "@pageforge/db";
import { authMiddleware } from "../middleware/auth.js";
import { getDeployQueue } from "../queues.js";

const postDeploySchema = z.object({
  provider: z.enum(["vercel", "cloudflare"]),
  /** Vercel Deploy Hook URL or Cloudflare Pages Direct Upload API token. */
  hookUrl: z.string().url(),
});

const POLL_INTERVAL_MS = 1_500;
const SSE_TIMEOUT_MS = 10 * 60 * 1_000; // 10 minutes

export const deployRoute = new Hono();

deployRoute.post("/:docId", authMiddleware, async c => {
  const docId = c.req.param("docId");

  const body = await c.req.json().catch(() => ({}));
  const parsed = postDeploySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", issues: parsed.error.issues }, 400);
  }
  const { provider, hookUrl } = parsed.data;

  const db = getDb();
  const docRepo = new DocumentRepository(db);
  const buildRepo = new BuildRepository(db);

  const { version } = await docRepo.rehydrate(docId).catch(() => {
    throw new Error("Document not found");
  });

  // Re-use build record to track deploy status
  const build = await buildRepo.create({ documentId: docId, target: "react" });

  await getDeployQueue().add("deploy", {
    buildId: build.id,
    documentId: docId,
    version,
    provider,
    hookUrl,
  });

  return c.json({ deployId: build.id, provider }, 202);
});

deployRoute.get("/:deployId/status", authMiddleware, async c => {
  const deployId = c.req.param("deployId");
  const db = getDb();
  const buildRepo = new BuildRepository(db);

  return streamSSE(c, async stream => {
    const deadline = Date.now() + SSE_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const build = await buildRepo.findById(deployId);

      if (!build) {
        await stream.writeSSE({
          event: "deploy.failed",
          data: JSON.stringify({ status: "failed", log: "Deploy record not found" }),
        });
        break;
      }

      if (build.status === "done") {
        await stream.writeSSE({
          event: "deploy.ready",
          data: JSON.stringify({ status: "done", url: build.artifactUrl }),
        });
        break;
      }

      if (build.status === "failed") {
        await stream.writeSSE({
          event: "deploy.failed",
          data: JSON.stringify({ status: "failed", log: build.log }),
        });
        break;
      }

      await stream.writeSSE({
        event: build.status === "running" ? "deploy.running" : "deploy.queued",
        data: JSON.stringify({ status: build.status }),
      });

      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  });
});
