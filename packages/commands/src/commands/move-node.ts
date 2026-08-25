/**
 * MoveNode — relocate an existing node to a different parent/slot/index.
 *
 * Guards:
 *  - node must exist and must not be root
 *  - target parent must exist
 *  - node cannot be moved into its own descendant (would create a cycle)
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

export const moveNodeSchema = z.object({
  id: nodeIdSchema,
  parentId: nodeIdSchema,
  slot: z.string().min(1, "slot must not be empty"),
  index: z.number().int(),
});

export type MoveNodeArgs = z.infer<typeof moveNodeSchema>;

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function findParentSlot(
  doc: Document | Draft<Document>,
  id: NodeId,
): { parentId: NodeId; slot: string; index: number } | null {
  const nodes = doc.nodes as Record<string, { slots: Record<string, NodeId[]> }>;
  for (const [pid, pnode] of Object.entries(nodes)) {
    if (!pnode) continue;
    for (const [slot, childIds] of Object.entries(pnode.slots)) {
      const idx = childIds.indexOf(id);
      if (idx !== -1) return { parentId: pid as NodeId, slot, index: idx };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const moveNode: Command<MoveNodeArgs> = {
  kind: "move-node",
  argsSchema: moveNodeSchema,

  validate(doc: Document, args: MoveNodeArgs) {
    if (args.id === ROOT_ID) {
      return err(
        domainError("ROOT_IMMUTABLE", "The root node cannot be moved.", {
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

    if (!doc.nodes[args.parentId]) {
      return err(
        domainError("NOT_FOUND", `Target parent "${args.parentId}" does not exist.`, {
          hint: "Use allNodeIds() to list available nodes.",
          nodeId: args.parentId,
        }),
      );
    }

    // Cannot move a node into its own descendant (cycle)
    const desc = descendants(doc, args.id);
    if (desc.includes(args.parentId) || args.parentId === args.id) {
      return err(
        domainError(
          "INVARIANT_VIOLATED",
          `Cannot move "${args.id}" into its own descendant "${args.parentId}".`,
          { hint: "Choose a target that is not inside the subtree of the moved node." },
        ),
      );
    }

    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: MoveNodeArgs) {
    // Remove from current location
    const loc = findParentSlot(draft, args.id);
    if (loc) {
      const parentNode = draft.nodes[loc.parentId];
      const slot = parentNode?.slots[loc.slot];
      if (slot) {
        slot.splice(loc.index, 1);
      }
    }

    // Ensure slot exists on target parent
    const target = draft.nodes[args.parentId];
    if (!target) return;

    if (!target.slots[args.slot]) {
      target.slots[args.slot] = [];
    }

    const targetSlot = target.slots[args.slot];
    if (!targetSlot) return;

    if (args.index === -1 || args.index >= targetSlot.length) {
      targetSlot.push(args.id);
    } else {
      targetSlot.splice(Math.max(0, args.index), 0, args.id);
    }
  },
};
