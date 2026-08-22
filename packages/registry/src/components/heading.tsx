import type { CSSProperties } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

export const headingPropsSchema = z.object({
  level: z.number().int().min(1).max(6).default(2).describe("Heading level (1–6)"),
  text: z.string().default("").describe("Heading text content"),
  align: z.enum(["left", "center", "right"]).default("left").describe("Text alignment"),
  color: z.string().default("var(--pf-color-text)").describe("Text color (token or CSS value)"),
});

type HeadingProps = z.infer<typeof headingPropsSchema>;

const SCALE: Record<number, string> = {
  1: "var(--pf-scale-3xl)",
  2: "var(--pf-scale-2xl)",
  3: "var(--pf-scale-xl)",
  4: "var(--pf-scale-lg)",
  5: "var(--pf-scale-base)",
  6: "var(--pf-scale-sm)",
};

function Heading({ level, text, align, color }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  const style: CSSProperties = {
    fontSize: SCALE[level] ?? "var(--pf-scale-base)",
    textAlign: align,
    color,
    fontWeight: 700,
    lineHeight: 1.2,
  };
  return <Tag style={style}>{text}</Tag>;
}

export const headingDef: ComponentDef<HeadingProps> = {
  type: "Heading",
  category: "typography",
  description: "Semantic heading element (h1–h6) with scale and color tokens.",
  propsSchema: headingPropsSchema,
  slots: {}, // leaf — no children
  allowedParents: ["Section", "Container", "Stack", "Card", "Hero"],
  runtime: "static",
  importPath: "@pageforge/registry/components/heading",
  Component: Heading,
};
