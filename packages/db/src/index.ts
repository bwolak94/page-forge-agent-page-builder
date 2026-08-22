/**
 * @pageforge/db — public API
 *
 * Exports the Drizzle schema, client factory, and all repositories.
 * Zero IO at import time — database connections are only opened when
 * `createDb()` or `getDb()` is explicitly called.
 */

// Schema
export * from "./schema.js";

// Client
export { createDb, getDb } from "./client.js";
export type { DrizzleDB } from "./client.js";

// Constants
export const SNAPSHOT_INTERVAL = 50;

// Repositories
export { DocumentRepository } from "./repositories/document.repo.js";
export type { DocumentRow } from "./repositories/document.repo.js";

export { DocumentEventRepository } from "./repositories/document-event.repo.js";
export type {
  DocumentEventRow,
  AppendEventInput,
} from "./repositories/document-event.repo.js";

export { ProjectRepository } from "./repositories/project.repo.js";
export type { ProjectRow } from "./repositories/project.repo.js";

export { ConversationRepository } from "./repositories/conversation.repo.js";
export type {
  ConversationRow,
  MessageRow,
} from "./repositories/conversation.repo.js";

export { BuildRepository } from "./repositories/build.repo.js";
export type { BuildRow, BuildStatus, BuildTarget } from "./repositories/build.repo.js";
