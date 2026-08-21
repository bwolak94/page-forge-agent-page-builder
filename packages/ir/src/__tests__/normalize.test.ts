import { describe, it, expect } from "vitest";
import { fromNestedTree, toNestedTree, makeDocument, makeMinimalDocument } from "../normalize.js";
import { validateDocument } from "../validate.js";
import { ROOT_ID, EMPTY_DOCUMENT } from "../constants.js";
import { nodeId } from "../types.js";

// ---------------------------------------------------------------------------
// fromNestedTree
// ---------------------------------------------------------------------------

describe("fromNestedTree", () => {
  it("converts a single-node tree", () => {
    const doc = fromNestedTree({ root: { id: "root", type: "Page", props: { title: "Hi" } } });
    expect(doc.root).toBe("root");
    expect(Object.keys(doc.nodes)).toHaveLength(1);
    expect(doc.nodes["root" as ReturnType<typeof nodeId>]?.type).toBe("Page");
  });

  it("assigns nanoid when node id is omitted", () => {
    const doc = fromNestedTree({ root: { type: "Page", props: {} } });
    expect(typeof doc.root).toBe("string");
    expect(doc.root.length).toBeGreaterThan(0);
  });

  it("flattens a nested tree into nodes map", () => {
    const doc = fromNestedTree({
      root: {
        id: "root",
        type: "Page",
        props: {},
        slots: {
          children: [
            { id: "n1", type: "Section", props: {}, slots: { children: [{ id: "n2", type: "Heading", props: {} }] } },
          ],
        },
      },
    });
    expect(Object.keys(doc.nodes)).toHaveLength(3);
    expect(doc.nodes["root" as ReturnType<typeof nodeId>]?.slots["children"]).toContain("n1");
    expect(doc.nodes["n1" as ReturnType<typeof nodeId>]?.slots["children"]).toContain("n2");
  });

  it("produces a document that passes validateDocument", () => {
    const doc = fromNestedTree({
      root: {
        id: "root",
        type: "Page",
        slots: { children: [{ id: "n1", type: "Section" }] },
      },
    });
    expect(validateDocument(doc).isOk()).toBe(true);
  });

  it("throws on duplicate node ids", () => {
    expect(() =>
      fromNestedTree({
        root: {
          id: "root",
          type: "Page",
          slots: {
            children: [
              { id: "dup", type: "A" },
              { id: "dup", type: "B" }, // same id
            ],
          },
        },
      })
    ).toThrow(/Duplicate node id/);
  });
});

// ---------------------------------------------------------------------------
// toNestedTree
// ---------------------------------------------------------------------------

describe("toNestedTree", () => {
  it("converts EMPTY_DOCUMENT back to nested form", () => {
    const nested = toNestedTree(EMPTY_DOCUMENT);
    expect(nested.root.id).toBe(ROOT_ID);
    expect(nested.root.type).toBe("Page");
    expect(nested.schemaVersion).toBe(EMPTY_DOCUMENT.schemaVersion);
  });

  it("omits empty slots from output", () => {
    const doc = makeMinimalDocument();
    const nested = toNestedTree(doc);
    expect(nested.root.slots).toBeUndefined();
  });

  it("includes slots when they have children", () => {
    const doc = fromNestedTree({
      root: { id: "root", type: "Page", slots: { children: [{ id: "n1", type: "Text" }] } },
    });
    const nested = toNestedTree(doc);
    expect(nested.root.slots?.["children"]).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: fromNestedTree → toNestedTree
// ---------------------------------------------------------------------------

describe("round-trip", () => {
  it("fromNestedTree(toNestedTree(doc)) is structurally equal to original", () => {
    const original = fromNestedTree({
      root: {
        id: "root",
        type: "Page",
        props: { title: "Test" },
        slots: {
          children: [
            {
              id: "s1",
              type: "Section",
              slots: {
                children: [
                  { id: "h1", type: "Heading", props: { level: 1, text: "Hello" } },
                  { id: "t1", type: "Text", props: { text: "World" } },
                ],
              },
            },
          ],
        },
      },
    });

    const nested = toNestedTree(original);
    const restored = fromNestedTree(nested);

    // Same node ids
    expect(Object.keys(restored.nodes).sort()).toEqual(Object.keys(original.nodes).sort());
    // Same root
    expect(restored.root).toBe(original.root);
    // Each node type preserved
    for (const [id, node] of Object.entries(original.nodes)) {
      expect(restored.nodes[id as ReturnType<typeof nodeId>]?.type).toBe(node.type);
    }
  });
});

// ---------------------------------------------------------------------------
// makeDocument helper
// ---------------------------------------------------------------------------

describe("makeDocument", () => {
  it("uses first node as root", () => {
    const nid = nodeId("myroot");
    const doc = makeDocument([{ id: nid, type: "Page", props: {}, slots: {} }]);
    expect(doc.root).toBe(nid);
  });

  it("throws when no nodes provided", () => {
    expect(() => makeDocument([])).toThrow();
  });
});
