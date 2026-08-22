/**
 * Drizzle ORM schema — all 7 PageForge tables.
 *
 * Design decisions (ADR-003, ADR-006):
 * - document_events is append-only; never updated or deleted.
 * - documents stores both latest version (OCC lock) and last snapshot.
 * - snapshot_seq tracks which event seq the snapshot reflects so rehydration
 *   can fetch only the tail events since that snapshot.
 * - UNIQUE(document_id, seq) prevents duplicate events from race conditions.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Document, JsonPatch } from "@pageforge/ir";

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// documents  (snapshot store + OCC version)
// ---------------------------------------------------------------------------

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    /** Latest event sequence number — used for OCC. */
    version: integer("version").default(0).notNull(),
    /** Sequence number at which the snapshot was taken. */
    snapshotSeq: integer("snapshot_seq").default(0).notNull(),
    /** Document state at snapshotSeq. */
    snapshot: jsonb("snapshot").$type<Document>().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  t => ({
    projectIdx: index("documents_project_id_idx").on(t.projectId),
  }),
);

// ---------------------------------------------------------------------------
// document_events  (append-only event log)
// ---------------------------------------------------------------------------

export const documentEvents = pgTable(
  "document_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    seq: integer("seq").notNull(),
    actor: text("actor").$type<"user" | "agent">().notNull(),
    kind: text("kind").notNull(),
    patches: jsonb("patches").$type<JsonPatch[]>().notNull(),
    inverse: jsonb("inverse").$type<JsonPatch[]>().notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  t => ({
    docSeqIdx: index("document_events_doc_seq_idx").on(t.documentId, t.seq),
    docSeqUniq: uniqueIndex("document_events_doc_seq_unique").on(
      t.documentId,
      t.seq,
    ),
  }),
);

// ---------------------------------------------------------------------------
// conversations + messages + tool_calls
// ---------------------------------------------------------------------------

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .references(() => documents.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").$type<"user" | "assistant" | "tool">().notNull(),
  content: jsonb("content").notNull(),
  usage: jsonb("usage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const toolCalls = pgTable("tool_calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .references(() => messages.id, { onDelete: "cascade" })
    .notNull(),
  tool: text("tool").notNull(),
  args: jsonb("args").notNull(),
  result: jsonb("result"),
  eventSeq: integer("event_seq"),
  durationMs: integer("duration_ms"),
  error: text("error"),
});

// ---------------------------------------------------------------------------
// builds
// ---------------------------------------------------------------------------

export const builds = pgTable("builds", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .references(() => documents.id, { onDelete: "cascade" })
    .notNull(),
  target: text("target").$type<"react" | "html">().notNull(),
  status: text("status")
    .$type<"pending" | "running" | "done" | "failed">()
    .default("pending")
    .notNull(),
  artifactUrl: text("artifact_url"),
  log: text("log"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
