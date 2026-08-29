/**
 * AddPage — create a new page in the document.
 *
 * Adds a fresh Page root node to `doc.nodes`, registers it in `doc.pages`,
 * and optionally switches the active page to the new one.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import { nanoid } from "nanoid";
import type { Draft } from "immer";
import type { Document, NodeId, PageEntry } from "@pageforge/ir";
import { nodeId, domainError } from "@pageforge/ir";
import type { Command } from "../types.js";

export const addPageSchema = z.object({
  /** URL-safe slug for the new page, e.g. "about-us". */
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  /** Human-readable page title. */
  title: z.string().min(1),
  /** If true, switch activePageId to the new page immediately. Default false. */
  activate: z.boolean().default(false),
});

export type AddPageArgs = z.infer<typeof addPageSchema>;

export const addPage: Command<AddPageArgs> = {
  kind: "add-page",
  argsSchema: addPageSchema,

  validate(doc: Document, args: AddPageArgs) {
    const slugExists = Object.values(doc.pages).some(p => p.slug === args.slug);
    if (slugExists) {
      return err(
        domainError("ALREADY_EXISTS", `A page with slug "${args.slug}" already exists.`, {
          hint: "Choose a different slug.",
        }),
      );
    }
    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: AddPageArgs) {
    const pageId = nanoid(10);
    const rootNodeId: NodeId = nodeId(nanoid(10));

    // Create the Page root node
    const mutableNodes = draft.nodes as unknown as Record<string, {
      id: string; type: string; props: Record<string, unknown>; slots: Record<string, string[]>;
    }>;
    mutableNodes[rootNodeId] = {
      id: rootNodeId,
      type: "Page",
      props: { title: args.title, lang: "en" },
      slots: { children: [] },
    };

    // Register the page
    const mutablePages = draft.pages as unknown as Record<string, PageEntry>;
    mutablePages[pageId] = { id: pageId, slug: args.slug, title: args.title, root: rootNodeId };

    // Optionally switch active page
    if (args.activate) {
      (draft as unknown as { root: NodeId; activePageId: string }).root = rootNodeId;
      (draft as unknown as { activePageId: string }).activePageId = pageId;
    }
  },
};
