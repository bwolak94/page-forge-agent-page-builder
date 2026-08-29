/**
 * Document invariant validation.
 *
 * `validateDocument` runs all 4 IR-level invariants in order.
 * Invariants 5 (constraints) and 6 (props schema) live in the commands layer
 * because they require registry access — keeping packages/ir registry-free.
 *
 * Every invariant is an independently exported, individually testable function.
 * Violation = a bug in the command layer, not a state to repair. Fail fast.
 */

import { ok, err, type Result } from "neverthrow";
import type { Document, NodeId } from "./types.js";
import type { ValidationError } from "./errors.js";
import { ROOT_ID } from "./constants.js";

// ---------------------------------------------------------------------------
// 1. Acyclicity — no node is its own ancestor
// ---------------------------------------------------------------------------

/**
 * DFS from root; returns Err if any node visits itself (cycle detected).
 * Also catches nodes that appear in slots but create a back-edge.
 */
export function checkAcyclicity(doc: Document): Result<void, ValidationError> {
  const visiting = new Set<NodeId>();
  const visited = new Set<NodeId>();

  function dfs(id: NodeId): boolean {
    if (visiting.has(id)) return false; // cycle
    if (visited.has(id)) return true;

    visiting.add(id);
    const node = doc.nodes[id];
    if (node) {
      for (const childIds of Object.values(node.slots)) {
        for (const childId of childIds) {
          if (!dfs(childId)) return false;
        }
      }
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  }

  if (!dfs(doc.root)) {
    return err({
      code: "CYCLIC",
      message: "Document graph contains a cycle — a node is its own ancestor.",
    });
  }

  return ok(undefined);
}

// ---------------------------------------------------------------------------
// 2. Referential integrity — every id in any slot exists in nodes
// ---------------------------------------------------------------------------

export function checkReferentialIntegrity(doc: Document): Result<void, ValidationError> {
  for (const [parentId, node] of Object.entries(doc.nodes)) {
    for (const [slotName, childIds] of Object.entries(node.slots)) {
      for (const childId of childIds) {
        if (!(childId in doc.nodes)) {
          return err({
            code: "DANGLING_REF",
            message:
              `Node "${parentId}" slot "${slotName}" references missing node "${childId}".`,
            nodeId: parentId,
          });
        }
      }
    }
  }
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// 3. Reachability — every node is reachable from root (no orphans)
// ---------------------------------------------------------------------------

export function checkReachability(doc: Document): Result<void, ValidationError> {
  const reachable = new Set<NodeId>();

  function dfs(id: NodeId) {
    if (reachable.has(id)) return;
    reachable.add(id);
    const node = doc.nodes[id];
    if (!node) return;
    for (const childIds of Object.values(node.slots)) {
      for (const childId of childIds) {
        dfs(childId);
      }
    }
  }

  // Traverse from ALL page roots so multi-page nodes are reachable.
  // Guard against legacy fixtures / migrations that omit `pages`.
  const pageRoots = Object.values(doc.pages ?? {}).map(p => p.root);
  const roots = pageRoots.length > 0 ? pageRoots : [doc.root];
  for (const rootId of roots) {
    dfs(rootId);
  }

  for (const id of Object.keys(doc.nodes) as NodeId[]) {
    if (!reachable.has(id)) {
      return err({
        code: "ORPHAN",
        message: `Node "${id}" is not reachable from any page root — it is an orphan.`,
        nodeId: id,
      });
    }
  }

  return ok(undefined);
}

// ---------------------------------------------------------------------------
// 4. Root not in slot — doc.root must not appear as a child of any node
// ---------------------------------------------------------------------------

export function checkRootNotInSlot(doc: Document): Result<void, ValidationError> {
  for (const [parentId, node] of Object.entries(doc.nodes)) {
    for (const [slotName, childIds] of Object.entries(node.slots)) {
      if (childIds.includes(ROOT_ID)) {
        return err({
          code: "ROOT_IN_SLOT",
          message:
            `Root node "${ROOT_ID}" must not appear in any slot. ` +
            `Found in "${parentId}.slots.${slotName}".`,
          nodeId: parentId,
        });
      }
    }
  }
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Composed validator — runs all 4 invariants in order
// ---------------------------------------------------------------------------

/**
 * Run all IR-level invariants.
 *
 * Returns `Ok(void)` if the document is structurally sound.
 * Returns `Err(ValidationError)` with the FIRST violation found.
 *
 * Call this after every command execution (fail-fast in dev/test;
 * sampled in production).
 */
export function validateDocument(doc: Document): Result<void, ValidationError> {
  return checkAcyclicity(doc)
    .andThen(() => checkReferentialIntegrity(doc))
    .andThen(() => checkReachability(doc))
    .andThen(() => checkRootNotInSlot(doc));
}
