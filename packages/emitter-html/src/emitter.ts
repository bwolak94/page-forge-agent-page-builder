/**
 * emitter.ts — HtmlEmitter: IR DocNode → HTML string.
 *
 * Patterns:
 *   Visitor  — HtmlEmitter implements NodeVisitor<string>.
 *   Composite — recursive visitAsElement() builds React element tree.
 *   Strategy  — parallel to ReactEmitter; same registry, same components.
 *
 * Key invariant: uses renderToStaticMarkup(registry[type].Component) —
 * the same React components that power the canvas. Zero template drift.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DocNode } from "@pageforge/ir";
import type { NodeVisitor, EmitContext } from "./visitor.js";

// ---------------------------------------------------------------------------
// HtmlEmitter
// ---------------------------------------------------------------------------

export class HtmlEmitter implements NodeVisitor<string> {
  constructor(private readonly registry: EmitContext["registry"]) {}

  /**
   * Visit a DocNode and return its rendered HTML string.
   * Each node is rendered in isolation via renderToStaticMarkup.
   */
  visit(node: DocNode, ctx: EmitContext): string {
    const def = this.registry[node.type];
    if (!def) return `<!-- Unknown: ${node.type} -->`;

    const element = this.buildElement(node, ctx);
    return renderToStaticMarkup(element);
  }

  /**
   * Build a React element for a node, recursing into slots.
   * Used internally to compose the full element tree before a single
   * renderToStaticMarkup call at the root.
   */
  visitAsElement(node: DocNode, ctx: EmitContext): React.ReactElement {
    const def = this.registry[node.type];
    if (!def) {
      return React.createElement("div", { "data-pf-unknown": node.type });
    }

    return this.buildElement(node, ctx);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private buildElement(node: DocNode, ctx: EmitContext): React.ReactElement {
    const def = this.registry[node.type]!;

    // Build slot children as React elements
    const slotProps: Record<string, React.ReactNode> = {};
    for (const [slotName, childIds] of Object.entries(node.slots)) {
      const children = childIds
        .map(id => {
          const child = ctx.doc.nodes[id];
          return child ? this.visitAsElement(child, ctx) : null;
        })
        .filter((el): el is React.ReactElement => el !== null);

      if (slotName === "children") {
        slotProps["children"] = children.length === 1 ? children[0] : children;
      } else {
        slotProps[slotName] = children.length === 1 ? children[0] : children;
      }
    }

    return React.createElement(def.Component, {
      ...node.props,
      ...slotProps,
      "data-pf-id": node.id,
    } as Record<string, unknown>);
  }
}
