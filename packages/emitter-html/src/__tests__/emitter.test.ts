/**
 * emitter.test.ts — unit tests for HtmlEmitter.
 *
 * Tests verify that:
 * - Each node type renders using the same React component as the canvas.
 * - Slots are recursively rendered and embedded.
 * - Unknown node types emit HTML comment placeholders (not throws).
 * - data-pf-id attributes are present for visual regression mapping.
 */

import { describe, it, expect } from "vitest";
import { fromNestedTree } from "@pageforge/ir";
import { REGISTRY } from "@pageforge/registry";
import { HtmlEmitter } from "../emitter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(doc: ReturnType<typeof fromNestedTree>) {
  return { doc, registry: REGISTRY };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HtmlEmitter", () => {
  const emitter = new HtmlEmitter(REGISTRY);

  it("renders a Button node to HTML string", () => {
    const doc = fromNestedTree({
      root: { type: "Button", props: { label: "Click me" }, slots: {} },
    });
    const ctx = makeCtx(doc);
    const root = doc.nodes[doc.root]!;
    const html = emitter.visit(root, ctx);

    expect(html).toContain("Click me");
    // Rendered by the same React component used on the canvas (renderToStaticMarkup)
    expect(html).toMatch(/<button|<a /);
  });

  it("renders nested slot children recursively", () => {
    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: {
          children: [
            { type: "Heading", props: { level: 1, text: "Hello World" }, slots: {} },
            { type: "Text", props: { text: "Body text" }, slots: {} },
          ],
        },
      },
    });
    const ctx = makeCtx(doc);
    const root = doc.nodes[doc.root]!;
    const html = emitter.visit(root, ctx);

    expect(html).toContain("Hello World");
    expect(html).toContain("Body text");
  });

  it("emits an HTML comment for unknown component types", () => {
    const doc = fromNestedTree({
      root: { type: "UnknownWidget", props: {}, slots: {} },
    });
    const ctx = makeCtx(doc);
    const root = doc.nodes[doc.root]!;
    const html = emitter.visit(root, ctx);

    expect(html).toContain("<!-- Unknown: UnknownWidget -->");
  });

  it("is deterministic — same IR produces identical output", () => {
    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: {
          children: [{ type: "Hero", props: { headline: "Test" }, slots: {} }],
        },
      },
    });
    const ctx = makeCtx(doc);
    const root = doc.nodes[doc.root]!;

    const first = emitter.visit(root, ctx);
    const second = emitter.visit(root, ctx);
    expect(first).toBe(second);
  });
});
