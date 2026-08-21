/**
 * Shared test helpers — document fixtures and stub registry.
 */

import type { Document, NodeId } from "@pageforge/ir";
import { nodeId, EMPTY_DOCUMENT, DEFAULT_THEME, DEFAULT_BREAKPOINTS } from "@pageforge/ir";
import type { RegistryInterface } from "../../src/types.js";

// ---------------------------------------------------------------------------
// Stub registry — accepts everything, no props schema
// ---------------------------------------------------------------------------

export const stubRegistry: RegistryInterface = {
  canAccept: () => true,
  propsSchema: () => null,
};

// ---------------------------------------------------------------------------
// Convenience ID factories
// ---------------------------------------------------------------------------

export const ids = {
  root: nodeId("root"),
  n1: nodeId("n1"),
  n2: nodeId("n2"),
  n3: nodeId("n3"),
  n4: nodeId("n4"),
  child1: nodeId("child1"),
  child2: nodeId("child2"),
  locked: nodeId("locked"),
} as const;

// ---------------------------------------------------------------------------
// Document fixtures
// ---------------------------------------------------------------------------

/** Minimal doc: root Page with no children. */
export const emptyDoc: Document = EMPTY_DOCUMENT;

/**
 * Root → [n1, n2], n1 → [child1], n2 → [child2]
 * Useful for move/wrap/reorder tests.
 */
export function makeTreeDoc(): Document {
  return {
    schemaVersion: 1,
    root: ids.root,
    nodes: {
      [ids.root]: {
        id: ids.root,
        type: "Page",
        props: { title: "Test" },
        slots: { children: [ids.n1, ids.n2] },
      },
      [ids.n1]: {
        id: ids.n1,
        type: "Section",
        props: {},
        slots: { children: [ids.child1] },
      },
      [ids.n2]: {
        id: ids.n2,
        type: "Section",
        props: {},
        slots: { children: [ids.child2] },
      },
      [ids.child1]: {
        id: ids.child1,
        type: "Text",
        props: { text: "hello" },
        slots: {},
      },
      [ids.child2]: {
        id: ids.child2,
        type: "Text",
        props: { text: "world" },
        slots: {},
      },
    } as Record<NodeId, (typeof EMPTY_DOCUMENT)["nodes"][NodeId]>,
    theme: DEFAULT_THEME,
    breakpoints: [...DEFAULT_BREAKPOINTS],
  };
}

/** Root with a locked child. */
export function makeLockedDoc(): Document {
  return {
    schemaVersion: 1,
    root: ids.root,
    nodes: {
      [ids.root]: {
        id: ids.root,
        type: "Page",
        props: {},
        slots: { children: [ids.locked] },
      },
      [ids.locked]: {
        id: ids.locked,
        type: "Section",
        props: {},
        slots: {},
        meta: { locked: true },
      },
    } as Record<NodeId, (typeof EMPTY_DOCUMENT)["nodes"][NodeId]>,
    theme: DEFAULT_THEME,
    breakpoints: [...DEFAULT_BREAKPOINTS],
  };
}
