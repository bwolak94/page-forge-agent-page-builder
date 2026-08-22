"use client";

/**
 * LayerNode — a single row in the layer panel tree.
 *
 * Shows: indent proportional to depth, type abbreviation icon, display name,
 * and a lock indicator if the node is locked.
 */

import type { NodeId } from "@pageforge/ir";
import type { LayerEntry } from "./useLayerTree.js";

const TYPE_ABBR: Record<string, string> = {
  Page: "PG",
  Section: "SC",
  Container: "CT",
  Grid: "GR",
  Stack: "ST",
  Heading: "H",
  Text: "T",
  Button: "BTN",
  Image: "IMG",
  Card: "CRD",
  PricingCard: "PC",
  Nav: "NAV",
  Hero: "HRO",
  Footer: "FT",
  FAQ: "FAQ",
};

interface LayerNodeProps {
  node: LayerEntry;
  selected: boolean;
  onSelect: (ids: NodeId[]) => void;
}

export function LayerNode({ node, selected, onSelect }: LayerNodeProps) {
  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-label={node.name}
      onClick={() => onSelect([node.id])}
      style={{
        paddingLeft: node.depth * 16 + 8,
        height: 32,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: selected ? "#1e3a8a" : "transparent",
        color: node.hidden ? "#475569" : "#cbd5e1",
        cursor: "pointer",
        fontSize: 12,
        userSelect: "none",
        transition: "background 0.1s",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: selected ? "#93c5fd" : "#64748b",
          minWidth: 28,
          textAlign: "center",
        }}
      >
        {TYPE_ABBR[node.type] ?? node.type.slice(0, 2).toUpperCase()}
      </span>

      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {node.name}
      </span>

      {node.locked && (
        <span style={{ fontSize: 10, opacity: 0.5 }} aria-label="locked">
          [L]
        </span>
      )}
      {node.hidden && (
        <span style={{ fontSize: 10, opacity: 0.5 }} aria-label="hidden">
          [H]
        </span>
      )}
    </div>
  );
}
