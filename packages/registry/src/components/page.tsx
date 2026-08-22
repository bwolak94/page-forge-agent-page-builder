import type { ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

export const pagePropsSchema = z.object({
  title: z.string().default("Untitled page").describe("Page title (used in <title> and SEO)"),
  lang: z.string().default("en").describe("BCP 47 language tag, e.g. 'en', 'pl'"),
  dir: z.enum(["ltr", "rtl"]).default("ltr").describe("Text direction"),
});

type PageProps = z.infer<typeof pagePropsSchema>;

function Page({ lang, dir, children }: PageProps & { children?: ReactNode }) {
  return (
    <div
      lang={lang}
      dir={dir}
      className="min-h-screen bg-[var(--pf-color-background)] text-[var(--pf-color-text)]"
    >
      {children}
    </div>
  );
}

export const pageDef: ComponentDef<PageProps> = {
  type: "Page",
  category: "layout",
  description: "Root page wrapper — sets language, text direction, and background.",
  propsSchema: pagePropsSchema,
  slots: {
    children: {
      accepts: ["Section", "Nav", "Footer", "Hero"],
      label: "Page content",
    },
  },
  allowedParents: [], // root-level only
  runtime: "static",
  importPath: "@pageforge/registry/components/page",
  Component: Page,
};
