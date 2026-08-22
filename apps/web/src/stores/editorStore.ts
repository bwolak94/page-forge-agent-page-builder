"use client";

/**
 * editorStore — central Zustand store for editor state.
 *
 * Holds the live document, selection, canvas geometry, and exposes
 * executeCmd / undo as atomic actions backed by @pageforge/commands.
 */

import { create } from "zustand";
import type { Document, NodeId } from "@pageforge/ir";
import { EMPTY_DOCUMENT } from "@pageforge/ir";
import type { NodeBounds } from "@pageforge/contracts";
import { executeCommand, UndoStack } from "@pageforge/commands";
import { canAccept, REGISTRY } from "@pageforge/registry";

// Module-level undo stack — lives outside Zustand to avoid serialization issues
const undoStack = new UndoStack(100);

/** Minimal RegistryInterface wired to the concrete REGISTRY from T04. */
const registryInterface = {
  canAccept: (parentType: string, childType: string, slot: string) =>
    canAccept(REGISTRY, parentType, childType, slot),
  propsSchema: (type: string) => REGISTRY[type]?.propsSchema ?? null,
};

export interface EditorStore {
  doc: Document;
  selectedIds: NodeId[];
  boundsMap: Map<NodeId, NodeBounds>;
  iframeOffset: { top: number; left: number };
  canUndo: boolean;

  setDoc: (doc: Document) => void;
  setSelectedIds: (ids: NodeId[]) => void;
  setBoundsMap: (map: Map<NodeId, NodeBounds>) => void;
  setIframeOffset: (offset: { top: number; left: number }) => void;

  /** Execute a command by kind + raw args. Updates doc on success. */
  executeCmd: (kind: string, args: unknown) => void;
  undo: () => void;
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  doc: EMPTY_DOCUMENT,
  selectedIds: [],
  boundsMap: new Map(),
  iframeOffset: { top: 0, left: 0 },
  canUndo: false,

  setDoc: doc => set({ doc }),
  setSelectedIds: ids => set({ selectedIds: ids }),
  setBoundsMap: map => set({ boundsMap: map }),
  setIframeOffset: offset => set({ iframeOffset: offset }),

  executeCmd: (kind, args) => {
    const { doc } = get();
    const result = executeCommand(doc, registryInterface, kind, args);
    if (result.isOk()) {
      undoStack.push(result.value.inverse);
      set({ doc: result.value.doc, canUndo: undoStack.canUndo });
    }
  },

  undo: () => {
    const { doc } = get();
    const result = undoStack.undo(doc);
    if (result) {
      set({ doc: result.doc, canUndo: undoStack.canUndo });
    }
  },
}));
