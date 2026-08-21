import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { emptyDoc, makeTreeDoc, stubRegistry, ids } from "../helpers.js";

describe("insert-node", () => {
  it("happy path — appends node to root children", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "children",
      index: -1,
      type: "Text",
      id: "t1",
    });
    expect(result.isOk()).toBe(true);
    const doc = result._unsafeUnwrap().doc;
    expect(doc.nodes["t1"]).toMatchObject({ type: "Text", id: "t1" });
    expect(doc.nodes[ids.root]?.slots["children"]).toContain("t1");
  });

  it("inserts at specific index", () => {
    const doc = makeTreeDoc();
    const result = executeCommand(doc, stubRegistry, "insert-node", {
      parentId: ids.root,
      slot: "children",
      index: 0,
      type: "Heading",
      id: "h1",
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect(updated.nodes[ids.root]?.slots["children"]?.[0]).toBe("h1");
  });

  it("creates a new slot if it doesn't exist", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "header",
      index: -1,
      type: "Nav",
      id: "nav1",
    });
    expect(result.isOk()).toBe(true);
    const doc = result._unsafeUnwrap().doc;
    expect(doc.nodes[ids.root]?.slots["header"]).toContain("nav1");
  });

  it("generates an id when not provided", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "children",
      index: -1,
      type: "Text",
    });
    expect(result.isOk()).toBe(true);
    const doc = result._unsafeUnwrap().doc;
    const children = doc.nodes[ids.root]?.slots["children"] ?? [];
    expect(children.length).toBe(1);
    expect(children[0]).toBeTruthy();
  });

  it("sets initial props", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "children",
      index: -1,
      type: "Heading",
      id: "h2",
      props: { level: 1, text: "Hello" },
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().doc.nodes["h2"]?.props).toMatchObject({ level: 1, text: "Hello" });
  });

  it("fails when parent does not exist", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "ghost",
      slot: "children",
      index: -1,
      type: "Text",
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });

  it("fails when id already exists", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "children",
      index: -1,
      type: "Text",
      id: "root", // root already exists
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });
});
