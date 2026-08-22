/**
 * Persistence integration tests — requires Docker (Testcontainers).
 *
 * What is tested:
 * 1. Rehydrate returns identical doc after N events (event sourcing correctness).
 * 2. Snapshot is compacted at every SNAPSHOT_INTERVAL events.
 * 3. Concurrent POST /commands with same baseVersion → exactly one 409 (OCC).
 *
 * Tests are tagged with `@integration` and skipped when SKIP_INTEGRATION=1.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../schema.js";
import { DocumentRepository } from "../repositories/document.repo.js";
import { DocumentEventRepository } from "../repositories/document-event.repo.js";
import { ProjectRepository } from "../repositories/project.repo.js";
import { SNAPSHOT_INTERVAL } from "../index.js";
import { EMPTY_DOCUMENT, applyPatches } from "@pageforge/ir";
import { executeCommand } from "@pageforge/commands";
import { canAccept, REGISTRY } from "@pageforge/registry";
import type { DrizzleDB } from "../client.js";

// ---------------------------------------------------------------------------
// Skip guard
// ---------------------------------------------------------------------------

const SKIP = process.env["SKIP_INTEGRATION"] === "1";
const maybeDescribe = SKIP ? describe.skip : describe;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../drizzle/migrations/0001_initial.sql",
);

const registryInterface = {
  canAccept: (p: string, c: string, s: string) => canAccept(REGISTRY, p, c, s),
  propsSchema: (t: string) => REGISTRY[t]?.propsSchema ?? null,
};

async function runMigrations(connectionString: string): Promise<void> {
  const sql = await readFile(MIGRATION_PATH, "utf-8");
  // Extract only the upgrade section (skip the commented-out downgrade)
  const upgradeSql = sql.split("-- downgrade")[0] ?? sql;
  const client = postgres(connectionString, { max: 1 });
  try {
    await client.unsafe(upgradeSql);
  } finally {
    await client.end();
  }
}

function makeDb(connectionString: string): DrizzleDB {
  const pool = postgres(connectionString, { max: 5 });
  return drizzle(pool, { schema });
}

/** Execute `count` UpdateProps commands against a document and return the final expected doc. */
async function appendNEvents(
  db: DrizzleDB,
  documentId: string,
  count: number,
): Promise<{ finalDoc: typeof EMPTY_DOCUMENT; finalVersion: number }> {
  const docRepo = new DocumentRepository(db);
  const eventRepo = new DocumentEventRepository(db);

  let { doc, version } = await docRepo.rehydrate(documentId);

  for (let i = 0; i < count; i++) {
    const result = executeCommand(doc, registryInterface, "set-meta", {
      id: doc.root,
      meta: { name: `event-${i + 1}` },
    });

    if (result.isErr()) throw new Error(`Command failed at event ${i}: ${result.error.message}`);

    const { doc: nextDoc, patches, inverse } = result.value;
    const nextSeq = version + 1;

    await db.transaction(async tx => {
      await eventRepo.append(tx, {
        documentId,
        seq: nextSeq,
        actor: "user",
        kind: "set-meta",
        patches,
        inverse,
      });

      if (nextSeq % SNAPSHOT_INTERVAL === 0) {
        await docRepo.updateSnapshot(tx, documentId, nextDoc, nextSeq);
      } else {
        await docRepo.incrementVersion(tx, documentId, nextSeq);
      }
    });

    doc = nextDoc;
    version = nextSeq;
  }

  return { finalDoc: doc as typeof EMPTY_DOCUMENT, finalVersion: version };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

maybeDescribe("event sourcing — persistence integration", () => {
  let container: StartedPostgreSqlContainer;
  let db: DrizzleDB;
  let projectId: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    const url = container.getConnectionUri();
    await runMigrations(url);
    db = makeDb(url);

    const projectRepo = new ProjectRepository(db);
    const project = await projectRepo.create({ ownerId: "test-user", name: "Test Project" });
    projectId = project.id;
  }, 60_000); // container startup can take a while

  afterAll(async () => {
    await container?.stop();
  });

  it("rehydrates a 200-event document identically", async () => {
    const docRepo = new DocumentRepository(db);

    // Create document
    const documentId = await db.transaction(async tx =>
      docRepo.create(tx, { projectId, snapshot: EMPTY_DOCUMENT }),
    );

    // Append 200 events
    const { finalDoc, finalVersion } = await appendNEvents(db, documentId, 200);
    expect(finalVersion).toBe(200);

    // Rehydrate and compare
    const { doc: rehydrated, version } = await docRepo.rehydrate(documentId);
    expect(version).toBe(200);
    expect(rehydrated).toEqual(finalDoc);
  }, 30_000);

  it("takes a snapshot every SNAPSHOT_INTERVAL events", async () => {
    const docRepo = new DocumentRepository(db);

    const documentId = await db.transaction(async tx =>
      docRepo.create(tx, { projectId, snapshot: EMPTY_DOCUMENT }),
    );

    await appendNEvents(db, documentId, SNAPSHOT_INTERVAL);

    // Query documents table directly
    const { documents } = schema;
    const { eq } = await import("drizzle-orm");
    const [snap] = await db
      .select({ version: documents.version, snapshotSeq: documents.snapshotSeq })
      .from(documents)
      .where(eq(documents.id, documentId));

    expect(snap?.version).toBe(SNAPSHOT_INTERVAL);
    expect(snap?.snapshotSeq).toBe(SNAPSHOT_INTERVAL);
  }, 30_000);

  it("snapshot_seq stays at previous multiple after non-snapshot events", async () => {
    const docRepo = new DocumentRepository(db);

    const documentId = await db.transaction(async tx =>
      docRepo.create(tx, { projectId, snapshot: EMPTY_DOCUMENT }),
    );

    // Append SNAPSHOT_INTERVAL + 5 events
    await appendNEvents(db, documentId, SNAPSHOT_INTERVAL + 5);

    const { documents } = schema;
    const { eq } = await import("drizzle-orm");
    const [snap] = await db
      .select({ version: documents.version, snapshotSeq: documents.snapshotSeq })
      .from(documents)
      .where(eq(documents.id, documentId));

    expect(snap?.version).toBe(SNAPSHOT_INTERVAL + 5);
    expect(snap?.snapshotSeq).toBe(SNAPSHOT_INTERVAL); // snapshot still at 50
  }, 30_000);

  it("OCC: concurrent requests with same baseVersion → exactly one 409", async () => {
    const docRepo = new DocumentRepository(db);
    const eventRepo = new DocumentEventRepository(db);

    const documentId = await db.transaction(async tx =>
      docRepo.create(tx, { projectId, snapshot: EMPTY_DOCUMENT }),
    );

    // Simulate two concurrent transactions both reading version=0
    const attemptWrite = async (attempt: number) => {
      try {
        await db.transaction(async tx => {
          const currentVersion = await docRepo.getVersionForUpdate(tx, documentId);
          if (currentVersion !== 0) throw Object.assign(new Error("conflict"), { isConflict: true });

          // Simulate work
          await new Promise(r => setTimeout(r, attempt === 0 ? 50 : 0));

          const { doc } = await docRepo.rehydrate(documentId);
          const result = executeCommand(doc, registryInterface, "set-meta", {
            id: doc.root,
            meta: { name: `concurrent-${attempt}` },
          });

          if (result.isErr()) throw new Error("Command failed");

          const { doc: nextDoc, patches, inverse } = result.value;

          await eventRepo.append(tx, {
            documentId,
            seq: 1,
            actor: "user",
            kind: "set-meta",
            patches,
            inverse,
          });

          await docRepo.incrementVersion(tx, documentId, 1);
        });
        return "ok";
      } catch (e: unknown) {
        const err = e as Error & { isConflict?: boolean };
        if (err.isConflict) return "conflict";
        // Postgres unique constraint violation on (document_id, seq) also signals conflict
        if (typeof (e as { code?: string }).code === "string" &&
            (e as { code: string }).code === "23505") return "conflict";
        throw e;
      }
    };

    const [r1, r2] = await Promise.all([attemptWrite(0), attemptWrite(1)]);
    const statuses = [r1, r2].sort();
    expect(statuses).toEqual(["conflict", "ok"]);
  }, 30_000);
});
