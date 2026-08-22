import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const SPACING = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

export const containerPropsSchema = z.object({
  maxWidth: z.string().default("1200px").describe("Maximum width of the content area"),
  padding: z.enum(SPACING).default("md").describe("Horizontal padding size token"),
  centered: z.boolean().default(true).describe("Center the container horizontally"),
});

type ContainerProps = z.infer<typeof containerPropsSchema>;

function Container({ maxWidth, padding, centered, children }: ContainerProps & { children?: ReactNode }) {
  const style: CSSProperties = {
    maxWidth,
    paddingLeft: `var(--pf-spacing-${padding})`,
    paddingRight: `var(--pf-spacing-${padding})`,
    ...(centered ? { marginLeft: "auto", marginRight: "auto" } : {}),
  };
  return (
    <div className="w-full" style={style}>
      {children}
    </div>
  );
}

export { Container };

export const containerDef: ComponentDef<ContainerProps> = {
  type: "Container",
  category: "layout",
  description: "Width-constrained content wrapper with optional centering and padding.",
  propsSchema: containerPropsSchema,
  slots: {
    children: {
      accepts: ["*"],
      label: "Container content",
    },
  },
  allowedParents: ["Section", "Grid", "Stack", "Card"],
  runtime: "static",
  importPath: "@pageforge/registry/components/container",
  Component: Container,
};
