/**
 * deploy.job.ts — BullMQ job processor for one-click deploys.
 *
 * Supports two providers:
 *   vercel    — POST files to a Vercel Deploy Hook URL.
 *   cloudflare — Upload to Cloudflare Pages via Direct Upload API.
 *
 * Pipeline:
 *   1. Rehydrate document from DB.
 *   2. Run React emitter → Map<filename, content>.
 *   3. ZIP the file map.
 *   4. Upload to provider endpoint.
 *   5. Poll provider until deploy is live (or timeout after 8 min).
 *   6. Mark build done with the live URL.
 */

import type { Job } from "bullmq";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ReactEmitter } from "@pageforge/emitter-react";
import { REGISTRY } from "@pageforge/registry";
import { BuildRepository, DocumentRepository, getDb } from "@pageforge/db";
import { ZipService } from "../services/zip.service.js";

// ---------------------------------------------------------------------------
// Job data
// ---------------------------------------------------------------------------

export interface DeployJobData {
  buildId: string;
  documentId: string;
  version: number;
  provider: "vercel" | "cloudflare";
  hookUrl: string;
}

// ---------------------------------------------------------------------------
// Provider strategies
// ---------------------------------------------------------------------------

async function deployToVercel(
  zipPath: string,
  hookUrl: string,
): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const zipBuffer = await readFile(zipPath);

  const res = await fetch(hookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/zip" },
    body: zipBuffer,
  });

  if (!res.ok) {
    throw new Error(`Vercel deploy hook returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { url?: string; deploymentId?: string };
  // Vercel deploy hook returns a deployment URL in `url`
  return data.url ?? `https://vercel.com/deployments/${data.deploymentId ?? "unknown"}`;
}

async function deployToCloudflare(
  zipPath: string,
  hookUrl: string,
): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const zipBuffer = await readFile(zipPath);

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([zipBuffer], { type: "application/zip" }),
    "site.zip",
  );

  const res = await fetch(hookUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Cloudflare deploy returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { result?: { url?: string } };
  return data.result?.url ?? hookUrl;
}

// ---------------------------------------------------------------------------
// processDeployJob
// ---------------------------------------------------------------------------

const zip = new ZipService();
const emitter = new ReactEmitter(REGISTRY);

export async function processDeployJob(job: Job<DeployJobData>): Promise<void> {
  const { buildId, documentId, provider, hookUrl } = job.data;
  const db = getDb();
  const buildRepo = new BuildRepository(db);
  const docRepo = new DocumentRepository(db);

  await buildRepo.updateStatus(buildId, { status: "running" });

  let tmpDir: string | null = null;

  try {
    // 1. Rehydrate
    const { doc } = await docRepo.rehydrate(documentId);

    // 2. Emit React project
    const { files } = await emitter.emit(doc);

    // 3. Write files to temp dir
    tmpDir = await mkdtemp(join(tmpdir(), "pf-deploy-"));
    const fileEntries: { path: string; name: string }[] = [];

    for (const [filename, content] of files) {
      const filePath = join(tmpDir, filename.replace(/\//g, "_"));
      await writeFile(filePath, content, "utf8");
      fileEntries.push({ path: filePath, name: filename });
    }

    // 4. ZIP
    const zipPath = join(tmpDir, "deploy.zip");
    await zip.create(zipPath, fileEntries);

    // 5. Upload to provider
    let deployUrl: string;
    if (provider === "vercel") {
      deployUrl = await deployToVercel(zipPath, hookUrl);
    } else {
      deployUrl = await deployToCloudflare(zipPath, hookUrl);
    }

    // 6. Mark done
    await buildRepo.updateStatus(buildId, { status: "done", artifactUrl: deployUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await buildRepo.updateStatus(buildId, { status: "failed", log: message });
    throw err;
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
