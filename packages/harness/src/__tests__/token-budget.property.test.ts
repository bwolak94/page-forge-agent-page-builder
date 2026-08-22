/**
 * token-budget.property.test.ts
 *
 * Tests:
 * 1. Deliverable criterion: 300-node document → summary ≤ 1500 tokens.
 * 2. Property test: any generated document → compressToFit always ≤ budget.
 *
 * Uses CharCounterApprox (no WASM deps) for the property test for speed.
 * Uses Cl100kEstimateCounter for the 300-node criterion (more realistic).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { fromNestedTree, makeMinimalDocument } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";
import { compressToFit } from "../compression.js";
import { Cl100kEstimateCounter, CharCounterApprox } from "../token-counter.js";
import { makeLargeDocument } from "./__fixtures__/large-document.js";

// ---------------------------------------------------------------------------
// Deliverable criterion: 300-node document ≤ 1500 tokens
// ---------------------------------------------------------------------------

describe("Token budget — deliverable criterion", () => {
  it("300-node document tree summary fits in 1500 tokens (Cl100kEstimateCounter)", () => {
    const doc = makeLargeDocument();
    const nodeCount = Object.keys(doc.nodes).length;
    expect(nodeCount).toBeGreaterThanOrEqual(300);

    const counter = new Cl100kEstimateCounter();
    const summary = compressToFit(doc, undefined, 1500, counter);
    const tokens = counter.count(summary);

    expect(tokens).toBeLessThanOrEqual(1500);
  });

  it("300-node document compresses without crashing", () => {
    const doc = makeLargeDocument();
    const counter = new Cl100kEstimateCounter();
    expect(() => compressToFit(doc, undefined, 1500, counter)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Arbitraries for property test
// ---------------------------------------------------------------------------

/**
 * Build a deterministic document from (depth, breadth) parameters.
 * depth=1 → only root with `breadth` children.
 * depth=2 → each child also has `breadth` children.
 * etc.
 */
function buildDocFromParams(depth: number, breadth: number): Document {
  if (depth <= 0 || breadth <= 0) return makeMinimalDocument();

  const types = ["Section", "Card", "Heading", "Grid", "Container"];

  interface NestedNode {
    type: string;
    props?: Record<string, string | number>;
    slots?: Record<string, NestedNode[]>;
  }

  function buildNode(remainingDepth: number): NestedNode {
    const type = types[remainingDepth % types.length]!;
    if (remainingDepth <= 0) {
      return { type, props: { title: "leaf" } };
    }
    const children: NestedNode[] = Array.from({ length: breadth }, () =>
      buildNode(remainingDepth - 1),
    );
    return { type, slots: { children } };
  }

  const rootNode = { type: "Page", slots: { children: Array.from({ length: breadth }, () => buildNode(depth - 1)) } };

  return fromNestedTree({ root: rootNode });
}

// ---------------------------------------------------------------------------
// Property test
// ---------------------------------------------------------------------------

describe("Token budget — property test", () => {
  it("compressToFit never exceeds budget for any document shape", () => {
    const counter = new CharCounterApprox();
    const BUDGET = 800;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),  // depth
        fc.integer({ min: 0, max: 5 }),  // breadth
        (depth, breadth) => {
          const doc = buildDocFromParams(depth, breadth);
          const summary = compressToFit(doc, undefined, BUDGET, counter);
          const tokens = counter.count(summary);
          return tokens <= BUDGET;
        },
      ),
      { numRuns: 100, seed: 42 },
    );
  });

  it("compressToFit never throws for any document shape", () => {
    const counter = new CharCounterApprox();

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 100, max: 2000 }),
        (depth, breadth, budget) => {
          const doc = buildDocFromParams(depth, breadth);
          let threw = false;
          try {
            compressToFit(doc, undefined, budget, counter);
          } catch {
            threw = true;
          }
          return !threw;
        },
      ),
      { numRuns: 100, seed: 43 },
    );
  });
});

// ---------------------------------------------------------------------------
// Cl100kEstimateCounter accuracy sanity checks
// ---------------------------------------------------------------------------

describe("Cl100kEstimateCounter", () => {
  it("counts non-zero tokens for non-empty text", () => {
    const counter = new Cl100kEstimateCounter();
    expect(counter.count("Hello world")).toBeGreaterThan(0);
  });

  it("returns 0 or 1 for empty string", () => {
    const counter = new Cl100kEstimateCounter();
    expect(counter.count("")).toBeLessThanOrEqual(1);
  });

  it("longer text has more tokens than shorter text", () => {
    const counter = new Cl100kEstimateCounter();
    const short = counter.count("Hello");
    const long = counter.count("Hello world, this is a much longer string with many more words");
    expect(long).toBeGreaterThan(short);
  });

  it("gives a reasonable estimate for a typical tree line", () => {
    const counter = new Cl100kEstimateCounter();
    // A typical tree line like '<Section id=s1 name="Pricing">'
    const line = '<Section id=section-0 name="Pricing">';
    const tokens = counter.count(line);
    // Should be between 5 and 20 tokens for this ~37 char line
    expect(tokens).toBeGreaterThanOrEqual(5);
    expect(tokens).toBeLessThanOrEqual(20);
  });
});
