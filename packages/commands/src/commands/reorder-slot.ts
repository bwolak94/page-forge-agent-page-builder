/**
 * ReorderSlot — move a child from one index to another within the same slot.
 *
 * This is the primary drag-and-drop reorder primitive.
 * Does not move nodes between parents — use MoveNode for that.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document } from "@pageforge/ir";
import { nodeIdSchema, domainError } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema
// ---------------------------------------------------------------------------

export const reorderSlotSchema = z.object({
  parentId: nodeIdSchema,
  slot: z.string().min(1, "slot must not be empty"),
  fromIndex: z.number().int().nonnegative(),
  toIndex: z.number().int().nonnegative(),
});

export type ReorderSlotArgs = z.infer<typeof reorderSlotSchema>;

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const reorderSlot: Command<ReorderSlotArgs> = {
  kind: "reorder-slot",
  argsSchema: reorderSlotSchema,

  validate(doc: Document, args: ReorderSlotArgs) {
    const parent = doc.nodes[args.parentId];
    if (!parent) {
      return err(
        domainError("NOT_FOUND", `Node "${args.parentId}" does not exist.`, {
          hint: "Use allNodeIds() to list available nodes.",
          nodeId: args.parentId,
        }),
      );
    }

    const slot = parent.slots[args.slot];
    if (!slot) {
      return err(
        domainError(
          "NOT_FOUND",
          `Slot "${args.slot}" does not exist on node "${args.parentId}".`,
          { nodeId: args.parentId },
        ),
      );
    }

    const len = slot.length;
    if (args.fromIndex >= len) {
      return err(
        domainError(
          "INVALID_ARGS",
          `fromIndex ${args.fromIndex} is out of bounds (slot length: ${len}).`,
        ),
      );
    }

    if (args.toIndex >= len) {
      return err(
        domainError(
          "INVALID_ARGS",
          `toIndex ${args.toIndex} is out of bounds (slot length: ${len}).`,
        ),
      );
    }

    if (args.fromIndex === args.toIndex) {
      return err(domainError("INVALID_ARGS", "fromIndex and toIndex must differ."));
    }

    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: ReorderSlotArgs) {
    const parent = draft.nodes[args.parentId];
    const slot = parent?.slots[args.slot];
    if (!slot) return; // guarded by validate

    const [item] = slot.splice(args.fromIndex, 1);
    if (item === undefined) return;
    slot.splice(args.toIndex, 0, item);
  },
};
