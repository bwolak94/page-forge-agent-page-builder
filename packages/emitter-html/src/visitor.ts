/**
 * visitor.ts — NodeVisitor interface + EmitContext for HTML emitter.
 *
 * Mirrors packages/emitter-react/src/visitor.ts — shared interface,
 * separate package so emitter-html has zero dependency on emitter-react.
 */

import type { DocNode, Document } from "@pageforge/ir";
import type { Registry } from "@pageforge/registry";

// ---------------------------------------------------------------------------
// EmitContext
// ---------------------------------------------------------------------------

export interface EmitContext {
  /** The full document (flat node map). */
  doc: Document;
  /** Registry used to look up ComponentDef per node type. */
  registry: Registry;
}

// ---------------------------------------------------------------------------
// NodeVisitor<T>
// ---------------------------------------------------------------------------

export interface NodeVisitor<T> {
  /**
   * Visit a single DocNode and return a representation of type T.
   * Implementations recurse into slots via ctx.doc.nodes[childId].
   */
  visit(node: DocNode, ctx: EmitContext): T;
}
