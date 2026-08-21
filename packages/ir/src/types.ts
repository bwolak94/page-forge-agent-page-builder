/**
 * Core IR types — zero IO, zero runtime dependencies beyond this file.
 *
 * The document is a normalized flat graph, not a nested tree.
 * All nodes live in `Document.nodes` as a `Record<NodeId, DocNode>`.
 * O(1) access by id; a patch touches a single key in the flat map.
 */

// ---------------------------------------------------------------------------
// Branded NodeId — prevents accidental string/id confusion at compile time
// ---------------------------------------------------------------------------

/**
 * Opaque brand interface for NodeId.
 * Exported so declaration files can reference it without a unique-symbol issue.
 */
export interface NodeIdBrand {
  readonly __nodeIdBrand: true;
}

/**
 * Unique identifier for a node. Use `nodeId()` to create one.
 * Branded so TypeScript rejects plain `string` where `NodeId` is expected.
 */
export type NodeId = string & NodeIdBrand;

/** Cast a plain string to a branded NodeId. Use only at system boundaries. */
export function nodeId(raw: string): NodeId {
  if (!raw || raw.trim().length === 0) {
    throw new Error("NodeId must be a non-empty string");
  }
  return raw as NodeId;
}

// ---------------------------------------------------------------------------
// Primitive value types
// ---------------------------------------------------------------------------

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// ---------------------------------------------------------------------------
// Core node type
// ---------------------------------------------------------------------------

/**
 * A single node in the document graph.
 *
 * `type`  — matches a key in the component registry.
 * `props` — validated against `registry[type].propsSchema` by the commands layer.
 * `slots` — named, ordered lists of child node IDs.
 */
export interface DocNode {
  readonly id: NodeId;
  /** Registry component key — e.g. "Hero", "PricingCard". */
  readonly type: string;
  /** Arbitrary props. Validated by the registry's Zod schema per command. */
  readonly props: Record<string, JsonValue>;
  /**
   * Named child slots, each holding an ordered list of child NodeIds.
   * e.g. { children: ["n1", "n2"], cta: ["b1"] }
   */
  readonly slots: Record<string, NodeId[]>;
  /** Editor-only metadata — does not affect rendering or export. */
  readonly meta?: NodeMeta;
}

export interface NodeMeta {
  /** Human-readable label shown in the layer panel. */
  readonly name?: string;
  /** Prevents move/delete commands from executing on this node. */
  readonly locked?: boolean;
  /** Hides the node in the canvas but keeps it in the IR. */
  readonly hidden?: boolean;
}

// ---------------------------------------------------------------------------
// Theme tokens
// ---------------------------------------------------------------------------

/**
 * Global design tokens. Components reference ONLY token keys — never raw values.
 * Emitted as CSS custom properties: `--pf-color-primary`, `--pf-spacing-md`, etc.
 */
export interface ThemeTokens {
  /** CSS custom property values, e.g. `{ primary: "#6366f1" }` */
  readonly colors: Record<string, string>;
  readonly spacing: Record<string, string>;
  readonly radii: Record<string, string>;
  readonly fonts: {
    readonly sans: string;
    readonly serif?: string;
    readonly mono?: string;
  };
  /** Typography scale tokens */
  readonly scale: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

export interface Breakpoint {
  readonly id: string;
  readonly label: string;
  /** Minimum viewport width in pixels at which this breakpoint activates. */
  readonly minWidth: number;
}

// ---------------------------------------------------------------------------
// Document — the root of the IR
// ---------------------------------------------------------------------------

/**
 * The entire page document.
 *
 * `nodes` is a flat map — O(1) lookup, single-key patches, no deep paths.
 * `root` is the id of the top-level Page node.
 */
export interface Document {
  /** Incremented when the schema shape changes; triggers migration. */
  readonly schemaVersion: number;
  /** Id of the root Page node. */
  readonly root: NodeId;
  /**
   * All nodes in a flat map. The agent and commands address nodes by ID only.
   * A patch touching `/nodes/x7f/props/padding` is unambiguous and O(1).
   */
  readonly nodes: Record<NodeId, DocNode>;
  readonly theme: ThemeTokens;
  readonly breakpoints: Breakpoint[];
}
