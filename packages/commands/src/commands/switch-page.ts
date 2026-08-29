/**
 * SwitchPage — change the active page.
 *
 * Updates `doc.activePageId` and `doc.root` to point to the target page.
 * All nodes from all pages remain in `doc.nodes` — nothing is deleted.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document, NodeId } from "@pageforge/ir";
import { domainError } from "@pageforge/ir";
import type { Command } from "../types.js";

export const switchPageSchema = z.object({
  pageId: z.string().min(1),
});

export type SwitchPageArgs = z.infer<typeof switchPageSchema>;

export const switchPage: Command<SwitchPageArgs> = {
  kind: "switch-page",
  argsSchema: switchPageSchema,

  validate(doc: Document, args: SwitchPageArgs) {
    if (!doc.pages[args.pageId]) {
      return err(
        domainError("NOT_FOUND", `Page "${args.pageId}" does not exist.`, {
          hint: "Use listPages to see available page ids.",
        }),
      );
    }
    if (doc.activePageId === args.pageId) {
      return err(
        domainError("INVALID_ARGS", `Page "${args.pageId}" is already active.`),
      );
    }
    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: SwitchPageArgs) {
    const page = (draft.pages as unknown as Record<string, { root: NodeId }>)[args.pageId];
    if (!page) return;
    const d = draft as unknown as { activePageId: string; root: NodeId };
    d.activePageId = args.pageId;
    d.root = page.root;
  },
};
