/**
 * Drizzle client singleton.
 *
 * Uses `postgres` (postgres.js) as the connection driver.
 * DATABASE_URL must be set at runtime; not required at import time
 * so tests can inject their own connection before requiring this module.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type DrizzleDB = PostgresJsDatabase<typeof schema>;

export function createDb(url: string): DrizzleDB {
  const pool = postgres(url, { max: 10 });
  return drizzle(pool, { schema });
}

/** Lazily-created module-level singleton. Use in production only. */
let _db: DrizzleDB | null = null;

export function getDb(): DrizzleDB {
  if (!_db) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = createDb(url);
  }
  return _db;
}
