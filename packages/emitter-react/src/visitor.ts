/**
 * visitor.ts — NodeVisitor interface + EmitContext.
 *
 * Pattern: Visitor — ReactEmitter implements NodeVisitor<string>,
 * returning JSX string fragments for each node.
 */

import type { DocNode, Document } from "@pageforge/ir";
import type { Registry } from "@pageforge/registry";
import type { ImportCollector } from "./import-resolver.js";

// ---------------------------------------------------------------------------
// EmitContext — passed through the entire traversal
// ---------------------------------------------------------------------------

export interface EmitContext {
  /** The full document (flat node map). */
  doc: Document;
  /** Registry used to look up ComponentDef per node type. */
  registry: Registry;
  /** Accumulates import statements as nodes are visited. */
  imports: ImportCollector;
}

// ---------------------------------------------------------------------------
// NodeVisitor<T> — Visitor pattern interface
// ---------------------------------------------------------------------------

export interface NodeVisitor<T> {
  /**
   * Visit a single DocNode and return a representation of type T.
   * Implementations recurse into slots via ctx.doc.nodes[childId].
   */
  visit(node: DocNode, ctx: EmitContext): T;
}
