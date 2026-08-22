"use client";

/**
 * useLayerTree — selector: Document → flat DFS list with depth metadata.
 *
 * Used by LayerPanel for virtualized rendering.
 * Memoized on the document reference — zero work between renders.
 */

import { useMemo } from "react";
import type { NodeId } from "@pageforge/ir";
import { useEditorStore } from "../../stores/editorStore.js";

export interface LayerEntry {
  id: NodeId;
  type: string;
  depth: number;
  /** Display name from meta.name, or falls back to type. */
  name: string;
  locked: boolean;
  hidden: boolean;
}

export function useLayerTree(): LayerEntry[] {
  const doc = useEditorStore(s => s.doc);

  return useMemo(() => {
    const result: LayerEntry[] = [];

    function traverse(nodeId: NodeId, depth: number): void {
      const node = doc.nodes[nodeId];
      if (!node) return;

      result.push({
        id: nodeId,
        type: node.type,
        depth,
        name: node.meta?.name ?? node.type,
        locked: node.meta?.locked ?? false,
        hidden: node.meta?.hidden ?? false,
      });

      for (const childIds of Object.values(node.slots)) {
        for (const childId of childIds) {
          traverse(childId, depth + 1);
        }
      }
    }

    traverse(doc.root, 0);
    return result;
  }, [doc]);
}
