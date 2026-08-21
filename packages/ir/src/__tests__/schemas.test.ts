import { describe, it, expect } from "vitest";
import {
  documentSchema,
  docNodeSchema,
  nodeIdSchema,
  themeTokensSchema,
  jsonPatchSchema,
} from "../schemas.js";
import { EMPTY_DOCUMENT, DEFAULT_THEME } from "../constants.js";

// ---------------------------------------------------------------------------
// nodeIdSchema
// ---------------------------------------------------------------------------

describe("nodeIdSchema", () => {
  it("accepts a non-empty string", () => {
    expect(nodeIdSchema.parse("abc123")).toBe("abc123");
  });

  it("rejects an empty string", () => {
    expect(() => nodeIdSchema.parse("")).toThrow();
  });

  it("rejects non-string input", () => {
    expect(() => nodeIdSchema.parse(123)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// docNodeSchema
// ---------------------------------------------------------------------------

describe("docNodeSchema", () => {
  it("parses a valid node", () => {
    const result = docNodeSchema.safeParse({
      id: "n1",
      type: "Heading",
      props: { level: 1, text: "Hello" },
      slots: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects a node with empty type", () => {
    const result = docNodeSchema.safeParse({ id: "n1", type: "", props: {}, slots: {} });
    expect(result.success).toBe(false);
  });

  it("rejects a node with empty id", () => {
    const result = docNodeSchema.safeParse({ id: "", type: "Heading", props: {}, slots: {} });
    expect(result.success).toBe(false);
  });

  it("accepts nested json values in props", () => {
    const result = docNodeSchema.safeParse({
      id: "n1",
      type: "FAQ",
      props: { items: [{ question: "Q?", answer: "A." }] },
      slots: {},
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// documentSchema
// ---------------------------------------------------------------------------

describe("documentSchema", () => {
  it("parses EMPTY_DOCUMENT without errors", () => {
    const result = documentSchema.safeParse(EMPTY_DOCUMENT);
    expect(result.success).toBe(true);
  });

  it("rejects a document with schemaVersion 0", () => {
    const result = documentSchema.safeParse({ ...EMPTY_DOCUMENT, schemaVersion: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a document missing the root field", () => {
    const { root: _r, ...withoutRoot } = EMPTY_DOCUMENT;
    const result = documentSchema.safeParse(withoutRoot);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// themeTokensSchema
// ---------------------------------------------------------------------------

describe("themeTokensSchema", () => {
  it("parses DEFAULT_THEME", () => {
    expect(themeTokensSchema.safeParse(DEFAULT_THEME).success).toBe(true);
  });

  it("requires fonts.sans", () => {
    const bad = { ...DEFAULT_THEME, fonts: { ...DEFAULT_THEME.fonts, sans: "" } };
    expect(themeTokensSchema.safeParse(bad).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// jsonPatchSchema
// ---------------------------------------------------------------------------

describe("jsonPatchSchema", () => {
  it("parses a replace patch", () => {
    const result = jsonPatchSchema.safeParse({
      op: "replace",
      path: "/nodes/n1/props/text",
      value: "Hello",
    });
    expect(result.success).toBe(true);
  });

  it("parses an add patch", () => {
    const result = jsonPatchSchema.safeParse({ op: "add", path: "/nodes/n99", value: {} });
    expect(result.success).toBe(true);
  });

  it("rejects a patch with unknown op", () => {
    const result = jsonPatchSchema.safeParse({ op: "update", path: "/foo", value: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects a patch whose path does not start with /", () => {
    const result = jsonPatchSchema.safeParse({ op: "replace", path: "nodes/n1", value: 1 });
    expect(result.success).toBe(false);
  });
});
