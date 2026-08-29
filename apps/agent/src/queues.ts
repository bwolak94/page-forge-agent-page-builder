/**
 * queues.ts — BullMQ queue client for the agent service.
 *
 * The agent enqueues jobs; the worker (apps/worker) processes them.
 * Queue names are shared constants — see apps/worker/src/queues.ts.
 *
 * Lazy singleton: the Queue is created on first use to avoid connecting
 * to Redis before the first build request.
 */

import { Queue } from "bullmq";

const HTML_BUILD_QUEUE_NAME = "html-build";
const DEPLOY_QUEUE_NAME = "deploy";

let _queue: Queue | null = null;
let _deployQueue: Queue | null = null;

const redisConnection = {
  host: process.env["REDIS_HOST"] ?? "localhost",
  port: Number(process.env["REDIS_PORT"] ?? 6379),
  password: process.env["REDIS_PASSWORD"],
};

/**
 * Return the shared BullMQ Queue instance for html-build jobs.
 * Created lazily on first call.
 */
export function getHtmlBuildQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(HTML_BUILD_QUEUE_NAME, { connection: redisConnection });
  }
  return _queue;
}

/**
 * Return the shared BullMQ Queue instance for deploy jobs.
 * Created lazily on first call.
 */
export function getDeployQueue(): Queue {
  if (!_deployQueue) {
    _deployQueue = new Queue(DEPLOY_QUEUE_NAME, { connection: redisConnection });
  }
  return _deployQueue;
}
