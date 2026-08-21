/**
 * UpdateProps — merge a patch into a node's props.
 *
 * The patch is a partial map: defined values replace existing props,
 * `undefined` values delete the prop key.
 * The operation is a merge (Object.assign semantics), not a replace.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document } from "@pageforge/ir";
import { nodeIdSchema, domainError } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema
// ---------------------------------------------------------------------------

export const updatePropsSchema = z.object({
  id: nodeIdSchema,
  /**
   * Keys to merge. A value of `undefined` removes the prop.
   * All other values replace the existing prop.
   */
  patch: z.record(z.unknown()),
});

export type UpdatePropsArgs = z.infer<typeof updatePropsSchema>;

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const updateProps: Command<UpdatePropsArgs> = {
  kind: "update-props",
  argsSchema: updatePropsSchema,

  validate(doc: Document, args: UpdatePropsArgs) {
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

  execute(draft: Draft<Document>, args: UpdatePropsArgs) {
    const node = draft.nodes[args.id];
    if (!node) return; // guarded by validate

    for (const [key, value] of Object.entries(args.patch)) {
      if (value === undefined) {
        delete (node.props as Record<string, unknown>)[key];
      } else {
        (node.props as Record<string, unknown>)[key] = value;
      }
    }
  },
};
