/**
 * Read-only query functions over Document.
 *
 * Pure functions — no mutation, no IO, no registry access.
 * These are the only way the rest of the system should traverse the graph.
 * All functions operate on the flat nodes map for O(1) node access.
 */

import type { Document, DocNode, NodeId } from "./types.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a child→parent map in O(n). Cached per call via local variable. */
function buildParentMap(doc: Document): Map<NodeId, { parentId: NodeId; slot: string; index: number }> {
  const map = new Map<NodeId, { parentId: NodeId; slot: string; index: number }>();
  for (const [parentId, node] of Object.entries(doc.nodes) as [NodeId, DocNode][]) {
    for (const [slot, childIds] of Object.entries(node.slots)) {
      childIds.forEach((childId, index) => {
        map.set(childId, { parentId, slot, index });
      });
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// parentOf — direct parent of a node
// ---------------------------------------------------------------------------

/**
 * Returns the id of the direct parent node, or `null` for the root.
 * O(n) first call (builds parent map), O(1) thereafter within the call.
 */
export function parentOf(doc: Document, id: NodeId): NodeId | null {
  const pm = buildParentMap(doc);
  return pm.get(id)?.parentId ?? null;
}

// ---------------------------------------------------------------------------
// slotOf — slot location of a node within its parent
// ---------------------------------------------------------------------------

/**
 * Returns `{ parent, slot, index }` describing where `id` lives,
 * or `null` if the node is the root.
 */
export function slotOf(
  doc: Document,
  id: NodeId,
): { parent: NodeId; slot: string; index: number } | null {
  const pm = buildParentMap(doc);
  const entry = pm.get(id);
  if (!entry) return null;
  return { parent: entry.parentId, slot: entry.slot, index: entry.index };
}

// ---------------------------------------------------------------------------
// ancestors — ordered list from root to the node's parent
// ---------------------------------------------------------------------------

/**
 * Returns the chain of ancestor ids from `root` (inclusive) to the direct
 * parent of `id` (inclusive). Empty array if `id` is the root.
 */
export function ancestors(doc: Document, id: NodeId): NodeId[] {
  const pm = buildParentMap(doc);
  const chain: NodeId[] = [];
  let current: NodeId | undefined = pm.get(id)?.parentId;
  while (current !== undefined) {
    chain.unshift(current);
    current = pm.get(current)?.parentId;
  }
  return chain;
}

// ---------------------------------------------------------------------------
// pathTo — full path from root to the node (inclusive of both)
// ---------------------------------------------------------------------------

/**
 * Returns `[root, ..., id]` — the full path to the node including itself.
 * Useful for "select + expand" behaviour in the layer panel.
 */
export function pathTo(doc: Document, id: NodeId): NodeId[] {
  return [...ancestors(doc, id), id];
}

// ---------------------------------------------------------------------------
// descendants — all nodes in the subtree rooted at id (excluding id itself)
// ---------------------------------------------------------------------------

/**
 * Returns all node ids reachable from `id` via slots, in DFS pre-order,
 * NOT including `id` itself.
 */
export function descendants(doc: Document, id: NodeId): NodeId[] {
  const result: NodeId[] = [];

  function dfs(nodeId: NodeId) {
    const node = doc.nodes[nodeId];
    if (!node) return;
    for (const childIds of Object.values(node.slots)) {
      for (const childId of childIds) {
        result.push(childId);
        dfs(childId);
      }
    }
  }

  dfs(id);
  return result;
}

// ---------------------------------------------------------------------------
// siblings — other nodes in the same slot as `id`
// ---------------------------------------------------------------------------

/**
 * Returns all node ids in the same parent slot as `id`, excluding `id` itself.
 * Returns empty array for the root node.
 */
export function siblings(doc: Document, id: NodeId): NodeId[] {
  const loc = slotOf(doc, id);
  if (!loc) return [];
  const parent = doc.nodes[loc.parent];
  if (!parent) return [];
  const slot = parent.slots[loc.slot];
  if (!slot) return [];
  return slot.filter(childId => childId !== id);
}

// ---------------------------------------------------------------------------
// allNodeIds — ordered flat list of all node ids in the document
// ---------------------------------------------------------------------------

/**
 * Returns all node ids in DFS pre-order starting from root.
 * Includes root. Useful for layer panel display.
 */
export function allNodeIds(doc: Document): NodeId[] {
  const result: NodeId[] = [];

  function dfs(nodeId: NodeId) {
    const node = doc.nodes[nodeId];
    if (!node) return;
    result.push(nodeId);
    for (const childIds of Object.values(node.slots)) {
      for (const childId of childIds) {
        dfs(childId);
      }
    }
  }

  dfs(doc.root);
  return result;
}

// ---------------------------------------------------------------------------
// subtreeSize — count of nodes in a subtree (including the root of the subtree)
// ---------------------------------------------------------------------------

export function subtreeSize(doc: Document, id: NodeId): number {
  return 1 + descendants(doc, id).length;
}
