"use client";

/**
 * ComponentLibrary — searchable, categorized component browser panel.
 *
 * Reads all component definitions from REGISTRY, groups them by category,
 * and renders draggable items using the same dnd-kit format as ComponentPalette
 * (id: "new:<ComponentType>") so existing drop handlers work without changes.
 *
 * Replaces the static ComponentPalette for a richer discovery experience.
 */

import { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { REGISTRY } from "@pageforge/registry";

const CATEGORY_ORDER = [
  "layout",
  "navigation",
  "typography",
  "media",
  "interactive",
  "commerce",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  layout: "Layout",
  navigation: "Navigation",
  typography: "Typography",
  media: "Media",
  interactive: "Interactive",
  commerce: "Commerce",
};

// ── Draggable item ────────────────────────────────────────────────────────────

interface LibraryItemProps {
  type: string;
  description: string;
}

function LibraryItem({ type, description }: LibraryItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new:${type}`,
    data: { type: "new", componentType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title={description}
      style={{
        padding: "5px 8px",
        borderRadius: 4,
        background: isDragging ? "#312e81" : "#1e293b",
        color: isDragging ? "#a5b4fc" : "#94a3b8",
        fontSize: 11,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        opacity: isDragging ? 0.5 : 1,
        border: "1px solid #334155",
        transition: "background 0.1s, color 0.1s",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function ComponentLibrary() {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.toLowerCase();
    const allDefs = Object.values(REGISTRY);
    const filtered = q
      ? allDefs.filter(
          d => d.type.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
        )
      : allDefs;

    const map = new Map<string, typeof allDefs>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const def of filtered) {
      const bucket = map.get(def.category);
      if (bucket) bucket.push(def);
    }
    return map;
  }, [query]);

  return (
    <div
      style={{
        width: 160,
        flexShrink: 0,
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 10px 4px",
          fontSize: 10,
          fontWeight: 600,
          color: "#475569",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        Components
      </div>

      {/* Search */}
      <div style={{ padding: "0 8px 4px", flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Search…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "4px 6px",
            borderRadius: 4,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#cbd5e1",
            fontSize: 11,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Grouped list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
        {CATEGORY_ORDER.map(cat => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#334155",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "6px 2px 3px",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {items.map(def => (
                  <LibraryItem key={def.type} type={def.type} description={def.description} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
