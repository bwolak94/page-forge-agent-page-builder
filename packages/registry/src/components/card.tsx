import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const SPACING = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

export const cardPropsSchema = z.object({
  padding: z.enum(SPACING).default("md").describe("Inner padding size token"),
  shadow: z
    .enum(["none", "sm", "md", "lg"])
    .default("md")
    .describe("Box shadow intensity"),
  radius: z
    .enum(["none", "sm", "md", "lg"])
    .default("md")
    .describe("Border radius size token"),
  border: z.boolean().default(true).describe("Show border"),
});

type CardProps = z.infer<typeof cardPropsSchema>;

const SHADOW_MAP: Record<CardProps["shadow"], string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.08)",
  md: "0 4px 6px rgba(0,0,0,0.1)",
  lg: "0 10px 15px rgba(0,0,0,0.12)",
};

function Card({
  padding,
  shadow,
  radius,
  border,
  children,
}: CardProps & { children?: ReactNode }) {
  const style: CSSProperties = {
    padding: `var(--pf-spacing-${padding})`,
    boxShadow: SHADOW_MAP[shadow],
    borderRadius: radius === "none" ? "0" : `var(--pf-radius-${radius})`,
    border: border ? "1px solid var(--pf-color-border)" : "none",
    background: "var(--pf-color-surface)",
    overflow: "hidden",
  };
  return <div style={style}>{children}</div>;
}

export const cardDef: ComponentDef<CardProps> = {
  type: "Card",
  category: "layout",
  description: "Surface card with configurable padding, shadow, border, and radius.",
  propsSchema: cardPropsSchema,
  slots: {
    header: { accepts: ["Heading"], label: "Card header" },
    body: { accepts: ["*"], label: "Card body" },
    footer: { accepts: ["Button", "Text"], label: "Card footer" },
  },
  allowedParents: ["Grid", "Container", "Section"],
  runtime: "static",
  importPath: "@pageforge/registry/components/card",
  Component: Card,
};
