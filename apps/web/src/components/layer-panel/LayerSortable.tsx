"use client";

/**
 * LayerSortable — wraps a LayerNode row with dnd-kit useSortable.
 *
 * Dispatches ReorderSlot commands via SortableContext's onDragEnd in LayerPanel.
 */

import type { ReactNode, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LayerSortableProps {
  id: string;
  children: ReactNode;
}

export function LayerSortable({ id, children }: LayerSortableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
