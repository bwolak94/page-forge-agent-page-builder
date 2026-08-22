import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const SPACING = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

export const stackPropsSchema = z.object({
  direction: z.enum(["row", "col"]).default("col").describe("Flex direction"),
  gap: z.enum(SPACING).default("md").describe("Gap between stack items"),
  align: z
    .enum(["start", "center", "end", "stretch"])
    .default("start")
    .describe("Cross-axis alignment"),
  justify: z
    .enum(["start", "center", "end", "between", "around"])
    .default("start")
    .describe("Main-axis justification"),
});

type StackProps = z.infer<typeof stackPropsSchema>;

const ALIGN_MAP: Record<StackProps["align"], string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

const JUSTIFY_MAP: Record<StackProps["justify"], string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};

function Stack({ direction, gap, align, justify, children }: StackProps & { children?: ReactNode }) {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: direction === "row" ? "row" : "column",
    gap: `var(--pf-spacing-${gap})`,
    alignItems: ALIGN_MAP[align],
    justifyContent: JUSTIFY_MAP[justify],
  };
  return <div style={style}>{children}</div>;
}

export const stackDef: ComponentDef<StackProps> = {
  type: "Stack",
  category: "layout",
  description: "Flexbox stack — arrange children in a row or column with gap and alignment.",
  propsSchema: stackPropsSchema,
  slots: {
    children: {
      accepts: ["*"],
      label: "Stack items",
    },
  },
  allowedParents: ["Section", "Container", "Grid", "Card"],
  runtime: "static",
  importPath: "@pageforge/registry/components/stack",
  Component: Stack,
};
