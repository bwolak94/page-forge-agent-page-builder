"use client";

/**
 * ComponentPalette — sidebar panel listing draggable component types.
 *
 * Each item is a dnd-kit draggable with id "new:<ComponentType>".
 * Dropping onto a ProxyDropzone triggers InsertNode via useDndHandlers.
 */

import { useDraggable } from "@dnd-kit/core";

const PALETTE_ITEMS: Array<{ type: string; label: string }> = [
  { type: "Section", label: "Section" },
  { type: "Grid", label: "Grid" },
  { type: "Card", label: "Card" },
  { type: "Heading", label: "Heading" },
  { type: "Text", label: "Text" },
  { type: "Button", label: "Button" },
  { type: "Hero", label: "Hero" },
  { type: "Nav", label: "Nav" },
  { type: "Footer", label: "Footer" },
];

interface PaletteItemProps {
  type: string;
  label: string;
}

function PaletteItem({ type, label }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new:${type}`,
    data: { type: "new", componentType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        padding: "6px 10px",
        borderRadius: 4,
        background: isDragging ? "#312e81" : "#1e293b",
        color: isDragging ? "#a5b4fc" : "#94a3b8",
        fontSize: 12,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        opacity: isDragging ? 0.5 : 1,
        border: "1px solid #334155",
        transition: "background 0.1s, color 0.1s",
      }}
    >
      {label}
    </div>
  );
}

export function ComponentPalette() {
  return (
    <div
      style={{
        width: 140,
        flexShrink: 0,
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 10px 4px",
          fontSize: 10,
          fontWeight: 600,
          color: "#475569",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Components
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 8px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {PALETTE_ITEMS.map(item => (
          <PaletteItem key={item.type} type={item.type} label={item.label} />
        ))}
      </div>
    </div>
  );
}
