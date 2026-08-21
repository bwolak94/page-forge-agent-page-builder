import { describe, it, expect } from "vitest";
import { UndoStack } from "../../src/undo-stack.js";
import { executeCommand } from "../../src/executor.js";
import { emptyDoc, stubRegistry } from "./helpers.js";

describe("UndoStack", () => {
  it("canUndo is false on empty stack", () => {
    const stack = new UndoStack();
    expect(stack.canUndo).toBe(false);
  });

  it("canUndo is true after push", () => {
    const stack = new UndoStack();
    stack.push([{ op: "replace", path: "/nodes/root/props/title", value: "old" }]);
    expect(stack.canUndo).toBe(true);
  });

  it("undo returns null on empty stack", () => {
    const stack = new UndoStack();
    expect(stack.undo(emptyDoc)).toBeNull();
  });

  it("undo restores previous state after a command", () => {
    const stack = new UndoStack();

    const result = executeCommand(emptyDoc, stubRegistry, "insert-node", {
      parentId: "root",
      slot: "children",
      index: -1,
      type: "Text",
      id: "undo1",
    });
    expect(result.isOk()).toBe(true);
    const { doc: after, inverse } = result._unsafeUnwrap();

    stack.push(inverse);
    expect(stack.canUndo).toBe(true);

    const undoResult = stack.undo(after);
    expect(undoResult).not.toBeNull();
    expect(undoResult!.doc).toEqual(emptyDoc);
    expect(stack.canUndo).toBe(false);
  });

  it("size reflects number of pushed entries", () => {
    const stack = new UndoStack();
    stack.push([{ op: "add", path: "/nodes/x", value: {} }]);
    stack.push([{ op: "add", path: "/nodes/y", value: {} }]);
    expect(stack.size).toBe(2);
  });

  it("does not push empty inverse arrays", () => {
    const stack = new UndoStack();
    stack.push([]);
    expect(stack.canUndo).toBe(false);
    expect(stack.size).toBe(0);
  });

  it("clear empties the stack", () => {
    const stack = new UndoStack();
    stack.push([{ op: "replace", path: "/foo", value: 1 }]);
    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.size).toBe(0);
  });

  it("respects the limit — oldest entries are dropped", () => {
    const stack = new UndoStack(3);
    for (let i = 0; i < 5; i++) {
      stack.push([{ op: "replace", path: `/nodes/n${i}`, value: i }]);
    }
    expect(stack.size).toBe(3);
  });

  it("multiple undos in sequence", () => {
    const stack = new UndoStack();
    let doc = emptyDoc;
    const docs: typeof emptyDoc[] = [doc];

    for (let i = 0; i < 3; i++) {
      const res = executeCommand(doc, stubRegistry, "insert-node", {
        parentId: "root",
        slot: "children",
        index: -1,
        type: "Text",
        id: `node${i}`,
      });
      expect(res.isOk()).toBe(true);
      const { doc: next, inverse } = res._unsafeUnwrap();
      stack.push(inverse);
      doc = next;
      docs.push(doc);
    }

    // Undo 3 times
    for (let i = 2; i >= 0; i--) {
      const undoResult = stack.undo(doc);
      expect(undoResult).not.toBeNull();
      doc = undoResult!.doc;
    }
    expect(doc).toEqual(emptyDoc);
  });
});
