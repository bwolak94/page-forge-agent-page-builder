/**
 * Unit tests for the patch engine.
 *
 * Covers: toJsonPatch / fromJsonPatch round-trips, applyPatches immutability,
 * invertPatches correctness, and serializePatchSet / deserializePatchSet.
 */

import { describe, it, expect } from "vitest";
import { produceWithPatches } from "immer";
import type { Draft } from "immer";
import {
  toJsonPatch,
  fromJsonPatch,
  applyPatches,
  invertPatches,
  serializePatchSet,
  deserializePatchSet,
} from "../patches.js";
import type { JsonPatch } from "../patches.js";
import { EMPTY_DOCUMENT, ROOT_ID } from "../constants.js";
import { nodeId } from "../types.js";
import type { Document } from "../types.js";
import { makeDocument } from "../normalize.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const N1 = nodeId("n1");

function docWithNode(): Document {
  return makeDocument([
    { id: ROOT_ID, type: "Page", props: { title: "Test" }, slots: { children: [N1] } },
    { id: N1, type: "Heading", props: { level: 1, text: "Hello" }, slots: {} },
  ]);
}

// ---------------------------------------------------------------------------
// toJsonPatch / fromJsonPatch — format conversion
// ---------------------------------------------------------------------------

describe("toJsonPatch", () => {
  it("converts Immer replace to RFC 6902", () => {
    const [, patches] = produceWithPatches(EMPTY_DOCUMENT, (draft: Draft<Document>) => {
      draft.theme.colors["primary"] = "#ff0000";
    });
    const json = toJsonPatch(patches);
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({
      op: "replace",
      path: "/theme/colors/primary",
      value: "#ff0000",
    });
  });

  it("converts Immer add (new object key) correctly", () => {
    const [, patches] = produceWithPatches(EMPTY_DOCUMENT, (draft: Draft<Document>) => {
      draft.theme.colors["accent2"] = "purple";
    });
    const json = toJsonPatch(patches);
    expect(json.some(p => p.path.includes("accent2"))).toBe(true);
  });

  it("encodes segments with special characters", () => {
    // Path with ~ and / in a key name
    const [, patches] = produceWithPatches(
      { ...EMPTY_DOCUMENT, theme: { ...EMPTY_DOCUMENT.theme, colors: { "a~b/c": "red" } } },
      (draft: Draft<Document>) => {
        draft.theme.colors["a~b/c"] = "blue";
      }
    );
    const json = toJsonPatch(patches);
    // ~ → ~0, / → ~1
    expect(json[0]?.path).toContain("~0");
    expect(json[0]?.path).toContain("~1");
  });

  it("produces no value field for remove ops", () => {
    const doc = docWithNode();
    const [, patches] = produceWithPatches(doc, (draft: Draft<Document>) => {
      delete draft.nodes[N1]?.props["text"];
    });
    // find a remove op if present
    const removeOp = toJsonPatch(patches).find(p => p.op === "remove");
    if (removeOp) {
      expect("value" in removeOp).toBe(false);
    }
  });
});

describe("fromJsonPatch", () => {
  it("converts RFC 6902 path to Immer path array", () => {
    const patches: JsonPatch[] = [{ op: "replace", path: "/theme/colors/primary", value: "#ff0000" }];
    const immer = fromJsonPatch(patches);
    expect(immer[0]?.path).toEqual(["theme", "colors", "primary"]);
  });

  it("converts array indices to numbers", () => {
    const patches: JsonPatch[] = [{ op: "replace", path: "/breakpoints/0/label", value: "XS" }];
    const immer = fromJsonPatch(patches);
    expect(immer[0]?.path).toEqual(["breakpoints", 0, "label"]);
  });

  it("decodes special characters in segments", () => {
    const patches: JsonPatch[] = [{ op: "replace", path: "/theme/colors/a~0b~1c", value: "x" }];
    const immer = fromJsonPatch(patches);
    expect(immer[0]?.path).toEqual(["theme", "colors", "a~b/c"]);
  });
});

describe("toJsonPatch / fromJsonPatch round-trip", () => {
  it("round-trips Immer patches through RFC 6902 and back", () => {
    const [, patches] = produceWithPatches(EMPTY_DOCUMENT, (draft: Draft<Document>) => {
      draft.theme.colors["primary"] = "#3b82f6";
    });
    const json = toJsonPatch(patches);
    const restored = fromJsonPatch(json);
    expect(restored).toEqual(patches);
  });

  it("round-trips a multi-segment path with an integer index", () => {
    const [, patches] = produceWithPatches(EMPTY_DOCUMENT, (draft: Draft<Document>) => {
      draft.breakpoints[0]!.label = "XS";
    });
    const json = toJsonPatch(patches);
    const restored = fromJsonPatch(json);
    expect(restored[0]?.path).toEqual(patches[0]?.path);
  });
});

// ---------------------------------------------------------------------------
// applyPatches — immutability + correctness
// ---------------------------------------------------------------------------

