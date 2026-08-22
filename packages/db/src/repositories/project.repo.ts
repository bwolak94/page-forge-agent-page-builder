/**
 * ProjectRepository — project CRUD.
 */

import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../client.js";
import { projects } from "../schema.js";

export type ProjectRow = typeof projects.$inferSelect;

export class ProjectRepository {
  constructor(private readonly db: DrizzleDB) {}

  async create(input: { ownerId: string; name: string }): Promise<ProjectRow> {
    const [row] = await this.db
      .insert(projects)
      .values({ ownerId: input.ownerId, name: input.name })
      .returning();
    if (!row) throw new Error("Failed to create project");
    return row;
  }

  async findById(id: string): Promise<ProjectRow | null> {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return row ?? null;
  }

  async listByOwner(ownerId: string): Promise<ProjectRow[]> {
    return this.db.select().from(projects).where(eq(projects.ownerId, ownerId));
  }
}
