import { describe, it, expect } from "vitest";
import { createDefaultProps, createDefaultNode } from "../../src/defaults.js";
import { REGISTRY } from "../../src/registry.js";

describe("createDefaultProps", () => {
  for (const [type, def] of Object.entries(REGISTRY)) {
    it(`${type} defaults pass propsSchema.parse()`, () => {
      const defaults = createDefaultProps(type);
      expect(() => def.propsSchema.parse(defaults)).not.toThrow();
    });
  }

  it("throws for unknown type", () => {
    expect(() => createDefaultProps("NonExistent")).toThrow();
  });
});

describe("createDefaultNode", () => {
  it("returns a node with a non-empty id", () => {
    const node = createDefaultNode("Heading");
    expect(node.id).toBeTruthy();
    expect(node.type).toBe("Heading");
  });

  it("initialises empty slot arrays from component def", () => {
    // Card has header, body, footer slots
    const node = createDefaultNode("Card");
    expect(node.slots["header"]).toEqual([]);
    expect(node.slots["body"]).toEqual([]);
    expect(node.slots["footer"]).toEqual([]);
  });

  it("returns an empty slots object for leaf components", () => {
    const node = createDefaultNode("Button");
    expect(node.slots).toEqual({});
  });

  it("generates unique IDs per call", () => {
    const a = createDefaultNode("Text");
    const b = createDefaultNode("Text");
    expect(a.id).not.toBe(b.id);
  });

  it("props match component schema defaults", () => {
    const node = createDefaultNode("Heading");
    expect(node.props["level"]).toBe(2);
    expect(node.props["text"]).toBe("");
    expect(node.props["align"]).toBe("left");
  });

  it("throws for unknown type", () => {
    expect(() => createDefaultNode("NonExistent")).toThrow();
  });
});
