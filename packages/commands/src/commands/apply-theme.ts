/**
 * ApplyTheme — deep-merge partial theme tokens into the document theme.
 *
 * Each top-level ThemeTokens key (colors, spacing, radii, fonts, scale)
 * is merged individually. Existing tokens not mentioned in the patch are preserved.
 */

import { z } from "zod";
import { ok, err } from "neverthrow";
import type { Draft } from "immer";
import type { Document } from "@pageforge/ir";
import { themeTokensSchema, domainError } from "@pageforge/ir";
import type { Command } from "../types.js";

// ---------------------------------------------------------------------------
// Args schema
// ---------------------------------------------------------------------------

export const applyThemeSchema = z.object({
  tokens: themeTokensSchema.partial(),
});

export type ApplyThemeArgs = z.infer<typeof applyThemeSchema>;

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const applyTheme: Command<ApplyThemeArgs> = {
  kind: "apply-theme",
  argsSchema: applyThemeSchema,

  validate(_doc: Document, args: ApplyThemeArgs) {
    const result = themeTokensSchema.partial().safeParse(args.tokens);
    if (!result.success) {
      return err(
        domainError("INVALID_ARGS", `Invalid theme tokens: ${result.error.message}`, {
          hint: "Provide valid CSS values for each token key.",
        }),
      );
    }
    return ok(undefined);
  },

  execute(draft: Draft<Document>, args: ApplyThemeArgs) {
    const { tokens } = args;

    if (tokens.colors) {
      Object.assign(draft.theme.colors, tokens.colors);
    }
    if (tokens.spacing) {
      Object.assign(draft.theme.spacing, tokens.spacing);
    }
    if (tokens.radii) {
      Object.assign(draft.theme.radii, tokens.radii);
    }
    if (tokens.scale) {
      Object.assign(draft.theme.scale, tokens.scale);
    }
    if (tokens.fonts) {
      if (tokens.fonts.sans !== undefined) {
        draft.theme.fonts.sans = tokens.fonts.sans;
      }
      if (tokens.fonts.serif !== undefined) {
        draft.theme.fonts.serif = tokens.fonts.serif;
      }
      if (tokens.fonts.mono !== undefined) {
        draft.theme.fonts.mono = tokens.fonts.mono;
      }
    }
  },
};
