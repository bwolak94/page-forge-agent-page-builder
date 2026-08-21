import { describe, it, expect } from "vitest";
import { executeCommand } from "../../src/executor.js";
import { validateDocument } from "@pageforge/ir";
import { emptyDoc, makeTreeDoc, stubRegistry, ids } from "./helpers.js";

describe("executeCommand — pipeline", () => {
  it("returns UNKNOWN_COMMAND for unregistered kind", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "nonexistent", {});
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("UNKNOWN_COMMAND");
  });

  it("returns VALIDATION_FAILED when Zod parse fails", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "", // empty string violates nodeIdSchema min(1)
      slot: "children",
      index: 0,
      type: "Text",
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });

  it("returns VALIDATION_FAILED when domain validate fails", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "nonexistent",
      slot: "children",
      index: 0,
      type: "Text",
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });

  it("returns CommandResult on success", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "children",
      index: -1,
      type: "Text",
      id: "newNode",
    });
    expect(result.isOk()).toBe(true);
    const cr = result._unsafeUnwrap();
    expect(cr.doc.nodes["newNode" as unknown as ReturnType<typeof ids.root>]).toBeDefined();
    expect(cr.patches.length).toBeGreaterThan(0);
    expect(cr.inverse.length).toBeGreaterThan(0);
  });

  it("post-condition: returned doc always satisfies validateDocument", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "children",
      index: 0,
      type: "Heading",
      id: "h1",
    });
    expect(result.isOk()).toBe(true);
    expect(validateDocument(result._unsafeUnwrap().doc).isOk()).toBe(true);
  });

  it("affected contains the mutated node IDs", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "children",
      index: 0,
      type: "Text",
      id: "affected1",
    });
    expect(result.isOk()).toBe(true);
    const { affected } = result._unsafeUnwrap();
    expect(affected).toContain("root");
    expect(affected).toContain("affected1");
  });

  it("does not mutate the original document", () => {
    const doc = makeTreeDoc();
    const original = JSON.parse(JSON.stringify(doc));
    executeCommand(doc, stubRegistry, "update-props", {
      id: ids.n1,
      patch: { text: "changed" },
    });
    expect(doc).toEqual(original);
  });
});
