import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { makeTreeDoc, stubRegistry, ids } from "../helpers.js";

describe("unwrap-node", () => {
  it("happy path — unwraps a wrapper with one child", () => {
    const doc = makeTreeDoc();
    // n1 has exactly one child: child1. Unwrapping n1 should put child1 in root.
    const result = executeCommand(doc, stubRegistry, "unwrap-node", { id: ids.n1 });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;

    // n1 should no longer exist
    expect(updated.nodes[ids.n1]).toBeUndefined();
    // child1 should now be in root's children at n1's old position
    expect(updated.nodes[ids.root]?.slots["children"]).toContain(ids.child1);
  });

  it("fails when node does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "unwrap-node", { id: "ghost" });
    expect(result.isErr()).toBe(true);
  });

  it("fails when trying to unwrap root", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "unwrap-node", { id: ids.root });
    expect(result.isErr()).toBe(true);
  });

  it("fails when node has more than one child", () => {
    // root has two children (n1, n2) — cannot unwrap
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "unwrap-node", { id: ids.root });
    expect(result.isErr()).toBe(true);
  });

  it("fails when node has no children", () => {
    // child1 has no children
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "unwrap-node", { id: ids.child1 });
    expect(result.isErr()).toBe(true);
  });
});
