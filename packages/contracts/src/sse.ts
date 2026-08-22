/**
 * Server-Sent Event types for the real-time document sync stream.
 * Used by the backend (T08) to push patches and by the frontend (T11) to consume them.
 */

import { z } from "zod";
import { jsonPatchSchema } from "@pageforge/ir";
import type { JsonPatch } from "@pageforge/ir";

export type SseEvent =
  | { type: "connected"; sessionId: string }
  | { type: "doc.patch"; docId: string; seq: number; patches: JsonPatch[] }
  | { type: "error"; code: string; message: string };

export const sseEventSchema: z.ZodType<SseEvent> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("connected"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("doc.patch"),
    docId: z.string(),
    seq: z.number().int().nonnegative(),
    patches: z.array(jsonPatchSchema),
  }),
  z.object({
    type: z.literal("error"),
    code: z.string(),
    message: z.string(),
  }),
]);
