"use client";

/**
 * dndStore — ephemeral DnD drag state.
 *
 * Holds only what dnd-kit doesn't track itself:
 * the typed DragItem and the active dropzone id.
 * Cleared on every dragEnd / dragCancel.
 */

import { create } from "zustand";
import type { DragItem } from "../components/dnd/useDropzones.js";

interface DndStore {
  dragItem: DragItem | null;
  activeZoneId: string | null;

  setDragItem: (item: DragItem | null) => void;
  setActiveZoneId: (id: string | null) => void;
  clearDrag: () => void;
}

export const useDndStore = create<DndStore>()((set) => ({
  dragItem: null,
  activeZoneId: null,

  setDragItem: item => set({ dragItem: item }),
  setActiveZoneId: id => set({ activeZoneId: id }),
  clearDrag: () => set({ dragItem: null, activeZoneId: null }),
}));
