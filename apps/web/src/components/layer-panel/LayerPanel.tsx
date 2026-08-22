"use client";

/**
 * LayerPanel — virtualized document tree for the editor sidebar.
 *
 * Uses @tanstack/react-virtual to handle 500+ nodes without jank.
 * Reorder via dnd-kit SortableContext dispatches ReorderSlot commands.
 */

import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import type { NodeId } from "@pageforge/ir";
import { useEditorStore } from "../../stores/editorStore.js";
import { useLayerTree } from "./useLayerTree.js";
import { LayerNode } from "./LayerNode.js";
import { LayerSortable } from "./LayerSortable.js";

export function LayerPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const flatNodes = useLayerTree();
  const selectedIds = useEditorStore(s => s.selectedIds);
  const setSelectedIds = useEditorStore(s => s.setSelectedIds);
  const executeCmd = useEditorStore(s => s.executeCmd);

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLayerDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIndex = flatNodes.findIndex(n => n.id === String(active.id));
      const toIndex = flatNodes.findIndex(n => n.id === String(over.id));
      if (fromIndex === -1 || toIndex === -1) return;

      const fromNode = flatNodes[fromIndex]!;
      const toNode = flatNodes[toIndex]!;

      // ReorderSlot only valid when source and target share the same parent slot.
      // Find parent's slot that contains fromNode.
      const doc = useEditorStore.getState().doc;
      for (const [, parentNode] of Object.entries(doc.nodes)) {
        for (const [slotName, childIds] of Object.entries(parentNode.slots)) {
          const fromSlotIdx = childIds.indexOf(fromNode.id);
          const toSlotIdx = childIds.indexOf(toNode.id);
          if (fromSlotIdx !== -1 && toSlotIdx !== -1) {
            executeCmd("ReorderSlot", {
              parentId: parentNode.id,
              slot: slotName,
              fromIndex: fromSlotIdx,
              toIndex: toSlotIdx,
            });
            return;
          }
        }
      }
    },
    [flatNodes, executeCmd],
  );

  const itemIds = flatNodes.map(n => n.id);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          fontSize: 11,
          fontWeight: 600,
          color: "#475569",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderBottom: "1px solid #1e293b",
        }}
      >
        Layers
      </div>

      <DndContext sensors={sensors} onDragEnd={handleLayerDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div
            ref={scrollRef}
            style={{ flex: 1, overflowY: "auto" }}
          >
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map(vItem => {
                const entry = flatNodes[vItem.index]!;
                return (
                  <div
                    key={entry.id}
                    style={{
                      position: "absolute",
                      top: vItem.start,
                      left: 0,
                      right: 0,
                      height: vItem.size,
                    }}
                  >
                    <LayerSortable id={entry.id}>
                      <LayerNode
                        node={entry}
                        selected={selectedIds.includes(entry.id)}
                        onSelect={setSelectedIds}
                      />
                    </LayerSortable>
                  </div>
                );
              })}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
