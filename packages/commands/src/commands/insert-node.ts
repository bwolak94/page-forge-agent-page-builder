/**
 * InsertNode — create a new node and place it in a parent's slot.
 *
 * This is the primary way new nodes enter the document. The node's ID is
 * generated via nanoid unless explicitly supplied (useful for tests / replay).
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import { nanoid } from "nanoid";
import type { Draft } from "immer";
import type { Document, NodeId, DocNode, JsonValue } from "@pageforge/ir";
import { nodeIdSchema, domainError, nodeId } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema (reused as agent tool schema in T09)
// ---------------------------------------------------------------------------

export const insertNodeSchema = z.object({
  parentId: nodeIdSchema,
  slot: z.string().min(1, "slot must not be empty"),
  /** Insertion index within the slot. -1 means append. */
  index: z.number().int(),
  /** Registry component type key, e.g. "Heading", "Card". */
  type: z.string().min(1, "type must not be empty"),
  /** Initial props. Defaults to {}. */
  props: z.record(z.unknown()).optional(),
  /**
   * Explicit id for the new node.
   * If omitted, a nanoid is generated. Provide during test/replay.
   */
  id: nodeIdSchema.optional(),
});

export type InsertNodeArgs = z.infer<typeof insertNodeSchema>;

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const insertNode: Command<InsertNodeArgs> = {
  kind: "insert-node",
  argsSchema: insertNodeSchema,

  validate(doc: Document, args: InsertNodeArgs) {
    const parent = doc.nodes[args.parentId];
    if (!parent) {
      return err(
        domainError("NOT_FOUND", `Parent node "${args.parentId}" does not exist.`, {
          hint: "Use allNodeIds() to list available nodes.",
          nodeId: args.parentId,
        }),
      );
    }

    if (args.id !== undefined && args.id in doc.nodes) {
      return err(
        domainError("ALREADY_EXISTS", `Node "${args.id}" already exists.`, {
          hint: "Omit the id field to let the system generate a unique id.",
          nodeId: args.id,
        }),
      );
    }

    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: InsertNodeArgs) {
    const nid: NodeId = args.id ?? nodeId(nanoid());

    // Create the new node — cast via unknown to avoid Immer deep type instantiation
    // with recursive JsonValue and branded NodeId keys.
    const newNode: DocNode = {
      id: nid,
      type: args.type,
      props: (args.props as Record<string, JsonValue>) ?? {},
      slots: {},
    };
    (draft.nodes as unknown as Record<NodeId, DocNode>)[nid] = newNode;

    // Ensure the slot array exists on the parent
    const parent = draft.nodes[args.parentId];
    if (!parent) return; // guarded by validate

    if (!parent.slots[args.slot]) {
      parent.slots[args.slot] = [];
    }

    const slot = parent.slots[args.slot];
    if (!slot) return;

    if (args.index === -1 || args.index >= slot.length) {
      slot.push(nid);
    } else {
      slot.splice(Math.max(0, args.index), 0, nid);
    }
  },
};
