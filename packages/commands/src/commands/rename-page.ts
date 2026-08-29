/**
 * RenamePage — update a page's title and/or slug.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document, PageEntry } from "@pageforge/ir";
import { domainError } from "@pageforge/ir";
import type { Command } from "../types.js";

export const renamePageSchema = z.object({
  pageId: z.string().min(1),
  title: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens")
    .optional(),
});

export type RenamePageArgs = z.infer<typeof renamePageSchema>;

export const renamePage: Command<RenamePageArgs> = {
  kind: "rename-page",
  argsSchema: renamePageSchema,

  validate(doc: Document, args: RenamePageArgs) {
    if (!doc.pages[args.pageId]) {
      return err(
        domainError("NOT_FOUND", `Page "${args.pageId}" does not exist.`),
      );
    }
    if (args.slug) {
      const slugConflict = Object.values(doc.pages).some(
        p => p.slug === args.slug && p.id !== args.pageId,
      );
      if (slugConflict) {
        return err(
          domainError("ALREADY_EXISTS", `A page with slug "${args.slug}" already exists.`, {
            hint: "Choose a different slug.",
          }),
        );
      }
    }
    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: RenamePageArgs) {
    const mutablePages = draft.pages as unknown as Record<string, PageEntry>;
    const page = mutablePages[args.pageId];
    if (!page) return;
    if (args.title !== undefined) {
      (page as { title: string }).title = args.title;
    }
    if (args.slug !== undefined) {
      (page as { slug: string }).slug = args.slug;
    }
  },
};
