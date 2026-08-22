/**
 * Constraint system — determines whether one component type may be placed
 * inside another component's named slot.
 *
 * Rules (both must hold):
 *   1. The parent's slot.accepts list includes the child type (or "*").
 *   2. The child's allowedParents list includes the parent type.
 *      Empty allowedParents means root-level only (rejects all component parents).
 */

import type { Document, NodeId } from "@pageforge/ir";
import type { Registry } from "./types.js";

// ---------------------------------------------------------------------------
// canAccept
// ---------------------------------------------------------------------------

/**
 * Returns true if `parentType` may host `childType` in the given `slot`.
 *
 * @param registry  — REGISTRY or a subset for testing
 * @param parentType — type key of the parent component (e.g. "Grid")
 * @param childType  — type key of the child component (e.g. "Card")
 * @param slot       — slot name on the parent (default: "children")
 */
export function canAccept(
  registry: Registry,
  parentType: string,
  childType: string,
  slot = "children",
): boolean {
  const parentDef = registry[parentType];
  const childDef = registry[childType];
  if (!parentDef || !childDef) return false;

  const slotDef = parentDef.slots[slot];
  if (!slotDef) return false;

  // Rule 1: does the slot accept this child type?
  const slotAccepts = slotDef.accepts.includes(childType) || slotDef.accepts.includes("*");

  // Rule 2: does the child allow this parent?
  // Empty allowedParents → root-level only → reject all component parents.
  const parentAllowed =
    childDef.allowedParents.length > 0 && childDef.allowedParents.includes(parentType);

  return slotAccepts && parentAllowed;
}

// ---------------------------------------------------------------------------
// getValidDropTargets
// ---------------------------------------------------------------------------

/**
 * Returns all (nodeId, slot) pairs in the document that would accept `childType`.
 * Used by the canvas drag-and-drop to highlight valid drop zones (T06).
 */
export function getValidDropTargets(
  registry: Registry,
  doc: Document,
  childType: string,
): Array<{ nodeId: NodeId; slot: string }> {
  const targets: Array<{ nodeId: NodeId; slot: string }> = [];

  for (const [id, node] of Object.entries(doc.nodes) as [NodeId, (typeof doc.nodes)[NodeId]][]) {
    if (!node) continue;
    for (const slotName of Object.keys(node.slots)) {
      if (canAccept(registry, node.type, childType, slotName)) {
        targets.push({ nodeId: id, slot: slotName });
      }
    }
  }

  return targets;
}
