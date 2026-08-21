import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { makeTreeDoc, stubRegistry, ids } from "../helpers.js";

describe("set-meta", () => {
  it("happy path — sets node name", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "set-meta", {
      id: ids.n1,
      meta: { name: "Hero Section" },
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().doc.nodes[ids.n1]?.meta?.name).toBe("Hero Section");
  });

  it("sets locked flag", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "set-meta", {
      id: ids.n1,
      meta: { locked: true },
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().doc.nodes[ids.n1]?.meta?.locked).toBe(true);
  });

  it("sets hidden flag", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "set-meta", {
      id: ids.n1,
      meta: { hidden: true },
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().doc.nodes[ids.n1]?.meta?.hidden).toBe(true);
  });

  it("merges meta — does not reset existing fields", () => {
    const doc = makeTreeDoc();

    // First set name
    const r1 = executeCommand(doc, stubRegistry, "set-meta", {
      id: ids.n1,
      meta: { name: "Original" },
    });
    expect(r1.isOk()).toBe(true);

    // Then set locked — name should still be there
    const r2 = executeCommand(r1._unsafeUnwrap().doc, stubRegistry, "set-meta", {
      id: ids.n1,
      meta: { locked: true },
    });
    expect(r2.isOk()).toBe(true);
    const node = r2._unsafeUnwrap().doc.nodes[ids.n1];
    expect(node?.meta?.name).toBe("Original");
    expect(node?.meta?.locked).toBe(true);
  });

  it("fails when node does not exist", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "set-meta", {
      id: "ghost",
      meta: { name: "Ghost" },
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });
});
