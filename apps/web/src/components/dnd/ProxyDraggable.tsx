"use client";

/**
 * ProxyDraggable — an invisible draggable div absolutely positioned over
 * a canvas node, providing the drag handle for pointer and keyboard sensors.
 */

import { useDraggable } from "@dnd-kit/core";
import type { NodeId } from "@pageforge/ir";

interface ProxyDraggableProps {
  nodeId: NodeId;
  rect: { top: number; left: number; width: number; height: number };
}

export function ProxyDraggable({ nodeId, rect }: ProxyDraggableProps) {
  const draggableId = `existing:${nodeId}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: { type: "existing", nodeId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-drag-handle={nodeId}
      style={{
        position: "absolute",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        cursor: isDragging ? "grabbing" : "grab",
        opacity: 0,
        zIndex: 20,
        touchAction: "none",
      }}
    />
  );
}
