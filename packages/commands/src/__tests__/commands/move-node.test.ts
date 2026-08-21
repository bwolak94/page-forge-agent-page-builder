import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { makeTreeDoc, stubRegistry, ids } from "../helpers.js";

describe("move-node", () => {
  it("happy path — moves a node to a different parent", () => {
    const doc = makeTreeDoc();
    // Move child1 (under n1) to n2's children
    const result = executeCommand(doc, stubRegistry, "move-node", {
      id: ids.child1,
      parentId: ids.n2,
      slot: "children",
      index: -1,
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect(updated.nodes[ids.n1]?.slots["children"]).not.toContain(ids.child1);
    expect(updated.nodes[ids.n2]?.slots["children"]).toContain(ids.child1);
  });

  it("moves to specific index", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "move-node", {
      id: ids.n2,
      parentId: ids.root,
      slot: "children",
      index: 0,
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect(updated.nodes[ids.root]?.slots["children"]?.[0]).toBe(ids.n2);
  });

  it("fails when node does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "move-node", {
      id: "ghost",
      parentId: ids.root,
      slot: "children",
      index: -1,
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });

  it("fails when moving root", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "move-node", {
      id: ids.root,
      parentId: ids.n1,
      slot: "children",
      index: -1,
    });
    expect(result.isErr()).toBe(true);
  });

  it("fails when target parent does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "move-node", {
      id: ids.child1,
      parentId: "ghost",
      slot: "children",
      index: -1,
    });
    expect(result.isErr()).toBe(true);
  });

  it("fails when moving node into its own descendant", () => {
    const doc = makeTreeDoc();
    // n1 contains child1 — can't move n1 into child1
    const result = executeCommand(doc, stubRegistry, "move-node", {
      id: ids.n1,
      parentId: ids.child1,
      slot: "children",
      index: -1,
    });
    expect(result.isErr()).toBe(true);
  });
});
