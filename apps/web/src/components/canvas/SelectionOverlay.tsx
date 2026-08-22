"use client";

/**
 * SelectionOverlay — positioned absolutely over the iframe.
 *
 * - HoverIndicator: dashed outline on hovered node (non-selected).
 * - SelectionBox: solid outline on selected node; also a useDraggable handle
 *   so existing nodes can be drag-moved from the canvas without a separate handle.
 */

import { useDraggable } from "@dnd-kit/core";
import type { NodeId } from "@pageforge/ir";
import type { NodeBounds } from "@pageforge/contracts";

interface RectProps {
  bounds: NodeBounds;
  offset: { top: number; left: number };
}

function HoverIndicator({ bounds, offset }: RectProps) {
  const { rect } = bounds;
  return (
    <div
      style={{
        position: "absolute",
        top: rect.top + offset.top,
        left: rect.left + offset.left,
        width: rect.width,
        height: rect.height,
        outline: "2px dashed #60a5fa",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    />
  );
}

interface SelectionBoxProps extends RectProps {
  onSelect: (id: NodeId) => void;
}

function SelectionBox({ bounds, offset, onSelect }: SelectionBoxProps) {
  const { rect, id } = bounds;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `existing:${id}`,
    data: { type: "existing", nodeId: id },
  });

  return (
    <div
      ref={setNodeRef}
      className="selection-box"
      onClick={() => onSelect(id)}
      {...attributes}
      {...listeners}
      style={{
        position: "absolute",
        top: rect.top + offset.top,
        left: rect.left + offset.left,
        width: rect.width,
        height: rect.height,
        outline: isDragging ? "2px solid #60a5fa" : "2px solid #3b82f6",
        pointerEvents: "auto",
        cursor: isDragging ? "grabbing" : "grab",
        boxSizing: "border-box",
        opacity: isDragging ? 0.4 : 1,
      }}
    />
  );
}

interface SelectionOverlayProps {
  selectedIds: NodeId[];
  hoveredId: NodeId | null;
  boundsMap: Map<NodeId, NodeBounds>;
  iframeOffset: { top: number; left: number };
  onSelect: (id: NodeId) => void;
}

export function SelectionOverlay({
  selectedIds,
  hoveredId,
  boundsMap,
  iframeOffset,
  onSelect,
}: SelectionOverlayProps) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {hoveredId && boundsMap.has(hoveredId) && !selectedIds.includes(hoveredId) && (
        <HoverIndicator bounds={boundsMap.get(hoveredId)!} offset={iframeOffset} />
      )}
      {selectedIds.map(id =>
        boundsMap.has(id) ? (
          <SelectionBox
            key={id}
            bounds={boundsMap.get(id)!}
            offset={iframeOffset}
            onSelect={onSelect}
          />
        ) : null,
      )}
    </div>
  );
}
