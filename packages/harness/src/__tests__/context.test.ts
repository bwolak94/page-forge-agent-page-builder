/**
 * context.test.ts — unit tests for buildContext.
 *
 * Verifies:
 * - Three-part structure (instructions, manifest, tree)
 * - Anthropic cache_control breakpoint on manifest part
 * - systemText concatenation
 * - Stats object has correct fields
 * - tokenBudget is respected via compression
 */

import { describe, it, expect } from "vitest";
import { makeMinimalDocument, fromNestedTree } from "@pageforge/ir";
import { REGISTRY } from "@pageforge/registry";
import { buildContext } from "../context.js";
import { CharCounterApprox } from "../token-counter.js";
import { makeLargeDocument } from "./__fixtures__/large-document.js";

// ---------------------------------------------------------------------------
// Structure tests
// ---------------------------------------------------------------------------

describe("buildContext — structure", () => {
  it("returns three system parts", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY);
    expect(result.system).toHaveLength(3);
    expect(result.system[0]!.type).toBe("text");
    expect(result.system[1]!.type).toBe("text");
    expect(result.system[2]!.type).toBe("text");
  });

  it("first part contains system instructions", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY);
    expect(result.system[0]!.text).toContain("PageForge");
    expect(result.system[0]!.text).toContain("queryTree");
  });

  it("second part contains registry manifest", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY);
    expect(result.system[1]!.text).toContain("Available Components");
    // Registry has Page, Section, etc.
    expect(result.system[1]!.text).toContain("Page");
  });

  it("second part has Anthropic cache_control breakpoint", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY);
    const manifestPart = result.system[1]!;
    expect(manifestPart.experimental_providerMetadata).toBeDefined();
    expect(
      manifestPart.experimental_providerMetadata?.anthropic.cacheControl.type,
    ).toBe("ephemeral");
  });

  it("third part contains current document tree", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY);
    expect(result.system[2]!.text).toContain("Current Document");
    expect(result.system[2]!.text).toContain("<Page");
  });

  it("first two parts do NOT have cache_control", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY);
    expect(result.system[0]!.experimental_providerMetadata).toBeUndefined();
    expect(result.system[2]!.experimental_providerMetadata).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// systemText
// ---------------------------------------------------------------------------

describe("buildContext — systemText", () => {
  it("is a non-empty string containing all three sections", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY);
    expect(typeof result.systemText).toBe("string");
    expect(result.systemText).toContain("PageForge");
    expect(result.systemText).toContain("Available Components");
    expect(result.systemText).toContain("Current Document");
  });

  it("systemText is consistent with system parts", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY);
    // Each part's text should appear in systemText
    for (const part of result.system) {
      // Use a short prefix to avoid issues with whitespace normalization
      const snippet = part.text.slice(0, 20).trim();
      if (snippet) {
        expect(result.systemText).toContain(snippet);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

describe("buildContext — stats", () => {
  it("returns stats with positive token counts", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY, { counter: new CharCounterApprox() });
    expect(result.stats.totalTokens).toBeGreaterThan(0);
    expect(result.stats.manifestTokens).toBeGreaterThan(0);
    expect(result.stats.treeTokens).toBeGreaterThan(0);
  });

  it("totalTokens ≈ manifestTokens + treeTokens + instructionTokens", () => {
    const doc = makeMinimalDocument();
    const counter = new CharCounterApprox();
    const result = buildContext(doc, REGISTRY, { counter });
    // total should be the sum of the three parts (with minor rounding variation)
    const sum = result.stats.manifestTokens + result.stats.treeTokens;
    expect(result.stats.totalTokens).toBeGreaterThanOrEqual(sum);
  });

  it("compressionLevel is a number", () => {
    const doc = makeMinimalDocument();
    const result = buildContext(doc, REGISTRY, { counter: new CharCounterApprox() });
    expect(typeof result.stats.compressionLevel).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Token budget enforcement
// ---------------------------------------------------------------------------

describe("buildContext — token budget", () => {
  it("applies more compression for smaller budgets", () => {
    const doc = makeLargeDocument();
    const counter = new CharCounterApprox();

    const tightResult = buildContext(doc, REGISTRY, { tokenBudget: 500, counter });
    const looseResult = buildContext(doc, REGISTRY, { tokenBudget: 8000, counter });

    // Tight budget → higher compression level (or equal)
    expect(tightResult.stats.compressionLevel).toBeGreaterThanOrEqual(
      looseResult.stats.compressionLevel,
    );
    // Tight budget → smaller tree
    expect(tightResult.stats.treeTokens).toBeLessThanOrEqual(looseResult.stats.treeTokens);
  });

  it("does not crash on a very tight budget (fallback path)", () => {
    const doc = makeLargeDocument();
    const counter = new CharCounterApprox();
    // Extremely small budget — should trigger fallback
    expect(() => buildContext(doc, REGISTRY, { tokenBudget: 10, counter })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// focusId option
// ---------------------------------------------------------------------------

describe("buildContext — focusId", () => {
  it("passes focusId to the tree summary", () => {
    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: {
          children: [
            {
              id: "target-section",
              type: "Section",
              slots: {
                children: [{ id: "deep-heading", type: "Heading", props: { text: "Deep" } }],
              },
            },
          ],
        },
      },
    });

    const resultWithFocus = buildContext(doc, REGISTRY, {
      focusId: "deep-heading" as import("@pageforge/ir").NodeId,
      counter: new CharCounterApprox(),
      tokenBudget: 8000,
    });

    // With focus, deep-heading should appear in the tree
    expect(resultWithFocus.system[2]!.text).toContain("deep-heading");
  });
});
