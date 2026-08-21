/**
 * Patch engine — Immer structural patches ↔ RFC 6902 JSON Patch.
 *
 * Responsibilities:
 *  - Convert between Immer's internal `Patch[]` format and the RFC 6902
 *    wire/storage format (`JsonPatch[]`).
 *  - Apply RFC 6902 patches to a Document immutably.
 *  - Invert a patch array for undo replay.
 *  - Serialize/deserialize `PatchSet` for Postgres jsonb storage.
 *
 * Zero IO — no filesystem, network, or DB access.
 *
 * Architecture: Adapter pattern between Immer and RFC 6902.
 * Memento: inverse patches store "before" state without full snapshots.
 */

import {
  applyPatches as immerApplyPatches,
  enableMapSet,
  enablePatches,
  type Patch as ImmerPatch,
} from "immer";

import type { Document, JsonValue } from "./types.js";
import { patchSetSchema } from "./patches.schema.js";

// Enable Immer plugins once at module load (idempotent — safe to call multiple times).
enablePatches();
enableMapSet();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** RFC 6902 JSON Patch operation (wire / storage format). */
export interface JsonPatch {
  readonly op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  /** JSON Pointer, e.g. "/nodes/x7f/props/padding" */
  readonly path: string;
  readonly value?: JsonValue;
  /** Only for op "move" | "copy" */
  readonly from?: string;
}

/**
 * Forward + inverse patches produced by a single command execution.
 * Stored in `document_events.patches` and `document_events.inverse` (jsonb).
 */
export interface PatchSet {
  readonly patches: JsonPatch[];
  readonly inverse: JsonPatch[];
}

/** JSON-safe form ready for `JSON.stringify` / Postgres jsonb. */
export type SerializedPatchSet = {
  patches: unknown[];
  inverse: unknown[];
};

// ---------------------------------------------------------------------------
// Path conversion — RFC 6902 JSON Pointer ↔ Immer string[] path
// ---------------------------------------------------------------------------

/**
 * Encode an Immer path segment using RFC 6902 JSON Pointer escaping:
 *   `~` → `~0`
 *   `/` → `~1`
 */
function encodeSegment(segment: string | number): string {
  return String(segment).replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Decode a single JSON Pointer segment:
 *   `~1` → `/`
 *   `~0` → `~`
 * Numeric-looking segments are kept as strings (Immer handles coercion).
 */
function decodeSegment(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

/** `["nodes", "x7f", "props", "padding"]` → `"/nodes/x7f/props/padding"` */
function immerPathToPointer(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) return "";
  return "/" + path.map(encodeSegment).join("/");
}

/** `"/nodes/x7f/props/padding"` → `["nodes", "x7f", "props", "padding"]` */
function pointerToImmerPath(pointer: string): Array<string | number> {
  if (pointer === "" || pointer === "/") return [];
  const segments = pointer.slice(1).split("/").map(decodeSegment);
  // Convert numeric-looking segments to numbers for array indices
  return segments.map(s => (/^\d+$/.test(s) ? parseInt(s, 10) : s));
}

// ---------------------------------------------------------------------------
// Format conversion — Adapter pattern
// ---------------------------------------------------------------------------

/**
 * Convert Immer's internal `Patch[]` to RFC 6902 `JsonPatch[]`.
 *
 * Immer only generates `add`, `remove`, and `replace` operations.
 * Values are passed through as-is (Immer already produces JSON-safe values).
 */
export function toJsonPatch(immerPatches: ImmerPatch[]): JsonPatch[] {
  return immerPatches.map(p => {
    const base: JsonPatch = {
      op: p.op,
      path: immerPathToPointer(p.path),
    };
    // Only attach value when defined — keeps output clean for remove ops
    if (p.value !== undefined) {
      return { ...base, value: p.value as JsonValue };
    }
    return base;
  });
}

/**
 * Convert RFC 6902 `JsonPatch[]` back to Immer's `Patch[]` format.
 *
 * Note: `move`, `copy`, and `test` operations are not produced by Immer
 * but may appear in patches loaded from storage written by other tools.
 * They are passed through — Immer's `applyPatches` will reject unsupported ops.
 */
export function fromJsonPatch(patches: JsonPatch[]): ImmerPatch[] {
  return patches.map(p => {
    const base: ImmerPatch = {
      op: p.op as ImmerPatch["op"],
      path: pointerToImmerPath(p.path),
    };
    if (p.value !== undefined) {
      return { ...base, value: p.value };
    }
    return base;
  });
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * Apply RFC 6902 patches to a Document immutably.
 *
 * Internally converts to Immer format and uses Immer's `applyPatches`
 * for structural sharing — O(changed nodes), not O(total nodes).
 *
 * The original `doc` is never mutated.
 */
export function applyPatches(doc: Document, patches: JsonPatch[]): Document {
  if (patches.length === 0) return doc;
  const immerPatches = fromJsonPatch(patches);
  return immerApplyPatches(doc, immerPatches);
}

// ---------------------------------------------------------------------------
// Invert
// ---------------------------------------------------------------------------

/**
 * Compute the semantic inverse of a patch array.
 *
 * Rules:
 *   `add`     → `remove`      (remove what was added)
 *   `remove`  → `add`         (re-add what was removed; `value` = removed item)
 *   `replace` → `replace`     (swap back; `value` = old value, already in inverse
 *                               patches Immer produces)
 *
 * The resulting array is reversed so that the last operation's inverse
 * is applied first — correct semantics for undo.
 *
 * Practical note: when `produceWithPatches` is available (i.e., at command
 * execution time), prefer using Immer's own inverse output — it is exact and
 * requires no heuristics. This function is for replaying stored patches when
 * only the forward array is available.
 */
export function invertPatches(patches: JsonPatch[]): JsonPatch[] {
  return [...patches]
    .reverse()
    .map(p => {
      switch (p.op) {
        case "add":
          return { op: "remove" as const, path: p.path };
        case "remove":
          return { op: "add" as const, path: p.path, value: p.value };
        case "replace":
          // value contains the OLD value (Immer inverse patches store it there)
          return { op: "replace" as const, path: p.path, value: p.value };
        case "move":
          // Invert move: swap path ↔ from
          return { op: "move" as const, path: p.from!, from: p.path };
        default:
          // copy and test have no meaningful inverse — return unchanged
          return p;
      }
    });
}

// ---------------------------------------------------------------------------
// Serialization / deserialization
// ---------------------------------------------------------------------------

/**
 * Prepare a `PatchSet` for Postgres jsonb storage or JSON.stringify.
 * Output is a plain JS object with no undefined values.
 */
export function serializePatchSet(ps: PatchSet): SerializedPatchSet {
  return {
    patches: ps.patches.map(p => {
      const obj: Record<string, unknown> = { op: p.op, path: p.path };
      if (p.value !== undefined) obj["value"] = p.value;
      if (p.from !== undefined) obj["from"] = p.from;
      return obj;
    }),
    inverse: ps.inverse.map(p => {
      const obj: Record<string, unknown> = { op: p.op, path: p.path };
      if (p.value !== undefined) obj["value"] = p.value;
      if (p.from !== undefined) obj["from"] = p.from;
      return obj;
    }),
  };
}

/**
 * Deserialize a raw DB row value into a typed `PatchSet`.
 * Validates with Zod — throws `ZodError` on malformed input.
 */
export function deserializePatchSet(raw: unknown): PatchSet {
  return patchSetSchema.parse(raw);
}
