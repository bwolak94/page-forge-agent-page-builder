/**
 * Typed postMessage protocol between the parent editor shell and the canvas iframe.
 *
 * All cross-iframe communication goes through this discriminated union.
 * No raw strings — both sides validate with the Zod schemas below.
 */

import { z } from "zod";
import { documentSchema, nodeIdSchema, jsonPatchSchema } from "@pageforge/ir";
import type { NodeId, JsonPatch, Document } from "@pageforge/ir";

export type { NodeId, JsonPatch, Document };

// ---------------------------------------------------------------------------
// NodeBounds — geometry reported by the iframe
// ---------------------------------------------------------------------------

export interface NodeBounds {
  id: NodeId;
  rect: { top: number; left: number; width: number; height: number };
  visible: boolean;
}

export const nodeBoundsSchema = z.object({
  id: nodeIdSchema,
  rect: z.object({
    top: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  visible: z.boolean(),
}) as unknown as z.ZodType<NodeBounds>;

// ---------------------------------------------------------------------------
// ParentMessage — messages sent FROM the parent editor TO the iframe
// ---------------------------------------------------------------------------

export type ParentMessage =
  | { type: "doc.replace"; doc: Document }
  | { type: "doc.patch"; seq: number; patches: JsonPatch[] }
  | { type: "selection.set"; ids: NodeId[] }
  | { type: "breakpoint.set"; minWidth: number }
  | { type: "hittest.request"; x: number; y: number };

export const parentMessageSchema: z.ZodType<ParentMessage, z.ZodTypeDef, unknown> =
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("doc.replace"), doc: documentSchema }),
    z.object({
      type: z.literal("doc.patch"),
      seq: z.number(),
      patches: z.array(jsonPatchSchema),
    }),
    z.object({ type: z.literal("selection.set"), ids: z.array(nodeIdSchema) }),
    z.object({ type: z.literal("breakpoint.set"), minWidth: z.number() }),
    z.object({ type: z.literal("hittest.request"), x: z.number(), y: z.number() }),
  ]) as unknown as z.ZodType<ParentMessage, z.ZodTypeDef, unknown>;

// ---------------------------------------------------------------------------
// FrameMessage — messages sent FROM the iframe TO the parent editor
// ---------------------------------------------------------------------------

export type FrameMessage =
  | { type: "ready" }
  | { type: "node.bounds"; bounds: NodeBounds[] }
  | { type: "node.hover"; id: NodeId | null }
  | { type: "node.click"; id: NodeId; multi: boolean }
  | { type: "scroll"; scrollY: number }
  | { type: "resize"; width: number; height: number };

export const frameMessageSchema: z.ZodType<FrameMessage, z.ZodTypeDef, unknown> =
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("ready") }),
    z.object({ type: z.literal("node.bounds"), bounds: z.array(nodeBoundsSchema) }),
    z.object({ type: z.literal("node.hover"), id: nodeIdSchema.nullable() }),
    z.object({ type: z.literal("node.click"), id: nodeIdSchema, multi: z.boolean() }),
    z.object({ type: z.literal("scroll"), scrollY: z.number() }),
    z.object({ type: z.literal("resize"), width: z.number(), height: z.number() }),
  ]) as unknown as z.ZodType<FrameMessage, z.ZodTypeDef, unknown>;
