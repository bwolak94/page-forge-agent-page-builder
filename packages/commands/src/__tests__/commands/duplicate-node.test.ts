import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { validateDocument } from "@pageforge/ir";
import { makeTreeDoc, stubRegistry, ids } from "../helpers.js";

describe("duplicate-node", () => {
  it("happy path — duplicates a leaf node after original", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "duplicate-node", { id: ids.child1 });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;

    const children = updated.nodes[ids.n1]?.slots["children"] ?? [];
    expect(children.length).toBe(2); // original + clone
    const cloneId = children[1];
    expect(cloneId).not.toBe(ids.child1);
    expect(updated.nodes[cloneId!]?.type).toBe("Text");
  });

  it("clones subtree with fresh ids — original ids unchanged", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "duplicate-node", { id: ids.n1 });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;

    // The original n1 and child1 must still exist
    expect(updated.nodes[ids.n1]).toBeDefined();
    expect(updated.nodes[ids.child1]).toBeDefined();

    // A new node must have been created
    const rootChildren = updated.nodes[ids.root]?.slots["children"] ?? [];
    expect(rootChildren.length).toBe(3); // n1, clone-of-n1, n2
  });

  it("invariants hold after duplication", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "duplicate-node", { id: ids.n1 });
    expect(result.isOk()).toBe(true);
    expect(validateDocument(result._unsafeUnwrap().doc).isOk()).toBe(true);
  });

  it("supports explicit target parent and slot", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "duplicate-node", {
      id: ids.child1,
      targetParentId: ids.n2,
      targetSlot: "children",
      targetIndex: -1,
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect((updated.nodes[ids.n2]?.slots["children"] ?? []).length).toBe(2);
  });

  it("fails when node does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "duplicate-node", { id: "ghost" });
    expect(result.isErr()).toBe(true);
  });

  it("fails when target parent does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "duplicate-node", {
      id: ids.child1,
      targetParentId: "ghost",
    });
    expect(result.isErr()).toBe(true);
  });

  it("fails when trying to duplicate root", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "duplicate-node", { id: ids.root });
    expect(result.isErr()).toBe(true);
  });
});
