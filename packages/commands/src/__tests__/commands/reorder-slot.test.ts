import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { makeTreeDoc, stubRegistry, ids } from "../helpers.js";

describe("reorder-slot", () => {
  it("happy path — swaps two children", () => {
    const doc = makeTreeDoc(); // root.children = [n1, n2]
    const result = executeCommand(doc, stubRegistry, "reorder-slot", {
      parentId: ids.root,
      slot: "children",
      fromIndex: 0,
      toIndex: 1,
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    const children = updated.nodes[ids.root]?.slots["children"] ?? [];
    expect(children[0]).toBe(ids.n2);
    expect(children[1]).toBe(ids.n1);
  });

  it("fails when parent does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "reorder-slot", {
      parentId: "ghost",
      slot: "children",
      fromIndex: 0,
      toIndex: 1,
    });
    expect(result.isErr()).toBe(true);
  });

  it("fails when slot does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "reorder-slot", {
      parentId: ids.root,
      slot: "nonexistent",
      fromIndex: 0,
      toIndex: 1,
    });
    expect(result.isErr()).toBe(true);
  });

  it("fails when fromIndex is out of bounds", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "reorder-slot", {
      parentId: ids.root,
      slot: "children",
      fromIndex: 99,
      toIndex: 0,
    });
    expect(result.isErr()).toBe(true);
  });

  it("fails when toIndex is out of bounds", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "reorder-slot", {
      parentId: ids.root,
      slot: "children",
      fromIndex: 0,
      toIndex: 99,
    });
    expect(result.isErr()).toBe(true);
  });

  it("fails when fromIndex equals toIndex", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "reorder-slot", {
      parentId: ids.root,
      slot: "children",
      fromIndex: 0,
      toIndex: 0,
    });
    expect(result.isErr()).toBe(true);
  });
});
