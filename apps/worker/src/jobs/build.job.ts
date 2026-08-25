/**
 * build.job.ts — BullMQ job processor for HTML export builds.
 *
 * Pipeline:
 *   1. Idempotency check — if artifact exists in R2, return cached URL.
 *   2. Rehydrate document from DB.
 *   3. SSR via renderIrToHtml (same React components as the canvas).
 *   4. Write HTML to temp file.
 *   5. Run Tailwind CLI — CSS from actual rendered markup, no safelist.
 *   6. Format HTML with prettier.
 *   7. ZIP index.html + styles.css.
 *   8. Upload ZIP to R2.
 *   9. Generate presigned URL (5 min TTL).
 *  10. Mark build done.
 *  11. Cleanup temp directory.
 *
 * The job is idempotent on (documentId, version, "html"):
 *   same inputs always produce the same artifact — no reprocessing if cached.
 *
 * Patterns: Idempotent Worker, Observer (build status events via DB polling).
 */

import type { Job } from "bullmq";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import prettier from "prettier";
import { renderIrToHtml } from "@pageforge/emitter-html";
import { REGISTRY } from "@pageforge/registry";
import { BuildRepository, DocumentRepository, getDb } from "@pageforge/db";
import { R2Service } from "../services/r2.service.js";
import { TailwindService } from "../services/tailwind.service.js";
import { ZipService } from "../services/zip.service.js";

// ---------------------------------------------------------------------------
// Job data schema
// ---------------------------------------------------------------------------

export interface HtmlBuildJobData {
  buildId: string;
  documentId: string;
  version: number;
}

// ---------------------------------------------------------------------------
// Service singletons (stateless, safe to share across jobs)
// ---------------------------------------------------------------------------

const r2 = new R2Service();
const tailwind = new TailwindService();
const zip = new ZipService();

// ---------------------------------------------------------------------------
// processHtmlBuild
// ---------------------------------------------------------------------------

/**
 * BullMQ job processor — entry point for HTML build jobs.
 * Dependency-injected services allow easy unit testing.
 */
export async function processHtmlBuild(job: Job<HtmlBuildJobData>): Promise<void> {
  const { buildId, documentId, version } = job.data;
  const db = getDb();
  const buildRepo = new BuildRepository(db);
  const docRepo = new DocumentRepository(db);

  const r2Key = `builds/${documentId}/${version}/html.zip`;

  // ------------------------------------------------------------------
  // 1. Idempotency — return cached artifact without reprocessing
  // ------------------------------------------------------------------
  if (await r2.exists(r2Key)) {
    const url = await r2.presign(r2Key);
    await buildRepo.updateStatus(buildId, { status: "done", artifactUrl: url });
    return;
  }

  await buildRepo.updateStatus(buildId, { status: "running" });

  let tmpDir: string | null = null;

  try {
    // ------------------------------------------------------------------
    // 2. Rehydrate document from event-sourced store
    // ------------------------------------------------------------------
    const { doc } = await docRepo.rehydrate(documentId);

    // ------------------------------------------------------------------
    // 3. SSR — same React components as the canvas (zero template drift)
    // ------------------------------------------------------------------
    const html = renderIrToHtml(doc, REGISTRY);

    // ------------------------------------------------------------------
    // 4. Write HTML to temp directory
    // ------------------------------------------------------------------
    tmpDir = await mkdtemp(join(tmpdir(), "pf-build-"));
    const htmlPath = join(tmpDir, "index.html");
    await writeFile(htmlPath, html, "utf8");

    // ------------------------------------------------------------------
    // 5. Run Tailwind CLI — CSS from rendered HTML markup, no safelist
    // ------------------------------------------------------------------
    const cssPath = join(tmpDir, "styles.css");
    await tailwind.build({ contentPath: htmlPath, outputPath: cssPath });

    // ------------------------------------------------------------------
    // 6. Format HTML with prettier
    // ------------------------------------------------------------------
    const formatted = await prettier.format(html, { parser: "html" });
    await writeFile(htmlPath, formatted, "utf8");

    // ------------------------------------------------------------------
    // 7. ZIP index.html + styles.css
    // ------------------------------------------------------------------
    const zipPath = join(tmpDir, "export.zip");
    await zip.create(zipPath, [
      { path: htmlPath, name: "index.html" },
      { path: cssPath, name: "styles.css" },
    ]);

    // ------------------------------------------------------------------
    // 8. Upload ZIP to R2
    // ------------------------------------------------------------------
    await r2.upload(r2Key, zipPath, "application/zip");

    // ------------------------------------------------------------------
    // 9. Presigned URL — TTL 5 min (security rule: TTL ≤ 5 min)
    // ------------------------------------------------------------------
    const url = await r2.presign(r2Key, 300);

    // ------------------------------------------------------------------
    // 10. Mark build done
    // ------------------------------------------------------------------
    await buildRepo.updateStatus(buildId, { status: "done", artifactUrl: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await buildRepo.updateStatus(buildId, {
      status: "failed",
      log: message,
    });
    throw err; // Let BullMQ retry or move to failed queue
  } finally {
    // ------------------------------------------------------------------
    // 11. Cleanup temp directory — worker is stateless between jobs
    // ------------------------------------------------------------------
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {
        // Best-effort cleanup — do not mask the original error
      });
    }
  }
}
