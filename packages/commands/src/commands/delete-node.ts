/**
 * DeleteNode — remove a node and its entire subtree from the document.
 *
 * The root node and locked nodes are protected.
 * All descendants are deleted from the flat nodes map.
 * The node is removed from its parent's slot.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document, NodeId } from "@pageforge/ir";
import { nodeIdSchema, domainError, descendants } from "@pageforge/ir";
import { ROOT_ID } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema
// ---------------------------------------------------------------------------

export const deleteNodeSchema = z.object({
  id: nodeIdSchema,
});

export type DeleteNodeArgs = z.infer<typeof deleteNodeSchema>;

// ---------------------------------------------------------------------------
// Internal helper — find parent slot location
// ---------------------------------------------------------------------------

function findParentSlot(
  doc: Document,
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

export const deleteNode: Command<DeleteNodeArgs> = {
  kind: "delete-node",
  argsSchema: deleteNodeSchema,

  validate(doc: Document, args: DeleteNodeArgs) {
    if (args.id === ROOT_ID) {
      return err(
        domainError("ROOT_IMMUTABLE", "The root node cannot be deleted.", {
          hint: "Delete child nodes instead.",
          nodeId: args.id,
        }),
      );
    }

    const node = doc.nodes[args.id];
    if (!node) {
      return err(
        domainError("NOT_FOUND", `Node "${args.id}" does not exist.`, {
          hint: "Use allNodeIds() to list available nodes.",
          nodeId: args.id,
        }),
      );
    }

    if (node.meta?.locked) {
      return err(
        domainError("LOCKED", `Node "${args.id}" is locked and cannot be deleted.`, {
          hint: "Use set-meta to unlock the node first.",
          nodeId: args.id,
        }),
      );
    }

    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: DeleteNodeArgs) {
    const mutableNodes = draft.nodes as unknown as Record<string, { slots: Record<string, string[]> } | undefined>;
    if (!mutableNodes[args.id]) return; // guarded by validate

    // Collect all descendant ids before removing anything
    const descendantIds = descendants(draft as unknown as Document, args.id);

    // Remove from parent slot
    const loc = findParentSlot(draft as unknown as Document, args.id);
    if (loc) {
      const parentNode = mutableNodes[loc.parentId];
      const slot = parentNode?.slots[loc.slot];
      if (slot) {
        slot.splice(loc.index, 1);
      }
    }

    // Delete the node and all descendants from the flat map
    delete draft.nodes[args.id];
    for (const did of descendantIds) {
      delete draft.nodes[did];
    }
  },
};
