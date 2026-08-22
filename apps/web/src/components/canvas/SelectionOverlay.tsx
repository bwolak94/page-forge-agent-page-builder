"use client";

/**
 * SelectionOverlay — positioned absolutely over the iframe.
 *
 * Translates iframe-relative NodeBounds to parent-DOM coordinates using the
 * iframe's top/left offset. Renders hover indicator and selection boxes.
 */

import type { NodeId } from "@pageforge/contracts";
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
  return (
    <div
      className="selection-box"
      onClick={() => onSelect(id)}
      style={{
        position: "absolute",
        top: rect.top + offset.top,
        left: rect.left + offset.left,
        width: rect.width,
        height: rect.height,
        outline: "2px solid #3b82f6",
        pointerEvents: "auto",
        cursor: "pointer",
        boxSizing: "border-box",
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
