"use client";

/**
 * DragOverlay — ghost element that follows the pointer during drag.
 *
 * Renders a compact pill showing what is being dragged.
 * Displayed by dnd-kit's DragOverlay in the parent DOM (not the iframe).
 */

import { DragOverlay as DndKitDragOverlay } from "@dnd-kit/core";
import { useDndStore } from "../../stores/dndStore.js";
import type { DragItem } from "./useDropzones.js";

export function DragOverlay() {
  const dragItem = useDndStore(s => s.dragItem);

  return (
    <DndKitDragOverlay dropAnimation={null}>
      {dragItem ? <DragGhost item={dragItem} /> : null}
    </DndKitDragOverlay>
  );
}

function DragGhost({ item }: { item: DragItem }) {
  const label =
    item.type === "new" ? (item.componentType ?? "Component") : "Move node";

  return (
    <div
      style={{
        padding: "5px 10px",
        background: "#1e40af",
        color: "#fff",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {label}
    </div>
  );
}
