/**
 * server.ts — BullMQ Worker setup for PageForge build jobs.
 *
 * Connects to Redis, registers the html-build queue worker,
 * and sets up graceful shutdown on SIGTERM/SIGINT.
 *
 * The worker is intentionally stateless: no in-memory state shared
 * between job executions. Services are instantiated per-job inside
 * processHtmlBuild to prevent cross-job contamination.
 */

import { Worker, type Job } from "bullmq";
import { HTML_BUILD_QUEUE_NAME, DEPLOY_QUEUE_NAME } from "./queues.js";
import { processHtmlBuild, type HtmlBuildJobData } from "./jobs/build.job.js";
import { processDeployJob, type DeployJobData } from "./jobs/deploy.job.js";

// ---------------------------------------------------------------------------
// Redis connection
// ---------------------------------------------------------------------------

const connection = {
  host: process.env["REDIS_HOST"] ?? "localhost",
  port: Number(process.env["REDIS_PORT"] ?? 6379),
  password: process.env["REDIS_PASSWORD"],
};

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker<HtmlBuildJobData>(
  HTML_BUILD_QUEUE_NAME,
  async (job: Job<HtmlBuildJobData>) => {
    console.log(`[worker] Processing build job ${job.id} — buildId=${job.data.buildId}`);
    await processHtmlBuild(job);
    console.log(`[worker] Completed build job ${job.id}`);
  },
  {
    connection,
    concurrency: Number(process.env["WORKER_CONCURRENCY"] ?? 2),
  },
);

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

const deployWorker = new Worker<DeployJobData>(
  DEPLOY_QUEUE_NAME,
  async (job: Job<DeployJobData>) => {
    console.log(`[worker] Processing deploy job ${job.id} — buildId=${job.data.buildId} provider=${job.data.provider}`);
    await processDeployJob(job);
    console.log(`[worker] Completed deploy job ${job.id}`);
  },
  {
    connection,
    concurrency: 2,
  },
);

deployWorker.on("failed", (job, err) => {
  console.error(`[worker] Deploy job ${job?.id} failed:`, err.message);
});

console.log(`[worker] Listening on queues "${HTML_BUILD_QUEUE_NAME}", "${DEPLOY_QUEUE_NAME}"`);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(): Promise<void> {
  console.log("[worker] Shutting down...");
  await Promise.all([worker.close(), deployWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
