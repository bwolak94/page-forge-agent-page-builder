-- migration: 0001_initial
-- upgrade: create all 7 PageForge tables
-- downgrade: see end of file

-- ----------------------------------------------------------------------------
-- upgrade
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "projects" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"   TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"   UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "version"      INTEGER NOT NULL DEFAULT 0,
  "snapshot_seq" INTEGER NOT NULL DEFAULT 0,
  "snapshot"     JSONB NOT NULL,
  "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "documents_project_id_idx"
  ON "documents" ("project_id");

CREATE TABLE IF NOT EXISTS "document_events" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "seq"         INTEGER NOT NULL,
  "actor"       TEXT NOT NULL CHECK ("actor" IN ('user', 'agent')),
  "kind"        TEXT NOT NULL,
  "patches"     JSONB NOT NULL,
  "inverse"     JSONB NOT NULL,
  "meta"        JSONB,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "document_events_doc_seq_idx"
  ON "document_events" ("document_id", "seq");

CREATE UNIQUE INDEX IF NOT EXISTS "document_events_doc_seq_unique"
  ON "document_events" ("document_id", "seq");

CREATE TABLE IF NOT EXISTS "conversations" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role"            TEXT NOT NULL CHECK ("role" IN ('user', 'assistant', 'tool')),
  "content"         JSONB NOT NULL,
  "usage"           JSONB,
  "created_at"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "tool_calls" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id"  UUID NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "tool"        TEXT NOT NULL,
  "args"        JSONB NOT NULL,
  "result"      JSONB,
  "event_seq"   INTEGER,
  "duration_ms" INTEGER,
  "error"       TEXT
);

CREATE TABLE IF NOT EXISTS "builds" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id"  UUID NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "target"       TEXT NOT NULL CHECK ("target" IN ('react', 'html')),
  "status"       TEXT NOT NULL DEFAULT 'pending'
                   CHECK ("status" IN ('pending', 'running', 'done', 'failed')),
  "artifact_url" TEXT,
  "log"          TEXT,
  "created_at"   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- downgrade (run in reverse to respect FK order)
-- ----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS "builds";
-- DROP TABLE IF EXISTS "tool_calls";
-- DROP TABLE IF EXISTS "messages";
-- DROP TABLE IF EXISTS "conversations";
-- DROP INDEX IF EXISTS "document_events_doc_seq_unique";
-- DROP INDEX IF EXISTS "document_events_doc_seq_idx";
-- DROP TABLE IF EXISTS "document_events";
-- DROP INDEX IF EXISTS "documents_project_id_idx";
-- DROP TABLE IF EXISTS "documents";
-- DROP TABLE IF EXISTS "projects";
