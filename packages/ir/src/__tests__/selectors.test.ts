import { describe, it, expect } from "vitest";
import {
  parentOf,
  slotOf,
  ancestors,
  pathTo,
  descendants,
  siblings,
  allNodeIds,
  subtreeSize,
} from "../selectors.js";
import { EMPTY_DOCUMENT, ROOT_ID } from "../constants.js";
import { nodeId } from "../types.js";
import { makeDocument } from "../normalize.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const N1 = nodeId("n1");
const N2 = nodeId("n2");
const N3 = nodeId("n3");
const N4 = nodeId("n4");

/**
 * Tree:
 *   root (Page)
 *     └─ n1 (Section)
 *          ├─ n2 (Heading)
 *          └─ n3 (Text)
 *               └─ n4 (Button)
 */
function treeDoc() {
  return makeDocument([
    { id: ROOT_ID, type: "Page", props: {}, slots: { children: [N1] } },
    { id: N1, type: "Section", props: {}, slots: { children: [N2, N3] } },
    { id: N2, type: "Heading", props: {}, slots: {} },
    { id: N3, type: "Text", props: {}, slots: { children: [N4] } },
    { id: N4, type: "Button", props: {}, slots: {} },
  ]);
}

// ---------------------------------------------------------------------------
// parentOf
// ---------------------------------------------------------------------------

describe("parentOf", () => {
  it("returns null for the root", () => {
    expect(parentOf(treeDoc(), ROOT_ID)).toBeNull();
  });

  it("returns correct parent", () => {
    expect(parentOf(treeDoc(), N1)).toBe(ROOT_ID);
    expect(parentOf(treeDoc(), N2)).toBe(N1);
    expect(parentOf(treeDoc(), N4)).toBe(N3);
  });
});

// ---------------------------------------------------------------------------
// slotOf
// ---------------------------------------------------------------------------

describe("slotOf", () => {
  it("returns null for root", () => {
    expect(slotOf(treeDoc(), ROOT_ID)).toBeNull();
  });

  it("returns correct slot and index", () => {
    expect(slotOf(treeDoc(), N2)).toEqual({ parent: N1, slot: "children", index: 0 });
    expect(slotOf(treeDoc(), N3)).toEqual({ parent: N1, slot: "children", index: 1 });
    expect(slotOf(treeDoc(), N4)).toEqual({ parent: N3, slot: "children", index: 0 });
  });
});

// ---------------------------------------------------------------------------
// ancestors
// ---------------------------------------------------------------------------

describe("ancestors", () => {
  it("returns empty array for root", () => {
    expect(ancestors(treeDoc(), ROOT_ID)).toEqual([]);
  });

  it("returns single-element array for direct root child", () => {
    expect(ancestors(treeDoc(), N1)).toEqual([ROOT_ID]);
  });

  it("returns full ancestor chain in root→parent order", () => {
    // n4: root → n1 → n3
    expect(ancestors(treeDoc(), N4)).toEqual([ROOT_ID, N1, N3]);
  });
});

// ---------------------------------------------------------------------------
// pathTo
// ---------------------------------------------------------------------------

describe("pathTo", () => {
  it("returns [root] for root itself", () => {
    expect(pathTo(treeDoc(), ROOT_ID)).toEqual([ROOT_ID]);
  });

  it("returns full path including node itself", () => {
    expect(pathTo(treeDoc(), N4)).toEqual([ROOT_ID, N1, N3, N4]);
  });
});

// ---------------------------------------------------------------------------
// descendants
// ---------------------------------------------------------------------------

describe("descendants", () => {
  it("returns empty for a leaf node", () => {
    expect(descendants(treeDoc(), N2)).toEqual([]);
    expect(descendants(treeDoc(), N4)).toEqual([]);
  });

  it("returns direct children for shallow node", () => {
    // N3 has only n4
    expect(descendants(treeDoc(), N3)).toEqual([N4]);
  });

  it("returns all subtree nodes in DFS preorder", () => {
    // n1 subtree: n2, n3, n4
    expect(descendants(treeDoc(), N1)).toEqual([N2, N3, N4]);
  });

  it("returns all non-root nodes for root", () => {
    const doc = treeDoc();
    const desc = descendants(doc, ROOT_ID);
    expect(new Set(desc)).toEqual(new Set([N1, N2, N3, N4]));
    expect(desc.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// siblings
// ---------------------------------------------------------------------------

describe("siblings", () => {
  it("returns empty for root", () => {
    expect(siblings(treeDoc(), ROOT_ID)).toEqual([]);
  });

  it("returns empty for a single child", () => {
    // N1 is the only child of root
    expect(siblings(treeDoc(), N1)).toEqual([]);
  });

  it("returns other children in the same slot", () => {
    // N2 and N3 are siblings
    expect(siblings(treeDoc(), N2)).toEqual([N3]);
    expect(siblings(treeDoc(), N3)).toEqual([N2]);
  });
});

// ---------------------------------------------------------------------------
// allNodeIds
// ---------------------------------------------------------------------------

describe("allNodeIds", () => {
  it("returns [ROOT_ID] for EMPTY_DOCUMENT", () => {
    expect(allNodeIds(EMPTY_DOCUMENT)).toEqual([ROOT_ID]);
  });

  it("returns all node ids in DFS preorder starting from root", () => {
    const ids = allNodeIds(treeDoc());
    expect(ids[0]).toBe(ROOT_ID);
    expect(new Set(ids)).toEqual(new Set([ROOT_ID, N1, N2, N3, N4]));
    expect(ids.length).toBe(5);
    // DFS preorder: root, n1, n2, n3, n4
    expect(ids).toEqual([ROOT_ID, N1, N2, N3, N4]);
  });
});

// ---------------------------------------------------------------------------
// subtreeSize
// ---------------------------------------------------------------------------

describe("subtreeSize", () => {
  it("returns 1 for a leaf node", () => {
    expect(subtreeSize(treeDoc(), N2)).toBe(1);
    expect(subtreeSize(treeDoc(), N4)).toBe(1);
  });

  it("returns correct count including the node itself", () => {
    expect(subtreeSize(treeDoc(), N3)).toBe(2); // n3 + n4
    expect(subtreeSize(treeDoc(), N1)).toBe(4); // n1 + n2 + n3 + n4
    expect(subtreeSize(treeDoc(), ROOT_ID)).toBe(5); // all 5 nodes
  });
});
