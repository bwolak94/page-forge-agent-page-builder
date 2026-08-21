/**
 * Property-based reversibility test.
 *
 * Core invariant:
 *   apply(inverse, apply(forward, doc)) ≡ doc
 *
 * We generate arbitrary documents and arbitrary mutations, run them through
 * Immer's `produceWithPatches` to get (forward, inverse) pairs, then verify
 * that applying forward and then inverse restores the original document.
 *
 * This test does NOT require the commands layer (T03) — mutations are expressed
 * directly as Immer draft functions, which is exactly what Command.execute does.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { produceWithPatches, type Draft } from "immer";
import { toJsonPatch, applyPatches } from "../patches.js";
import { fromNestedTree, type NestedNode } from "../normalize.js";
import { EMPTY_DOCUMENT, DEFAULT_THEME } from "../constants.js";
import type { Document } from "../types.js";
import { nodeId } from "../types.js";

// ---------------------------------------------------------------------------
// Arbitrary document generator (reused from T01 approach)
// ---------------------------------------------------------------------------

const COMPONENT_TYPES = ["Section", "Container", "Stack", "Heading", "Text", "Button", "Card"];

const { node: arbNestedNodeRec } = fc.letrec(tie => ({
  node: fc.oneof(
    fc.record<NestedNode>({
      id: fc.integer({ min: 1, max: 4999 }).map(n => `n${n}`),
      type: fc.constantFrom(...COMPONENT_TYPES),
      props: fc.constant({}),
    }),
    fc.record<NestedNode>({
      id: fc.integer({ min: 5000, max: 9999 }).map(n => `n${n}`),
      type: fc.constantFrom(...COMPONENT_TYPES),
      props: fc.constant({}),
      slots: fc.record({
        children: fc.array(tie("node") as fc.Arbitrary<NestedNode>, {
          minLength: 0,
          maxLength: 3,
        }).map(nodes => {
          const seen = new Set<string>();
          return nodes.filter(n => {
            if (!n.id || seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });
        }),
      }),
    }),
  ),
}));

function arbDocument(): fc.Arbitrary<Document> {
  return arbNestedNodeRec.map((root: NestedNode) => {
    try {
      return fromNestedTree({ root: { ...root, id: "root" } });
    } catch {
      return EMPTY_DOCUMENT;
    }
  });
}

// ---------------------------------------------------------------------------
// Arbitrary mutations — simple draft functions that change a Document
// ---------------------------------------------------------------------------

type Mutation = (draft: Draft<Document>) => void;

/** Generate a mutation that replaces a theme color value. */
function arbThemeColorMutation(): fc.Arbitrary<Mutation> {
  const colorKeys = Object.keys(DEFAULT_THEME.colors);
  return fc
    .tuple(
      fc.constantFrom(...colorKeys),
      fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => `#${h}`),
    )
    .map(([key, value]) => (draft: Draft<Document>) => {
      draft.theme.colors[key] = value;
    });
}

/** Generate a mutation that changes a breakpoint label. */
function arbBreakpointMutation(): fc.Arbitrary<Mutation> {
  return fc
    .tuple(fc.integer({ min: 0, max: 2 }), fc.string({ minLength: 1, maxLength: 12 }))
    .map(([idx, label]) => (draft: Draft<Document>) => {
      const bp = draft.breakpoints[idx];
      if (bp) bp.label = label;
    });
}

/** Generate a mutation that changes a string prop on the root node. */
function arbRootPropMutation(): fc.Arbitrary<Mutation> {
  return fc
    .tuple(
      fc.constantFrom("title", "lang", "dir", "name"),
      fc.string({ minLength: 1, maxLength: 20 }),
    )
    .map(([key, value]) => (draft: Draft<Document>) => {
      draft.nodes[draft.root]!.props[key] = value;
    });
}

/** Generate a mutation that adds a new node to the root's children slot. */
function arbAddNodeMutation(): fc.Arbitrary<Mutation> {
  return fc
    .tuple(
      fc.integer({ min: 90000, max: 99999 }).map(n => `new${n}`),
      fc.constantFrom(...COMPONENT_TYPES),
    )
    .map(([id, type]) => (draft: Draft<Document>) => {
      const nid = nodeId(id);
      draft.nodes[nid] = { id: nid, type, props: {}, slots: {} };
      const rootSlot = draft.nodes[draft.root]?.slots["children"];
      if (rootSlot) {
        rootSlot.push(nid);
      }
    });
}

/** All mutations combined. */
function arbMutation(): fc.Arbitrary<Mutation> {
  return fc.oneof(
    arbThemeColorMutation(),
    arbBreakpointMutation(),
    arbRootPropMutation(),
    arbAddNodeMutation(),
  );
}

// ---------------------------------------------------------------------------
// Critical reversibility property
// ---------------------------------------------------------------------------

describe("patches — reversibility property", () => {
  it("apply(inverse, apply(forward, doc)) ≡ doc for all mutations", () => {
    fc.assert(
      fc.property(arbDocument(), arbMutation(), (doc, mutation) => {
        const [, fwdImmer, invImmer] = produceWithPatches(doc, mutation);

        const forward = toJsonPatch(fwdImmer);
        const inverse = toJsonPatch(invImmer);

        const afterForward = applyPatches(doc, forward);
        const afterInverse = applyPatches(afterForward, inverse);

        expect(afterInverse).toEqual(doc);
      }),
      { numRuns: 500 },
    );
  });

  it("applying empty patches is a no-op", () => {
    fc.assert(
      fc.property(arbDocument(), doc => {
        expect(applyPatches(doc, [])).toBe(doc); // exact same reference
      }),
      { numRuns: 100 },
    );
  });

  it("forward patches produce the same doc as Immer draft mutation", () => {
    fc.assert(
      fc.property(arbDocument(), arbMutation(), (doc, mutation) => {
        const [immerResult, fwdImmer] = produceWithPatches(doc, mutation);
        const patchResult = applyPatches(doc, toJsonPatch(fwdImmer));
        expect(patchResult).toEqual(immerResult);
      }),
      { numRuns: 300 },
    );
  });
});

// ---------------------------------------------------------------------------
// Serialization round-trip property
// ---------------------------------------------------------------------------

import { serializePatchSet, deserializePatchSet } from "../patches.js";

describe("serializePatchSet / deserializePatchSet — round-trip property", () => {
  it("serialize → deserialize is lossless for Immer-produced patches", () => {
    fc.assert(
      fc.property(arbDocument(), arbMutation(), (doc, mutation) => {
        const [, fwdImmer, invImmer] = produceWithPatches(doc, mutation);
        const ps = {
          patches: toJsonPatch(fwdImmer),
          inverse: toJsonPatch(invImmer),
        };
        const restored = deserializePatchSet(serializePatchSet(ps));
        expect(restored).toEqual(ps);
      }),
      { numRuns: 200 },
    );
  });
});
