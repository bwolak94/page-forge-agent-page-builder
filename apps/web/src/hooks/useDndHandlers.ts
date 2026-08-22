"use client";

/**
 * useDndHandlers — CQRS write path for drag events.
 *
 * dragStart: parses the drag item and stores it in dndStore.
 * dragOver:  tracks the active dropzone id.
 * dragEnd:   dispatches MoveNode or InsertNode command, then clears drag state.
 * dragCancel: clears drag state without dispatching.
 */

import { useCallback } from "react";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import { useEditorStore } from "../stores/editorStore.js";
import { useDndStore } from "../stores/dndStore.js";
import { parseDragItem, parseZoneId } from "../components/dnd/useDropzones.js";

export function useDndHandlers() {
  const executeCmd = useEditorStore(s => s.executeCmd);
  const { setDragItem, setActiveZoneId, clearDrag } = useDndStore();

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const item = parseDragItem(event.active.id);
      setDragItem(item);
    },
    [setDragItem],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      setActiveZoneId(event.over ? String(event.over.id) : null);
    },
    [setActiveZoneId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const item = parseDragItem(event.active.id);
      const zone = parseZoneId(event.over?.id);

      if (item && zone) {
        if (item.type === "existing" && item.nodeId != null) {
          executeCmd("MoveNode", {
            id: item.nodeId,
            parentId: zone.parentId,
            slot: zone.slot,
            index: zone.index,
          });
        } else if (item.type === "new" && item.componentType != null) {
          executeCmd("InsertNode", {
            parentId: zone.parentId,
            slot: zone.slot,
            index: zone.index,
            type: item.componentType,
          });
        }
      }

      clearDrag();
    },
    [executeCmd, clearDrag],
  );

  const handleDragCancel = useCallback(() => {
    clearDrag();
  }, [clearDrag]);

  return { handleDragStart, handleDragOver, handleDragEnd, handleDragCancel };
}
