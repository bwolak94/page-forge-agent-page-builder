import type { CSSProperties } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const SCALE_KEYS = ["xs", "sm", "base", "lg", "xl"] as const;
const WEIGHT = ["normal", "medium", "semibold", "bold"] as const;

export const textPropsSchema = z.object({
  text: z.string().default("").describe("Paragraph text content"),
  size: z.enum(SCALE_KEYS).default("base").describe("Font size scale token"),
  weight: z.enum(WEIGHT).default("normal").describe("Font weight"),
  color: z.string().default("var(--pf-color-text)").describe("Text color (token or CSS value)"),
  align: z.enum(["left", "center", "right"]).default("left").describe("Text alignment"),
});

type TextProps = z.infer<typeof textPropsSchema>;

const WEIGHT_MAP: Record<TextProps["weight"], number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

function Text({ text, size, weight, color, align }: TextProps) {
  const style: CSSProperties = {
    fontSize: `var(--pf-scale-${size})`,
    fontWeight: WEIGHT_MAP[weight],
    color,
    textAlign: align,
    lineHeight: 1.6,
  };
  return <p style={style}>{text}</p>;
}

export const textDef: ComponentDef<TextProps> = {
  type: "Text",
  category: "typography",
  description: "Paragraph text with size, weight, color, and alignment tokens.",
  propsSchema: textPropsSchema,
  slots: {}, // leaf
  allowedParents: ["Section", "Container", "Stack", "Card", "Hero", "FAQ"],
  runtime: "static",
  importPath: "@pageforge/registry/components/text",
  Component: Text,
};
