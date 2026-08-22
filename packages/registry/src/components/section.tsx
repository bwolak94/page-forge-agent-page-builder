import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const SPACING = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

export const sectionPropsSchema = z.object({
  name: z.string().default("").describe("Internal name shown in the layer panel"),
  padding: z.enum(SPACING).default("lg").describe("Vertical padding size token"),
  background: z.string().default("").describe("Background color or CSS value (token or raw)"),
});

type SectionProps = z.infer<typeof sectionPropsSchema>;

function Section({ padding, background, children }: SectionProps & { children?: ReactNode }) {
  const style: CSSProperties = {
    paddingTop: `var(--pf-spacing-${padding})`,
    paddingBottom: `var(--pf-spacing-${padding})`,
    ...(background ? { background } : {}),
  };
  return (
    <section className="w-full" style={style}>
      {children}
    </section>
  );
}

export const sectionDef: ComponentDef<SectionProps> = {
  type: "Section",
  category: "layout",
  description: "Full-width page section with optional background and vertical padding.",
  propsSchema: sectionPropsSchema,
  slots: {
    children: {
      accepts: ["Container", "Grid", "Stack", "Heading", "Text", "Hero", "FAQ"],
      label: "Section content",
    },
  },
  allowedParents: ["Page"],
  runtime: "static",
  importPath: "@pageforge/registry/components/section",
  Component: Section,
};
