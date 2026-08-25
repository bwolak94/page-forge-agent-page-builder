/**
 * queues.ts — shared BullMQ queue name constants and Queue factory.
 *
 * Exported from the worker app and re-used by the agent app when enqueuing
 * build jobs. Single source of truth for queue names.
 */

import { Queue } from "bullmq";

export const HTML_BUILD_QUEUE_NAME = "html-build";

// ---------------------------------------------------------------------------
// Queue factory
// ---------------------------------------------------------------------------

/**
 * Create a BullMQ Queue for the html-build queue.
 * Used by the agent service (apps/agent) to enqueue build jobs.
 *
 * @param connection - Redis connection options.
 */
export function createHtmlBuildQueue(connection: {
  host: string;
  port: number;
  password?: string;
}): Queue {
  return new Queue(HTML_BUILD_QUEUE_NAME, { connection });
}