describe("applyPatches", () => {
  it("applies a replace patch and returns a new document", () => {
    const before = EMPTY_DOCUMENT;
    const patches: JsonPatch[] = [{ op: "replace", path: "/theme/colors/primary", value: "#ff0000" }];
    const after = applyPatches(before, patches);

    expect(after.theme.colors["primary"]).toBe("#ff0000");
    expect(before.theme.colors["primary"]).not.toBe("#ff0000"); // original unchanged
    expect(after).not.toBe(before); // new reference
  });

  it("leaves the document unchanged when patches is empty", () => {
    const result = applyPatches(EMPTY_DOCUMENT, []);
    expect(result).toBe(EMPTY_DOCUMENT); // same reference — no work done
  });

  it("applies a nested prop change", () => {
    const doc = docWithNode();
    const [, patches] = produceWithPatches(doc, (draft: Draft<Document>) => {
      draft.nodes[N1]!.props["level"] = 2;
    });
    const json = toJsonPatch(patches);
    const after = applyPatches(doc, json);

    expect(after.nodes[N1]?.props["level"]).toBe(2);
    expect(doc.nodes[N1]?.props["level"]).toBe(1); // original unchanged
  });

  it("applies multiple patches in sequence", () => {
    const doc = EMPTY_DOCUMENT;
    const patches: JsonPatch[] = [
      { op: "replace", path: "/theme/colors/primary", value: "blue" },
      { op: "replace", path: "/theme/colors/secondary", value: "green" },
    ];
    const after = applyPatches(doc, patches);
    expect(after.theme.colors["primary"]).toBe("blue");
    expect(after.theme.colors["secondary"]).toBe("green");
  });
});

// ---------------------------------------------------------------------------
// invertPatches
// ---------------------------------------------------------------------------

describe("invertPatches", () => {
  it("inverts add → remove", () => {
    const patch: JsonPatch = { op: "add", path: "/nodes/n99", value: { id: "n99" } };
    const [inv] = invertPatches([patch]);
    expect(inv?.op).toBe("remove");
    expect(inv?.path).toBe("/nodes/n99");
    expect("value" in (inv ?? {})).toBe(false);
  });

  it("inverts remove → add with value preserved", () => {
    const patch: JsonPatch = { op: "remove", path: "/nodes/n99", value: { id: "n99" } };
    const [inv] = invertPatches([patch]);
    expect(inv?.op).toBe("add");
    expect(inv?.value).toEqual({ id: "n99" });
  });

  it("inverts replace → replace with value preserved", () => {
    const patch: JsonPatch = { op: "replace", path: "/theme/colors/primary", value: "#oldcolor" };
    const [inv] = invertPatches([patch]);
    expect(inv?.op).toBe("replace");
    expect(inv?.value).toBe("#oldcolor");
  });

  it("reverses the order of patches", () => {
    const patches: JsonPatch[] = [
      { op: "replace", path: "/a", value: 1 },
      { op: "replace", path: "/b", value: 2 },
      { op: "replace", path: "/c", value: 3 },
    ];
    const inv = invertPatches(patches);
    expect(inv[0]?.path).toBe("/c");
    expect(inv[1]?.path).toBe("/b");
    expect(inv[2]?.path).toBe("/a");
  });

  it("inverts move → move with swapped path/from", () => {
    const patch: JsonPatch = { op: "move", path: "/b", from: "/a" };
    const [inv] = invertPatches([patch]);
    expect(inv?.op).toBe("move");
    expect(inv?.path).toBe("/a");
    expect(inv?.from).toBe("/b");
  });

  it("returns empty array for empty input", () => {
    expect(invertPatches([])).toEqual([]);
  });

  it("applying forward then inverse restores original via Immer inverses", () => {
    const doc = docWithNode();
    const [, fwdImmer, invImmer] = produceWithPatches(doc, (draft: Draft<Document>) => {
      draft.nodes[N1]!.props["text"] = "World";
    });
    const fwd = toJsonPatch(fwdImmer);
    const inv = toJsonPatch(invImmer);

    const afterFwd = applyPatches(doc, fwd);
    const afterInv = applyPatches(afterFwd, inv);

    expect(afterInv).toEqual(doc);
  });
});

// ---------------------------------------------------------------------------
// serializePatchSet / deserializePatchSet
// ---------------------------------------------------------------------------

describe("serializePatchSet", () => {
  it("produces a plain object with no undefined values", () => {
    const ps = {
      patches: [{ op: "replace" as const, path: "/foo", value: "bar" }],
      inverse: [{ op: "replace" as const, path: "/foo", value: "baz" }],
    };
    const serialized = serializePatchSet(ps);
    const json = JSON.stringify(serialized);
    expect(json).not.toContain("undefined");
    expect(JSON.parse(json)).toEqual(serialized);
  });

  it("omits value and from when not present", () => {
    const ps = {
      patches: [{ op: "remove" as const, path: "/foo" }],
      inverse: [{ op: "add" as const, path: "/foo", value: 42 }],
    };
    const serialized = serializePatchSet(ps);
    const patchObj = serialized.patches[0] as Record<string, unknown>;
    expect("value" in patchObj).toBe(false);
    expect("from" in patchObj).toBe(false);
  });
});

describe("deserializePatchSet", () => {
  it("parses a valid serialized PatchSet", () => {
    const raw = {
      patches: [{ op: "replace", path: "/foo", value: "bar" }],
      inverse: [{ op: "replace", path: "/foo", value: "baz" }],
    };
    const ps = deserializePatchSet(raw);
    expect(ps.patches[0]?.op).toBe("replace");
    expect(ps.inverse[0]?.value).toBe("baz");
  });

  it("throws ZodError on invalid input", () => {
    expect(() => deserializePatchSet({ patches: "bad", inverse: [] })).toThrow();
    expect(() => deserializePatchSet(null)).toThrow();
    expect(() => deserializePatchSet({ patches: [{ op: "bad", path: "/x" }], inverse: [] })).toThrow();
  });

  it("throws when path does not start with /", () => {
    expect(() =>
      deserializePatchSet({ patches: [{ op: "replace", path: "noslash", value: 1 }], inverse: [] })
    ).toThrow();
  });

  it("round-trips through serialize → deserialize", () => {
    const ps = {
      patches: [{ op: "replace" as const, path: "/theme/colors/primary", value: "#abc" }],
      inverse: [{ op: "replace" as const, path: "/theme/colors/primary", value: "#def" }],
    };
    const restored = deserializePatchSet(serializePatchSet(ps));
    expect(restored).toEqual(ps);
  });
});
