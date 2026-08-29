/**
 * RemovePage — delete a page and all of its nodes from the document.
 *
 * Refuses if the document has only one page (must always have at least one).
 * If the removed page was active, switches to the first remaining page.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document, NodeId } from "@pageforge/ir";
import { domainError } from "@pageforge/ir";
import type { Command } from "../types.js";
import { descendants } from "@pageforge/ir";

export const removePageSchema = z.object({
  /** The page id to remove. */
  pageId: z.string().min(1),
});

export type RemovePageArgs = z.infer<typeof removePageSchema>;

export const removePage: Command<RemovePageArgs> = {
  kind: "remove-page",
  argsSchema: removePageSchema,

  validate(doc: Document, args: RemovePageArgs) {
    if (!doc.pages[args.pageId]) {
      return err(
        domainError("NOT_FOUND", `Page "${args.pageId}" does not exist.`, {
          hint: "Use queryTree to list pages.",
        }),
      );
    }
    if (Object.keys(doc.pages).length <= 1) {
      return err(
        domainError(
          "INVALID_ARGS",
          "Cannot remove the last page. A document must have at least one page.",
          { hint: "Add another page before removing this one." },
        ),
      );
    }
    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: RemovePageArgs) {
    const mutablePages = draft.pages as unknown as Record<string, { root: NodeId }>;
    const page = mutablePages[args.pageId];
    if (!page) return;

    const pageRoot = page.root;
    const mutableNodes = draft.nodes as unknown as Record<string, unknown>;

    // Collect all nodes in this page's subtree and delete them
    const toDelete = [pageRoot, ...descendants(draft as unknown as Document, pageRoot)];
    for (const nid of toDelete) {
      delete mutableNodes[nid];
    }

    // Remove the page entry
    delete mutablePages[args.pageId];

    // If we removed the active page, switch to the first remaining page
    const d = draft as unknown as { activePageId: string; root: NodeId };
    if (d.activePageId === args.pageId) {
      const remaining = Object.values(draft.pages as unknown as Record<string, { id: string; root: NodeId }>);
      const first = remaining[0];
      if (first) {
        d.activePageId = first.id;
        d.root = first.root;
      }
    }
  },
};
