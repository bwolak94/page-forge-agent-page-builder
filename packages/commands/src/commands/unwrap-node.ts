/**
 * UnwrapNode — remove a wrapper node, promoting its single child in its place.
 *
 * Requires the target node to have exactly one child across all its slots.
 * The child takes the wrapper's position in the grandparent's slot.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document, NodeId } from "@pageforge/ir";
import { nodeIdSchema, domainError } from "@pageforge/ir";
import { ROOT_ID } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema
// ---------------------------------------------------------------------------

export const unwrapNodeSchema = z.object({
  id: nodeIdSchema,
});

export type UnwrapNodeArgs = z.infer<typeof unwrapNodeSchema>;

// ---------------------------------------------------------------------------
// Internal helpers
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

function getSingleChild(
  doc: Document | Draft<Document>,
  id: NodeId,
): NodeId | null {
  const node = doc.nodes[id];
  if (!node) return null;
  const allChildren: NodeId[] = [];
  for (const childIds of Object.values(node.slots)) {
    for (const cid of childIds) {
      allChildren.push(cid);
    }
  }
  if (allChildren.length !== 1) return null;
  return allChildren[0] ?? null;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const unwrapNode: Command<UnwrapNodeArgs> = {
  kind: "unwrap-node",
  argsSchema: unwrapNodeSchema,

  validate(doc: Document, args: UnwrapNodeArgs) {
    if (args.id === ROOT_ID) {
      return err(
        domainError("ROOT_IMMUTABLE", "The root node cannot be unwrapped.", {
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

    const child = getSingleChild(doc, args.id);
    if (child === null) {
      return err(
        domainError(
          "INVALID_ARGS",
          `Node "${args.id}" must have exactly one child across all slots to be unwrapped.`,
          { hint: "Delete or move extra children first.", nodeId: args.id },
        ),
      );
    }

    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: UnwrapNodeArgs) {
    const childId = getSingleChild(draft, args.id);
    if (!childId) return; // guarded by validate

    const loc = findParentSlot(draft, args.id);
    if (!loc) return; // guarded by validate (not root)

    // Place child at the wrapper's position in grandparent's slot
    const grandparentNode = draft.nodes[loc.parentId];
    const grandparentSlot = grandparentNode?.slots[loc.slot];
    if (!grandparentSlot) return;

    grandparentSlot[loc.index] = childId;

    // Delete the wrapper node from the flat map
    delete draft.nodes[args.id];
  },
};
