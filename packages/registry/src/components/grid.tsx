import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const SPACING = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

export const gridPropsSchema = z.object({
  cols: z.number().int().min(1).max(6).default(3).describe("Number of columns"),
  gap: z.enum(SPACING).default("md").describe("Gap between grid items"),
  responsive: z.boolean().default(true).describe("Collapse to 1 column on mobile"),
});

type GridProps = z.infer<typeof gridPropsSchema>;

function Grid({ cols, gap, responsive, children }: GridProps & { children?: ReactNode }) {
  const style: CSSProperties = {
    display: "grid",
    gridTemplateColumns: responsive
      ? `repeat(auto-fit, minmax(min(100%, ${Math.floor(100 / cols) - 2}%), 1fr))`
      : `repeat(${cols}, 1fr)`,
    gap: `var(--pf-spacing-${gap})`,
  };
  return <div style={style}>{children}</div>;
}

export const gridDef: ComponentDef<GridProps> = {
  type: "Grid",
  category: "layout",
  description: "CSS grid with configurable columns, gap, and responsive collapse.",
  propsSchema: gridPropsSchema,
  slots: {
    children: {
      accepts: ["Card", "PricingCard", "Container", "Stack"],
      label: "Grid items",
    },
  },
  allowedParents: ["Section", "Container"],
  runtime: "static",
  importPath: "@pageforge/registry/components/grid",
  Component: Grid,
};
