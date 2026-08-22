"use client";

/**
 * InsertionIndicator — renders a 2px horizontal line at the active drop position.
 *
 * Shown only when dragging over a thin insertion-strip DropZone (height <= 8px).
 * Hidden for full-container zone drops (i.e. no children case).
 */

interface InsertionIndicatorProps {
  rect: { top: number; left: number; width: number; height: number };
}

export function InsertionIndicator({ rect }: InsertionIndicatorProps) {
  if (rect.height > 8) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: rect.top + rect.height / 2 - 1,
        left: rect.left,
        width: rect.width,
        height: 2,
        background: "#3b82f6",
        borderRadius: 1,
        pointerEvents: "none",
        zIndex: 30,
        boxShadow: "0 0 4px rgba(59,130,246,0.6)",
      }}
    />
  );
}
