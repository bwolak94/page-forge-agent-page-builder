/**
 * tree-summary.ts — compact document tree renderer for the queryTree tool.
 *
 * Returns a nested JSON summary bounded by maxDepth and maxNodes.
 * Used in the system context (T10) and the queryTree tool.
 */

import type { Document, NodeId } from "@pageforge/ir";

export interface TreeNodeSummary {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  slots?: Record<string, TreeNodeSummary[]>;
}

interface Options {
  focusId?: string;
  maxDepth?: number;
  maxNodes?: number;
}

/**
 * Build a compact tree summary of the document.
 *
 * If `focusId` is given, that sub-tree is expanded fully and siblings are collapsed.
 * Stops at `maxDepth` levels and `maxNodes` total nodes to keep context size bounded.
 */
export function renderTreeSummary(
  doc: Document,
  { focusId, maxDepth = 4, maxNodes = 80 }: Options = {},
): TreeNodeSummary | null {
  let count = 0;

  function walk(nodeId: NodeId, depth: number): TreeNodeSummary | null {
    if (count >= maxNodes) return null;

    const node = doc.nodes[nodeId];
    if (!node) return null;

    count++;

    const isFocused = focusId === nodeId;
    const effectiveMaxDepth = isFocused ? depth + 10 : maxDepth;

    if (depth > effectiveMaxDepth) {
      return { id: nodeId, type: node.type };
    }

    const slots: Record<string, TreeNodeSummary[]> = {};
    for (const [slotName, childIds] of Object.entries(node.slots)) {
      const children: TreeNodeSummary[] = [];
      for (const childId of childIds) {
        if (count >= maxNodes) break;
        const child = walk(childId, depth + 1);
        if (child) children.push(child);
      }
      if (children.length > 0) slots[slotName] = children;
    }

    const summary: TreeNodeSummary = { id: nodeId, type: node.type };
    if (Object.keys(node.props).length > 0) {
      summary.props = node.props as Record<string, unknown>;
    }
    if (Object.keys(slots).length > 0) summary.slots = slots;

    return summary;
  }

  return walk(doc.root, 0);
}
