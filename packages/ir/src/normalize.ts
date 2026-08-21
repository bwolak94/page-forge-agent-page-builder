/**
 * Conversion between the flat normalized IR and a nested tree representation.
 *
 * Used by:
 * - Import/export tooling that works with nested JSON
 * - Migration scripts that receive nested input from external sources
 * - Tests that want to construct documents from a readable nested form
 *
 * Neither function has IO — they are pure transformations.
 */

import { nanoid } from "nanoid";
import { nodeId, type Document, type DocNode, type JsonValue, type NodeId } from "./types.js";
import { SCHEMA_VERSION, DEFAULT_THEME, DEFAULT_BREAKPOINTS, ROOT_ID } from "./constants.js";

// ---------------------------------------------------------------------------
// Nested tree types (import/export format)
// ---------------------------------------------------------------------------

export interface NestedNode {
  id?: string;
  type: string;
  props?: Record<string, JsonValue>;
  meta?: DocNode["meta"];
  /** Named slots with nested children */
  slots?: Record<string, NestedNode[]>;
}

export interface NestedDocument {
  schemaVersion?: number;
  root: NestedNode;
  theme?: Document["theme"];
  breakpoints?: Document["breakpoints"];
}

// ---------------------------------------------------------------------------
// fromNestedTree — nested JSON → flat Document
// ---------------------------------------------------------------------------

/**
 * Convert a nested tree representation into the flat normalized Document format.
 * Any node without an `id` gets one generated via nanoid(10).
 *
 * Throws if the resulting document would fail structural invariants
 * (e.g. the provided ids contain duplicates).
 */
export function fromNestedTree(input: NestedDocument): Document {
  const nodes: Record<NodeId, DocNode> = {};

  function processNode(nested: NestedNode): NodeId {
    const id = nodeId(nested.id ?? nanoid(10));

    if (id in nodes) {
      throw new Error(
        `Duplicate node id "${id}" encountered while building document from nested tree.`,
      );
    }

    const slots: Record<string, NodeId[]> = {};
    for (const [slotName, children] of Object.entries(nested.slots ?? {})) {
      slots[slotName] = children.map(child => processNode(child));
    }

    const node: DocNode = {
      id,
      type: nested.type,
      props: nested.props ?? {},
      slots,
      ...(nested.meta ? { meta: nested.meta } : {}),
    };

    nodes[id] = node;
    return id;
  }

  const rootNodeId = processNode(input.root);

  return {
    schemaVersion: input.schemaVersion ?? SCHEMA_VERSION,
    root: rootNodeId,
    nodes,
    theme: input.theme ?? DEFAULT_THEME,
    breakpoints: input.breakpoints ?? [...DEFAULT_BREAKPOINTS],
  };
}

// ---------------------------------------------------------------------------
// toNestedTree — flat Document → nested JSON
// ---------------------------------------------------------------------------

/**
 * Convert the flat Document back to a nested tree representation.
 * The `id` is always preserved so the round-trip is lossless.
 */
export function toNestedTree(doc: Document): NestedDocument {
  function processNode(id: NodeId): NestedNode {
    const node = doc.nodes[id];
    if (!node) {
      throw new Error(`Node "${id}" not found in document during toNestedTree conversion.`);
    }

    const slots: Record<string, NestedNode[]> = {};
    for (const [slotName, childIds] of Object.entries(node.slots)) {
      if (childIds.length > 0) {
        slots[slotName] = childIds.map(childId => processNode(childId));
      }
    }

    const result: NestedNode = {
      id: node.id,
      type: node.type,
      ...(Object.keys(node.props).length > 0 ? { props: { ...node.props } } : {}),
      ...(node.meta ? { meta: node.meta } : {}),
      ...(Object.keys(slots).length > 0 ? { slots } : {}),
    };

    return result;
  }

  return {
    schemaVersion: doc.schemaVersion,
    root: processNode(doc.root),
    theme: doc.theme,
    breakpoints: doc.breakpoints,
  };
}

// ---------------------------------------------------------------------------
// makeDocument — convenience builder for tests
// ---------------------------------------------------------------------------

/**
 * Quick builder for test fixtures. Accepts a list of nodes and wires them
 * into a flat Document with the first node as root.
 * All nodes must have their slots pre-filled with valid ids.
 */
export function makeDocument(nodes: DocNode[]): Document {
  if (nodes.length === 0) {
    throw new Error("makeDocument requires at least one node (the root).");
  }

  const root = nodes[0]!;
  const nodesMap: Record<NodeId, DocNode> = {};
  for (const n of nodes) {
    nodesMap[n.id] = n;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    root: root.id,
    nodes: nodesMap,
    theme: DEFAULT_THEME,
    breakpoints: [...DEFAULT_BREAKPOINTS],
  };
}

/**
 * Convenience builder for a single-node document with the root at ROOT_ID.
 * Useful in property tests that need a minimal valid starting point.
 */
export function makeMinimalDocument(): Document {
  return {
    schemaVersion: SCHEMA_VERSION,
    root: ROOT_ID,
    nodes: {
      [ROOT_ID]: {
        id: ROOT_ID,
        type: "Page",
        props: {},
        slots: { children: [] },
      },
    },
    theme: DEFAULT_THEME,
    breakpoints: [...DEFAULT_BREAKPOINTS],
  };
}
