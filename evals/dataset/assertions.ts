/**
 * assertions.ts — named, reusable structural assertion predicates.
 *
 * Design:
 *   Specification pattern — each predicate is a named, composable function.
 *   Pure functions — no side effects, no LLM calls, no IO.
 *   Structural — assertions operate on the IR Document, not string outputs.
 *
 * These are intentionally low-level. Use them to compose EvalTask.assertions.
 */

import type { Document, DocNode, NodeId } from "@pageforge/ir";

// ---------------------------------------------------------------------------
// Node lookup helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the document contains at least one node of the given type,
 * optionally matching specific props (string equality or RegExp).
 */
export function hasNodeOfType(
  doc: Document,
  type: string,
  propsMatch?: Record<string, unknown>,
): boolean {
  return Object.values(doc.nodes).some(n => {
    if (n.type !== type) return false;
    if (!propsMatch) return true;
    return Object.entries(propsMatch).every(([k, v]) => {
      const prop = n.props[k];
      return v instanceof RegExp ? v.test(String(prop ?? "")) : prop === v;
    });
  });
}

/**
 * Count all nodes in the document whose type matches.
 * Operates on the flat node map — O(n) regardless of tree depth.
 */
export function countDescendants(doc: Document, type: string): number {
  return Object.values(doc.nodes).filter(n => n.type === type).length;
}

/**
 * Find the NodeId of the first node matching type + optional props.
 * Returns null if not found.
 */
export function findFirst(
  doc: Document,
  type: string,
  propsMatch?: Record<string, unknown>,
): NodeId | null {
  const node = Object.values(doc.nodes).find(n => {
    if (n.type !== type) return false;
    if (!propsMatch) return true;
    return Object.entries(propsMatch).every(([k, v]) => {
      const prop = n.props[k];
      return v instanceof RegExp ? v.test(String(prop ?? "")) : prop === v;
    });
  });
  return node?.id ?? null;
}

/**
 * Return the first DocNode of the given type, or null.
 */
export function getNode(doc: Document, type: string): DocNode | null {
  return Object.values(doc.nodes).find(n => n.type === type) ?? null;
}

/**
 * Return all DocNodes that are reachable descendants of a given node ID.
 * Includes direct and transitive children (BFS).
 */
export function descendants(doc: Document, rootId: NodeId): DocNode[] {
  const result: DocNode[] = [];
  const queue: NodeId[] = [rootId];
  const seen = new Set<NodeId>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);

    const node = doc.nodes[id];
    if (!node) continue;

    // Skip the root itself — return only descendants
    if (id !== rootId) result.push(node);

    for (const childIds of Object.values(node.slots)) {
      queue.push(...childIds);
    }
  }

  return result;
}

/**
 * Get the tool call count injected into the doc's __evalMeta by the runner.
 * Returns 0 when running outside the eval context.
 */
export function getToolCallCount(doc: Document): number {
  return (doc as unknown as { __evalMeta?: { toolCallCount: number } }).__evalMeta
    ?.toolCallCount ?? 0;
}
