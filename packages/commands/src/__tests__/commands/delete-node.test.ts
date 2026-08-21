import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { makeTreeDoc, makeLockedDoc, stubRegistry, ids } from "../helpers.js";

describe("delete-node", () => {
  it("happy path — deletes a leaf node", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "delete-node", { id: ids.child1 });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect(updated.nodes[ids.child1]).toBeUndefined();
    expect(updated.nodes[ids.n1]?.slots["children"]).not.toContain(ids.child1);
  });

  it("deletes a subtree — removes node and all descendants", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "delete-node", { id: ids.n1 });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect(updated.nodes[ids.n1]).toBeUndefined();
    expect(updated.nodes[ids.child1]).toBeUndefined();
    expect(updated.nodes[ids.root]?.slots["children"]).not.toContain(ids.n1);
  });

  it("fails when node does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "delete-node", { id: "ghost" });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });

  it("fails when trying to delete root", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "delete-node", { id: ids.root });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });

  it("fails when node is locked", () => {
    const doc = makeLockedDoc();
    const result = executeCommand(doc, stubRegistry, "delete-node", { id: ids.locked });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });
});
