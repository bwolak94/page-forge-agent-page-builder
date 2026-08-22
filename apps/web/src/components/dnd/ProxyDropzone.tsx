"use client";

/**
 * ProxyDropzone — a synthetic droppable div absolutely positioned over the iframe.
 *
 * Runs entirely in the parent frame; the iframe never participates in DnD events.
 * Only mounted for legal drop targets (computed by useDropzones).
 */

import { useDroppable } from "@dnd-kit/core";

interface ProxyDropzoneProps {
  id: string;
  rect: { top: number; left: number; width: number; height: number };
  isActive: boolean;
}

export function ProxyDropzone({ id, rect, isActive }: ProxyDropzoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: "dropzone" },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: isActive ? "auto" : "none",
        background: isOver ? "rgba(59,130,246,0.12)" : "transparent",
        outline: isOver ? "2px dashed #3b82f6" : "none",
        outlineOffset: -1,
        zIndex: 10,
        boxSizing: "border-box",
        borderRadius: 2,
        transition: "background 0.1s",
      }}
    />
  );
}
