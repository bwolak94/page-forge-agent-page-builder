/**
 * Zod schemas for the patch wire/storage format.
 *
 * Separate from schemas.ts to keep the main schema file clean and because
 * these are used by patches.ts (circular-import safe since Zod is a dep
 * of packages/ir already).
 */

import { z } from "zod";
import type { JsonPatch, PatchSet } from "./patches.js";

// ---------------------------------------------------------------------------
// JsonPatch
// ---------------------------------------------------------------------------

const jsonPatchOpSchema = z.enum(["add", "remove", "replace", "move", "copy", "test"]);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

export const jsonPatchSchema: z.ZodType<JsonPatch> = z.object({
  op: jsonPatchOpSchema,
  path: z.string().startsWith("/", { message: "JSON Pointer must start with /" }),
  value: jsonValueSchema.optional(),
  from: z.string().optional(),
}) as z.ZodType<JsonPatch>;

// ---------------------------------------------------------------------------
// PatchSet
// ---------------------------------------------------------------------------

export const patchSetSchema: z.ZodType<PatchSet> = z.object({
  patches: z.array(jsonPatchSchema),
  inverse: z.array(jsonPatchSchema),
}) as z.ZodType<PatchSet>;
