"use client";

/**
 * useDropzones — Specification pattern: computes legal drop targets on dragStart.
 *
 * Legal zones are determined ONCE at drag-start using canAccept from the registry.
 * Only legal targets are mounted as droppables — impossible drops are never shown.
 */

import { useMemo } from "react";
import { nodeId } from "@pageforge/ir";
import type { NodeId } from "@pageforge/ir";
import type { NodeBounds } from "@pageforge/contracts";
import { canAccept, REGISTRY } from "@pageforge/registry";
import { useEditorStore } from "../../stores/editorStore.js";

export interface DragItem {
  /** Composite id: "existing:<nodeId>" | "new:<componentType>" */
  id: string;
  type: "existing" | "new";
  nodeId?: NodeId;
  componentType?: string;
}

export interface DropZone {
  /** Composite id: "<parentId>:<slotName>:<index>" */
  id: string;
  parentId: NodeId;
  slot: string;
  index: number;
  rect: { top: number; left: number; width: number; height: number };
  /** Accepted child types for the slot — used for visual feedback. */
  accepts: string[];
}

/** Parse a drag active.id string into a typed DragItem. */
export function parseDragItem(rawId: string | number): DragItem | null {
  const str = String(rawId);
  if (str.startsWith("existing:")) {
    const raw = str.slice(9);
    if (!raw) return null;
    return { id: str, type: "existing", nodeId: nodeId(raw) };
  }
  if (str.startsWith("new:")) {
    const componentType = str.slice(4);
    if (!componentType) return null;
    return { id: str, type: "new", componentType };
  }
  return null;
}

/** Parse a droppable id string into a zone descriptor. */
export function parseZoneId(
  rawId: string | number | null | undefined,
): { parentId: NodeId; slot: string; index: number } | null {
  if (rawId == null) return null;
  const parts = String(rawId).split(":");
  if (parts.length !== 3) return null;
  const [parentRaw, slot, indexRaw] = parts;
  const index = parseInt(indexRaw ?? "0", 10);
  if (!parentRaw || !slot || isNaN(index)) return null;
  return { parentId: nodeId(parentRaw), slot, index };
}

function computeInsertionRect(
  parentBounds: NodeBounds,
  childIds: NodeId[],
  index: number,
  boundsMap: Map<NodeId, NodeBounds>,
  iframeOffset: { top: number; left: number },
): { top: number; left: number; width: number; height: number } {
  const { left, width, top: pTop, height: pHeight } = parentBounds.rect;
  const ox = iframeOffset.left;
  const oy = iframeOffset.top;

  if (childIds.length === 0) {
    return { top: pTop + oy, left: left + ox, width, height: pHeight };
  }

  if (index === 0) {
    const firstBounds = boundsMap.get(childIds[0]!);
    const stripTop = firstBounds ? firstBounds.rect.top : pTop;
    return { top: stripTop + oy - 4, left: left + ox, width, height: 8 };
  }

  if (index === childIds.length) {
    const lastBounds = boundsMap.get(childIds[childIds.length - 1]!);
    const stripTop = lastBounds
      ? lastBounds.rect.top + lastBounds.rect.height
      : pTop + pHeight;
    return { top: stripTop + oy - 4, left: left + ox, width, height: 8 };
  }

  const prevBounds = boundsMap.get(childIds[index - 1]!);
  const nextBounds = boundsMap.get(childIds[index]!);
  if (prevBounds && nextBounds) {
    const stripTop = prevBounds.rect.top + prevBounds.rect.height;
    const stripHeight = Math.max(nextBounds.rect.top - stripTop, 8);
    return { top: stripTop + oy, left: left + ox, width, height: stripHeight };
  }

  return { top: pTop + oy, left: left + ox, width, height: pHeight };
}

/**
 * Computes all legal DropZones for the given drag item.
 * Returns [] when dragItem is null or no legal targets exist.
 * Memoized on doc, boundsMap, iframeOffset — zero work during mouse move.
 */
export function useDropzones(dragItem: DragItem | null): DropZone[] {
  const doc = useEditorStore(s => s.doc);
  const boundsMap = useEditorStore(s => s.boundsMap);
  const iframeOffset = useEditorStore(s => s.iframeOffset);

  return useMemo(() => {
    if (!dragItem) return [];

    const childType =
      dragItem.type === "existing"
        ? (dragItem.nodeId != null ? doc.nodes[dragItem.nodeId]?.type : undefined)
        : dragItem.componentType;

    if (!childType) return [];

    const zones: DropZone[] = [];

    for (const [nId, node] of Object.entries(doc.nodes)) {
      // Skip dragging a node into itself
      if (dragItem.type === "existing" && dragItem.nodeId === nId) continue;

      for (const [slotName, childIds] of Object.entries(node.slots)) {
        if (!canAccept(REGISTRY, node.type, childType, slotName)) continue;

        const parentBounds = boundsMap.get(nId as NodeId);
        if (!parentBounds) continue;

        const slotDef = REGISTRY[node.type]?.slots[slotName];
        const accepts = slotDef?.accepts ?? ["*"];

        for (let i = 0; i <= childIds.length; i++) {
          zones.push({
            id: `${nId}:${slotName}:${i}`,
            parentId: nId as NodeId,
            slot: slotName,
            index: i,
            rect: computeInsertionRect(parentBounds, childIds, i, boundsMap, iframeOffset),
            accepts,
          });
        }
      }
    }

    return zones;
  }, [dragItem, doc, boundsMap, iframeOffset]);
}
