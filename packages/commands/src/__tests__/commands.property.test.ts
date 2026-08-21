/**
 * Property-based test: random command sequences preserve IR invariants
 * and are fully reversible via inverse patches.
 *
 * Core invariant:
 *   For every sequence of valid commands applied to an arbitrary document:
 *   1. validateDocument(doc) is Ok after each command.
 *   2. Applying all inverse patches in reverse restores the original document.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { NestedNode } from "@pageforge/ir";
import { fromNestedTree, validateDocument, applyPatches, EMPTY_DOCUMENT, DEFAULT_THEME } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";
import { executeCommand } from "../../src/executor.js";
import type { JsonPatch } from "@pageforge/ir";
import { stubRegistry } from "./helpers.js";

// ---------------------------------------------------------------------------
// Arbitrary document generator (same approach as T01/T02 tests)
// ---------------------------------------------------------------------------

const COMPONENT_TYPES = ["Section", "Container", "Stack", "Heading", "Text", "Button"];

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
// Arbitrary commands — generate plausible args; invalid ones are skipped
// ---------------------------------------------------------------------------

const KNOWN_IDS = ["root", "n1", "n2", "n3", "n4", "n5000", "n5001"];
const KNOWN_NON_ROOT = ["n1", "n2", "n3", "n4", "n5000", "n5001"];
const KNOWN_SLOTS = ["children", "header", "footer", "main"];
const KNOWN_TYPES = COMPONENT_TYPES;
const COLOR_KEYS = Object.keys(DEFAULT_THEME.colors);

type ArbCommand = { kind: string; args: unknown };

function arbCommand(): fc.Arbitrary<ArbCommand> {
  return fc.oneof(
    // insert-node
    fc.record({
      kind: fc.constant("insert-node"),
      args: fc.record({
        parentId: fc.constantFrom(...KNOWN_IDS),
        slot: fc.constantFrom(...KNOWN_SLOTS),
        index: fc.integer({ min: -1, max: 5 }),
        type: fc.constantFrom(...KNOWN_TYPES),
      }),
    }),
    // update-props
    fc.record({
      kind: fc.constant("update-props"),
      args: fc.record({
        id: fc.constantFrom(...KNOWN_IDS),
        patch: fc.record({
          text: fc.string({ minLength: 0, maxLength: 20 }),
          level: fc.integer({ min: 1, max: 6 }),
        }),
      }),
    }),
    // set-meta
    fc.record({
      kind: fc.constant("set-meta"),
      args: fc.record({
        id: fc.constantFrom(...KNOWN_IDS),
        meta: fc.record({ name: fc.string({ maxLength: 20 }) }),
      }),
    }),
    // apply-theme
    fc.record({
      kind: fc.constant("apply-theme"),
      args: fc.record({
        tokens: fc.record({
          colors: fc.record(
            Object.fromEntries(
              COLOR_KEYS.map(k => [
                k,
                fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => `#${h}`),
              ]),
            ),
          ),
        }),
      }),
    }),
    // delete-node (non-root only — root deletion always fails anyway)
    fc.record({
      kind: fc.constant("delete-node"),
      args: fc.record({
        id: fc.constantFrom(...KNOWN_NON_ROOT),
      }),
    }),
    // reorder-slot
    fc.record({
      kind: fc.constant("reorder-slot"),
      args: fc.record({
        parentId: fc.constantFrom(...KNOWN_IDS),
        slot: fc.constantFrom(...KNOWN_SLOTS),
        fromIndex: fc.integer({ min: 0, max: 4 }),
        toIndex: fc.integer({ min: 0, max: 4 }),
      }),
    }),
    // move-node (non-root source)
    fc.record({
      kind: fc.constant("move-node"),
      args: fc.record({
        id: fc.constantFrom(...KNOWN_NON_ROOT),
        parentId: fc.constantFrom(...KNOWN_IDS),
        slot: fc.constantFrom(...KNOWN_SLOTS),
        index: fc.integer({ min: -1, max: 5 }),
      }),
    }),
    // duplicate-node (non-root)
    fc.record({
      kind: fc.constant("duplicate-node"),
      args: fc.record({
        id: fc.constantFrom(...KNOWN_NON_ROOT),
      }),
    }),
  );
}

// ---------------------------------------------------------------------------
// Core properties
// ---------------------------------------------------------------------------

describe("command sequences — invariants and reversibility", () => {
  it("invariants hold after every valid command; undo restores original", () => {
    fc.assert(
      fc.property(
        arbDocument(),
        fc.array(arbCommand(), { minLength: 1, maxLength: 20 }),
        (doc, commands) => {
          let current = doc;
          const inverses: JsonPatch[][] = [];

          for (const { kind, args } of commands) {
            const result = executeCommand(current, stubRegistry, kind, args);
            if (result.isErr()) continue; // invalid for this state — skip

            inverses.push(result.value.inverse);
            current = result.value.doc;

            // Invariant after each command
            expect(validateDocument(current).isOk()).toBe(true);
          }

          // Undo all in reverse — must restore original
          for (const inverse of [...inverses].reverse()) {
            current = applyPatches(current, inverse);
          }
          expect(current).toEqual(doc);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("a sequence of set-meta commands never breaks invariants", () => {
    fc.assert(
      fc.property(
        arbDocument(),
        fc.array(
          fc.record({
            id: fc.constantFrom(...KNOWN_IDS),
            name: fc.string({ maxLength: 30 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (doc, metas) => {
          let current = doc;
          for (const { id, name } of metas) {
            const result = executeCommand(current, stubRegistry, "set-meta", {
              id,
              meta: { name },
            });
            if (result.isErr()) continue;
            current = result.value.doc;
            expect(validateDocument(current).isOk()).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("insert then undo-delete restores original via inverse patches", () => {
    fc.assert(
      fc.property(
        arbDocument(),
        fc.integer({ min: 10000, max: 99999 }).map(n => `tmp${n}`),
        (doc, tmpId) => {
          // Insert
          const insertResult = executeCommand(doc, stubRegistry, "insert-node", {
            parentId: "root",
            slot: "children",
            index: -1,
            type: "Text",
            id: tmpId,
          });
          if (insertResult.isErr()) return; // root might not exist in this doc

          const afterInsert = insertResult.value.doc;
          const insertInverse = insertResult.value.inverse;

          // Undo the insert — must restore original
          const restored = applyPatches(afterInsert, insertInverse);
          expect(restored).toEqual(doc);
        },
      ),
      { numRuns: 100 },
    );
  });
});
