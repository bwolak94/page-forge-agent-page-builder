/**
 * ConversationRepository — chat history for the agent.
 */

import { eq, asc } from "drizzle-orm";
import type { DrizzleDB } from "../client.js";
import { conversations, messages } from "../schema.js";

export type ConversationRow = typeof conversations.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;

export class ConversationRepository {
  constructor(private readonly db: DrizzleDB) {}

  async create(documentId: string): Promise<ConversationRow> {
    const [row] = await this.db
      .insert(conversations)
      .values({ documentId })
      .returning();
    if (!row) throw new Error("Failed to create conversation");
    return row;
  }

  async addMessage(input: {
    conversationId: string;
    role: "user" | "assistant" | "tool";
    content: unknown;
    usage?: unknown;
  }): Promise<MessageRow> {
    const [row] = await this.db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content as MessageRow["content"],
        usage: input.usage as MessageRow["usage"] ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to add message");
    return row;
  }

  async getHistory(conversationId: string): Promise<MessageRow[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }
}
