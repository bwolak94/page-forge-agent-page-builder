import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { makeTreeDoc, stubRegistry, ids } from "../helpers.js";

describe("wrap-node", () => {
  it("happy path — wraps a node inside a new wrapper", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "wrap-node", {
      id: ids.n1,
      wrapperType: "Container",
      slot: "children",
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;

    // Root's children should contain the wrapper, not n1 directly
    const rootChildren = updated.nodes[ids.root]?.slots["children"] ?? [];
    expect(rootChildren).not.toContain(ids.n1);
    expect(rootChildren.length).toBe(2); // wrapper + n2

    // Find the wrapper
    const wrapperId = rootChildren.find(id => id !== ids.n2);
    expect(wrapperId).toBeTruthy();

    const wrapper = updated.nodes[wrapperId!];
    expect(wrapper?.type).toBe("Container");
    expect(wrapper?.slots["children"]).toContain(ids.n1);
  });

  it("preserves the original node's position index", () => {
    const doc = makeTreeDoc(); // root → [n1, n2]
    const result = executeCommand(doc, stubRegistry, "wrap-node", {
      id: ids.n2,
      wrapperType: "Box",
      slot: "children",
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    // n2 was at index 1, wrapper should be at index 1
    expect(updated.nodes[ids.root]?.slots["children"]?.[0]).toBe(ids.n1);
  });

  it("fails when node does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "wrap-node", {
      id: "ghost",
      wrapperType: "Container",
      slot: "children",
    });
    expect(result.isErr()).toBe(true);
  });

  it("fails when trying to wrap root", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "wrap-node", {
      id: ids.root,
      wrapperType: "Container",
      slot: "children",
    });
    expect(result.isErr()).toBe(true);
  });
});
