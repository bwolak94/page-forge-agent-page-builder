import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { makeTreeDoc, stubRegistry, ids } from "../helpers.js";

describe("update-props", () => {
  it("happy path — merges new props", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "update-props", {
      id: ids.child1,
      patch: { text: "updated", bold: true },
    });
    expect(result.isOk()).toBe(true);
    const node = result._unsafeUnwrap().doc.nodes[ids.child1];
    expect(node?.props["text"]).toBe("updated");
    expect(node?.props["bold"]).toBe(true);
    // Original props not mentioned in patch are preserved
    expect(node?.props["text"]).toBe("updated");
  });

  it("preserves props not mentioned in patch", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "update-props", {
      id: ids.child1,
      patch: { bold: true },
    });
    expect(result.isOk()).toBe(true);
    const node = result._unsafeUnwrap().doc.nodes[ids.child1];
    expect(node?.props["text"]).toBe("hello"); // original preserved
    expect(node?.props["bold"]).toBe(true);    // new prop added
  });

  it("deletes a prop when value is undefined", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "update-props", {
      id: ids.child1,
      patch: { text: undefined },
    });
    expect(result.isOk()).toBe(true);
    const node = result._unsafeUnwrap().doc.nodes[ids.child1];
    expect("text" in (node?.props ?? {})).toBe(false);
  });

  it("fails when node does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "update-props", {
      id: "ghost",
      patch: { text: "x" },
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });
});
