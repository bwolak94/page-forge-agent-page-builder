/**
 * BuildRepository — tracks async build jobs (React / HTML emitter).
 */

import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../client.js";
import { builds } from "../schema.js";

export type BuildRow = typeof builds.$inferSelect;
export type BuildStatus = BuildRow["status"];
export type BuildTarget = BuildRow["target"];

export class BuildRepository {
  constructor(private readonly db: DrizzleDB) {}

  async create(input: {
    documentId: string;
    target: BuildTarget;
  }): Promise<BuildRow> {
    const [row] = await this.db
      .insert(builds)
      .values({ documentId: input.documentId, target: input.target })
      .returning();
    if (!row) throw new Error("Failed to create build");
    return row;
  }

  async updateStatus(
    id: string,
    update: {
      status: BuildStatus;
      artifactUrl?: string;
      log?: string;
    },
  ): Promise<void> {
    await this.db
      .update(builds)
      .set({
        status: update.status,
        artifactUrl: update.artifactUrl ?? null,
        log: update.log ?? null,
      })
      .where(eq(builds.id, id));
  }

  async findById(id: string): Promise<BuildRow | null> {
    const [row] = await this.db
      .select()
      .from(builds)
      .where(eq(builds.id, id));
    return row ?? null;
  }
}
