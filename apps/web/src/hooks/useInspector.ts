"use client";

/**
 * useInspector — Observer hook connecting selection state to the inspector.
 *
 * Returns the first selected node and its id so Inspector components
 * can subscribe to changes without reading the store directly.
 */

import { useEditorStore } from "../stores/editorStore.js";
import type { NodeId, DocNode } from "@pageforge/ir";

interface InspectorState {
  selectedId: NodeId | null;
  node: DocNode | null;
}

export function useInspector(): InspectorState {
  const selectedIds = useEditorStore(s => s.selectedIds);
  const doc = useEditorStore(s => s.doc);

  const selectedId = selectedIds[0] ?? null;
  const node = selectedId ? (doc.nodes[selectedId] ?? null) : null;

  return { selectedId, node };
}
