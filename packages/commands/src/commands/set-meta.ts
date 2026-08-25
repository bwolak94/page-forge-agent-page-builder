/**
 * SetMeta — update editor-only metadata on a node (name, locked, hidden).
 *
 * Meta is merged (not replaced). Passing `undefined` for a meta field clears it.
 * Meta does not affect rendering or export.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document } from "@pageforge/ir";
import { nodeIdSchema, nodeMetaSchema, domainError } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema
// ---------------------------------------------------------------------------

export const setMetaSchema = z.object({
  id: nodeIdSchema,
  meta: nodeMetaSchema.partial(),
});

export type SetMetaArgs = z.infer<typeof setMetaSchema>;

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const setMeta: Command<SetMetaArgs> = {
  kind: "set-meta",
  argsSchema: setMetaSchema,

  validate(doc: Document, args: SetMetaArgs) {
    if (!doc.nodes[args.id]) {
      return err(
        domainError("NOT_FOUND", `Node "${args.id}" does not exist.`, {
          hint: "Use allNodeIds() to list available nodes.",
          nodeId: args.id,
        }),
      );
    }
    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: SetMetaArgs) {
    const nodes = draft.nodes as unknown as Record<string, { meta?: Record<string, unknown> } | undefined>;
    const node = nodes[args.id];
    if (!node) return; // guarded by validate

    node.meta = { ...node.meta, ...args.meta };
  },
};
