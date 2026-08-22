"use client";

/**
 * DndProvider — wires DndContext with PointerSensor + KeyboardSensor.
 *
 * Uses the custom closestInsertionPoint collision detection so that
 * insertion-strip zones win over large parent zones at the same pointer position.
 */

import type { ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { closestInsertionPoint } from "./collision.js";
import { DragOverlay } from "./DragOverlay.js";
import { useDndHandlers } from "../../hooks/useDndHandlers.js";

export function DndProvider({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } =
    useDndHandlers();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestInsertionPoint}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay />
    </DndContext>
  );
}
