/**
 * WrapNode — place an existing node inside a newly created wrapper node.
 *
 * The wrapper is inserted at the original node's position.
 * The original node becomes a child of the wrapper in the specified slot.
 *
 * Example: wrap a Text node inside a Container to add padding.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import { nanoid } from "nanoid";
import type { Draft } from "immer";
import type { Document, NodeId } from "@pageforge/ir";
import { nodeIdSchema, domainError, nodeId } from "@pageforge/ir";
import { ROOT_ID } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema
// ---------------------------------------------------------------------------

export const wrapNodeSchema = z.object({
  id: nodeIdSchema,
  wrapperType: z.string().min(1, "wrapperType must not be empty"),
  /** Slot name on the wrapper that will hold the original node. */
  slot: z.string().min(1, "slot must not be empty"),
});

export type WrapNodeArgs = z.infer<typeof wrapNodeSchema>;

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function findParentSlot(
  doc: Document | Draft<Document>,
  id: NodeId,
): { parentId: NodeId; slot: string; index: number } | null {
  for (const [pid, pnode] of Object.entries(doc.nodes) as [NodeId, (typeof doc.nodes)[NodeId]][]) {
    if (!pnode) continue;
    for (const [slot, childIds] of Object.entries(pnode.slots)) {
      const idx = childIds.indexOf(id);
      if (idx !== -1) return { parentId: pid, slot, index: idx };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const wrapNode: Command<WrapNodeArgs> = {
  kind: "wrap-node",
  argsSchema: wrapNodeSchema,

  validate(doc: Document, args: WrapNodeArgs) {
    if (args.id === ROOT_ID) {
      return err(
        domainError("ROOT_IMMUTABLE", "The root node cannot be wrapped.", {
          hint: "Wrap child nodes instead.",
          nodeId: args.id,
        }),
      );
    }

    if (!doc.nodes[args.id]) {
      return err(
        domainError("NOT_FOUND", `Node "${args.id}" does not exist.`, {
          hint: "Use allNodeIds() to list available nodes.",
          nodeId: args.id,
        }),
      );
    }

    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: WrapNodeArgs) {
    const loc = findParentSlot(draft, args.id);
    if (!loc) return; // node is root — guarded by validate

    const wrapperId: NodeId = nodeId(nanoid());

    // Create wrapper node with the original node as its child
    draft.nodes[wrapperId] = {
      id: wrapperId,
      type: args.wrapperType,
      props: {},
      slots: { [args.slot]: [args.id] },
    };

    // Replace original node with wrapper in parent's slot
    const parentNode = draft.nodes[loc.parentId];
    const parentSlot = parentNode?.slots[loc.slot];
    if (!parentSlot) return;

    parentSlot[loc.index] = wrapperId;
  },
};
