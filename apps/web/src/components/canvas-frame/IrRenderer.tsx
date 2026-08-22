"use client";

/**
 * IrRenderer — Composite pattern: recursively renders a DocNode subtree
 * by looking up each node's type in the registry.
 *
 * Design decisions:
 * - Props-based (not context-only) for direct testability.
 * - Slots are spread as named props so each component decides how to render them.
 * - Unknown node types render a labelled placeholder — never crash the canvas.
 * - Each node is wrapped in a div[data-node-id] for BoundsPublisher to observe.
 */

import type { ReactNode } from "react";
import type { Document, NodeId } from "@pageforge/ir";
import type { Registry } from "@pageforge/registry";

export interface IrRendererProps {
  doc: Document;
  nodeId: NodeId;
  registry: Registry;
}

export function IrRenderer({ doc, nodeId, registry }: IrRendererProps) {
  const node = doc.nodes[nodeId];
  if (!node) return null;

  const def = registry[node.type];
  if (!def) {
    return (
      <div
        data-node-id={nodeId}
        data-node-type={node.type}
        style={{
          padding: 8,
          border: "1px dashed #f87171",
          color: "#f87171",
          fontSize: 12,
        }}
      >
        [{node.type}]
      </div>
    );
  }

  const Comp = def.Component;

  // Build slot children: each slot name → array of rendered IrRenderer elements
  const slotChildren: Record<string, ReactNode[]> = {};
  for (const [slotName, childIds] of Object.entries(node.slots)) {
    slotChildren[slotName] = childIds.map(childId => (
      <IrRenderer key={childId} doc={doc} nodeId={childId} registry={registry} />
    ));
  }

  return (
    <div data-node-id={nodeId} data-node-type={node.type}>
      <Comp
        {...(node.props as Record<string, unknown>)}
        {...(slotChildren as Record<string, unknown>)}
      />
    </div>
  );
}
