/**
 * Zod schemas for all IR types.
 *
 * Single source of truth: `z.infer<typeof documentSchema>` IS `Document`.
 * Used by: validation, command arg parsing, SSE deserialization, migration checks.
 *
 * Zero IO — no imports beyond zod and local types.
 */

import { z } from "zod";
import type { NodeId, Document, DocNode, ThemeTokens, Breakpoint, JsonValue } from "./types.js";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Parses a plain string into a branded NodeId.
 * Input type is `string`; output type is `NodeId`.
 */
export const nodeIdSchema: z.ZodType<NodeId, z.ZodTypeDef, string> = z
  .string()
  .min(1, "NodeId must not be empty")
  .transform(s => s as NodeId);

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

// ---------------------------------------------------------------------------
// NodeMeta
// ---------------------------------------------------------------------------

export const nodeMetaSchema = z.object({
  name: z.string().optional(),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// DocNode
// ---------------------------------------------------------------------------

export const docNodeSchema = z.object({
  id: nodeIdSchema,
  type: z.string().min(1, "Node type must not be empty"),
  props: z.record(jsonValueSchema),
  slots: z.record(z.array(nodeIdSchema)),
  meta: nodeMetaSchema.optional(),
});

// ---------------------------------------------------------------------------
// ThemeTokens
// ---------------------------------------------------------------------------

export const themeTokensSchema = z.object({
  colors: z.record(z.string()),
  spacing: z.record(z.string()),
  radii: z.record(z.string()),
  fonts: z.object({
    sans: z.string().min(1),
    serif: z.string().optional(),
    mono: z.string().optional(),
  }),
  scale: z.record(z.string()),
});

// ---------------------------------------------------------------------------
// Breakpoint
// ---------------------------------------------------------------------------

export const breakpointSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  minWidth: z.number().int().nonnegative(),
});

// ---------------------------------------------------------------------------
// PageEntry
// ---------------------------------------------------------------------------

export const pageEntrySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1),
  root: nodeIdSchema,
});

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const documentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  root: nodeIdSchema,
  nodes: z.record(nodeIdSchema, docNodeSchema),
  theme: themeTokensSchema,
  breakpoints: z.array(breakpointSchema),
  pages: z.record(z.string(), pageEntrySchema),
  activePageId: z.string().min(1),
});

// Note: JsonPatch and PatchSet Zod schemas live in patches.schema.ts
// (they depend on the JsonPatch type from patches.ts to be properly typed).
