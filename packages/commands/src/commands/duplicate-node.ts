/**
 * DuplicateNode — deep clone a node's subtree and insert the clone.
 *
 * All nodes in the subtree receive fresh nanoid-generated IDs.
 * By default, the clone is inserted immediately after the original
 * in the same parent slot. An explicit target can be provided.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import { nanoid } from "nanoid";
import type { Draft } from "immer";
import type { Document, NodeId, DocNode } from "@pageforge/ir";
import { nodeIdSchema, domainError, nodeId, descendants } from "@pageforge/ir";
import { ROOT_ID } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema
// ---------------------------------------------------------------------------

export const duplicateNodeSchema = z.object({
  id: nodeIdSchema,
  targetParentId: nodeIdSchema.optional(),
  targetSlot: z.string().optional(),
  targetIndex: z.number().int().optional(),
});

export type DuplicateNodeArgs = z.infer<typeof duplicateNodeSchema>;

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

function cloneSubtree(
  doc: Document | Draft<Document>,
  rootId: NodeId,
): { clonedNodes: DocNode[]; newRootId: NodeId } {
  const subtreeIds: NodeId[] = [rootId, ...descendants(doc as Document, rootId)];

  // Build id mapping: old → new
  const idMap = new Map<NodeId, NodeId>();
  for (const id of subtreeIds) {
    idMap.set(id, nodeId(nanoid()));
  }

  const clonedNodes: DocNode[] = [];
  for (const id of subtreeIds) {
    const original = doc.nodes[id];
    if (!original) continue;

    const newId = idMap.get(id);
    if (!newId) continue;

    // Remap slot child IDs to cloned IDs
    const newSlots: Record<string, NodeId[]> = {};
    for (const [slot, childIds] of Object.entries(original.slots)) {
      newSlots[slot] = childIds.map(cid => idMap.get(cid) ?? cid);
    }

    clonedNodes.push({
      id: newId,
      type: original.type,
      props: { ...original.props } as DocNode["props"],
      slots: newSlots,
    });
  }

  const newRootId = idMap.get(rootId) ?? nodeId(nanoid());
  return { clonedNodes, newRootId };
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const duplicateNode: Command<DuplicateNodeArgs> = {
  kind: "duplicate-node",
  argsSchema: duplicateNodeSchema,

  validate(doc: Document, args: DuplicateNodeArgs) {
    if (args.id === ROOT_ID) {
      return err(
        domainError("ROOT_IMMUTABLE", "The root node cannot be duplicated.", {
          hint: "Duplicate a child node instead.",
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

    if (args.targetParentId !== undefined && !doc.nodes[args.targetParentId]) {
      return err(
        domainError("NOT_FOUND", `Target parent "${args.targetParentId}" does not exist.`, {
          hint: "Use allNodeIds() to list available nodes.",
          nodeId: args.targetParentId,
        }),
      );
    }

    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: DuplicateNodeArgs) {
    const { clonedNodes, newRootId } = cloneSubtree(draft, args.id);

    // Add all cloned nodes to the flat map
    for (const node of clonedNodes) {
      draft.nodes[node.id] = node;
    }

    // Determine insertion location
    let targetParentId: NodeId;
    let targetSlot: string;
    let targetIndex: number;

    if (args.targetParentId !== undefined) {
      targetParentId = args.targetParentId;
      targetSlot = args.targetSlot ?? "children";
      targetIndex = args.targetIndex ?? -1;
    } else {
      // Default: insert after original in same parent slot
      const loc = findParentSlot(draft, args.id);
      if (!loc) return; // root — guarded by validate

      targetParentId = loc.parentId;
      targetSlot = loc.slot;
      targetIndex = loc.index + 1;
    }

    const targetNode = draft.nodes[targetParentId];
    if (!targetNode) return;

    if (!targetNode.slots[targetSlot]) {
      targetNode.slots[targetSlot] = [];
    }

    const slot = targetNode.slots[targetSlot];
    if (!slot) return;

    if (targetIndex === -1 || targetIndex >= slot.length) {
      slot.push(newRootId);
    } else {
      slot.splice(Math.max(0, targetIndex), 0, newRootId);
    }
  },
};
