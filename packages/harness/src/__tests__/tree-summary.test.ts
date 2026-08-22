/**
 * tree-summary.test.ts — unit tests for renderTreeSummary.
 *
 * Tests cover all three reduction mechanisms:
 *   1. Depth limit — nodes beyond maxDepth collapsed
 *   2. Focus expansion — focusId subtree rendered at focusDepth
 *   3. Sibling compression — consecutive same-type nodes compressed
 */

import { describe, it, expect } from "vitest";
import { makeMinimalDocument, fromNestedTree } from "@pageforge/ir";
import type { Document, NodeId } from "@pageforge/ir";
import { renderTreeSummary } from "../tree-summary.js";
import { makeLargeDocument } from "./__fixtures__/large-document.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Deep document: Page → Section → Container → Heading (4 levels deep) */
function makeDeepDoc(): { doc: Document; deepId: NodeId } {
  const doc = fromNestedTree({
    root: {
      type: "Page",
      slots: {
        children: [
          {
            id: "section-1",
            type: "Section",
            slots: {
              children: [
                {
                  id: "container-1",
                  type: "Container",
                  slots: {
                    children: [
                      {
                        id: "heading-deep",
                        type: "Heading",
                        props: { text: "Deep Heading" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  return { doc, deepId: "heading-deep" as NodeId };
}

/** Document with many same-type siblings */
function makeSiblingsDoc(): Document {
  return fromNestedTree({
    root: {
      type: "Page",
      slots: {
        children: [
          {
            type: "Section",
            slots: {
              children: [
                { id: "card-1", type: "Card", props: { title: "Card 1" } },
                { id: "card-2", type: "Card", props: { title: "Card 2" } },
                { id: "card-3", type: "Card", props: { title: "Card 3" } },
                { id: "card-4", type: "Card", props: { title: "Card 4" } },
                { id: "card-5", type: "Card", props: { title: "Card 5" } },
              ],
            },
          },
        ],
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe("renderTreeSummary — basic", () => {
  it("returns an XML-like string with the root type", () => {
    const doc = makeMinimalDocument();
    const result = renderTreeSummary(doc);
    expect(typeof result).toBe("string");
    expect(result).toContain("<Page");
  });

  it("includes the root id", () => {
    const doc = makeMinimalDocument();
    const result = renderTreeSummary(doc);
    expect(result).toContain(`id=${doc.root}`);
  });

  it("renders a simple 2-level document correctly", () => {
    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: { children: [{ type: "Heading", props: { text: "Hello" } }] },
      },
    });
    const result = renderTreeSummary(doc);
    expect(result).toContain("<Page");
    expect(result).toContain("<Heading");
    expect(result).toContain('text="Hello"');
  });
});

// ---------------------------------------------------------------------------
// Depth limit
// ---------------------------------------------------------------------------

describe("renderTreeSummary — depth limit", () => {
  it("collapses nodes beyond maxDepth with a count annotation", () => {
    const { doc } = makeDeepDoc();
    // Page (0) → Section (1) → Container (2) beyond depth=1 → collapsed
    const result = renderTreeSummary(doc, { maxDepth: 1, focusDepth: 2, siblingThreshold: 10 });
    expect(result).toContain("collapsed");
  });

  it("does NOT collapse within maxDepth", () => {
    const { doc } = makeDeepDoc();
    // With maxDepth=4 all nodes visible
    const result = renderTreeSummary(doc, { maxDepth: 4, focusDepth: 6, siblingThreshold: 10 });
    expect(result).not.toContain("collapsed");
    expect(result).toContain("heading-deep");
  });

  it("shows subtree node count in collapse annotation", () => {
    const { doc } = makeDeepDoc();
    const result = renderTreeSummary(doc, { maxDepth: 1, focusDepth: 2, siblingThreshold: 10 });
    // The Section at depth=1 is collapsed; its subtree has 2 nodes (Container + Heading)
    expect(result).toMatch(/\[\d+ nodes collapsed\]/);
  });
});

// ---------------------------------------------------------------------------
// Focus expansion
// ---------------------------------------------------------------------------

describe("renderTreeSummary — focus expansion", () => {
  it("fully renders the focus node even beyond maxDepth", () => {
    const { doc, deepId } = makeDeepDoc();
    const result = renderTreeSummary(doc, {
      maxDepth: 1,
      focusDepth: 5,
      focusId: deepId,
      siblingThreshold: 10,
    });
    // Deep heading should appear because it's the focus
    expect(result).toContain("heading-deep");
  });

  it("renders focus ancestors at full depth", () => {
    const { doc, deepId } = makeDeepDoc();
    const result = renderTreeSummary(doc, {
      maxDepth: 1,
      focusDepth: 5,
      focusId: deepId,
      siblingThreshold: 10,
    });
    expect(result).toContain("section-1");
    expect(result).toContain("container-1");
  });
});

// ---------------------------------------------------------------------------
// Sibling compression
// ---------------------------------------------------------------------------

describe("renderTreeSummary — sibling compression", () => {
  it("compresses runs of same-type nodes at/above threshold", () => {
    const doc = makeSiblingsDoc();
    const result = renderTreeSummary(doc, {
      maxDepth: 3,
      focusDepth: 5,
      siblingThreshold: 4, // 5 cards >= 4 → compress
    });
    expect(result).toMatch(/… \+\d+ similar/);
  });

  it("always renders the first exemplar of a compressed group", () => {
    const doc = makeSiblingsDoc();
    const result = renderTreeSummary(doc, {
      maxDepth: 3,
      focusDepth: 5,
      siblingThreshold: 4,
    });
    expect(result).toContain("card-1");
  });

  it("does NOT compress when group size < threshold", () => {
    const doc = makeSiblingsDoc();
    const result = renderTreeSummary(doc, {
      maxDepth: 3,
      focusDepth: 5,
      siblingThreshold: 10, // 5 < 10 → no compression
    });
    expect(result).not.toMatch(/… \+\d+ similar/);
    // All 5 cards should appear
    for (let i = 1; i <= 5; i++) {
      expect(result).toContain(`card-${i}`);
    }
  });

  it("lists compressed sibling IDs in the annotation", () => {
    const doc = makeSiblingsDoc();
    const result = renderTreeSummary(doc, {
      maxDepth: 3,
      focusDepth: 5,
      siblingThreshold: 4,
    });
    // The annotation should include at least some of the compressed IDs
    expect(result).toContain("card-2");
  });
});

// ---------------------------------------------------------------------------
// maxNodes cap
// ---------------------------------------------------------------------------

describe("renderTreeSummary — maxNodes cap", () => {
  it("stops rendering after maxNodes", () => {
    const doc = makeLargeDocument();
    const result = renderTreeSummary(doc, {
      maxDepth: 10,
      focusDepth: 12,
      siblingThreshold: 100,
      maxNodes: 5,
    });
    // With only 5 nodes allowed, can't have all 311
    const tagCount = (result.match(/<\w/g) ?? []).length;
    expect(tagCount).toBeLessThanOrEqual(10); // rough upper bound
  });
});

// ---------------------------------------------------------------------------
// Props formatting
// ---------------------------------------------------------------------------

describe("renderTreeSummary — prop formatting", () => {
  it("inlines string props as quoted attributes", () => {
    const doc = fromNestedTree({
      root: { type: "Page", slots: { children: [{ type: "Heading", props: { text: "Hello" } }] } },
    });
    const result = renderTreeSummary(doc);
    expect(result).toContain('text="Hello"');
  });

  it("inlines numeric props without quotes", () => {
    const doc = fromNestedTree({
      root: { type: "Page", slots: { children: [{ type: "Grid", props: { cols: 3 } }] } },
    });
    const result = renderTreeSummary(doc);
    expect(result).toContain("cols=3");
  });

  it("truncates very long string props", () => {
    const longText = "A".repeat(100);
    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: { children: [{ type: "Heading", props: { text: longText } }] },
      },
    });
    const result = renderTreeSummary(doc);
    // Should contain truncated version with ellipsis, not the full 100-char string
    expect(result).toContain("…");
    expect(result).not.toContain("A".repeat(50));
  });
});
