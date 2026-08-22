import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

export const heroPropsSchema = z.object({
  headline: z.string().default("").describe("Primary headline text"),
  subheadline: z.string().default("").describe("Supporting subheadline text"),
  layout: z
    .enum(["centered", "split"])
    .default("centered")
    .describe("centered: text + CTA centred; split: text left, media right"),
});

type HeroProps = z.infer<typeof heroPropsSchema>;

function Hero({ headline, subheadline, layout, children }: HeroProps & { children?: ReactNode }) {
  const isCentered = layout === "centered";
  const wrapperStyle: CSSProperties = {
    padding: "var(--pf-spacing-xl) var(--pf-spacing-lg)",
    display: "flex",
    flexDirection: isCentered ? "column" : "row",
    alignItems: "center",
    justifyContent: isCentered ? "center" : "space-between",
    textAlign: isCentered ? "center" : "left",
    gap: "var(--pf-spacing-xl)",
  };
  return (
    <div style={wrapperStyle}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--pf-spacing-md)",
        }}
      >
        {headline && (
          <h1
            style={{
              fontSize: "var(--pf-scale-3xl)",
              fontWeight: 800,
              color: "var(--pf-color-text)",
            }}
          >
            {headline}
          </h1>
        )}
        {subheadline && (
          <p
            style={{
              fontSize: "var(--pf-scale-lg)",
              color: "var(--pf-color-muted)",
            }}
          >
            {subheadline}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export const heroDef: ComponentDef<HeroProps> = {
  type: "Hero",
  category: "layout",
  description: "Hero section with headline, subheadline, CTA buttons, and optional media.",
  propsSchema: heroPropsSchema,
  slots: {
    cta: { accepts: ["Button", "Stack"], label: "Call-to-action area" },
    media: { accepts: ["Image"], label: "Hero media (image or video)", max: 1 },
  },
  allowedParents: ["Page", "Section"],
  runtime: "static",
  importPath: "@pageforge/registry/components/hero",
  Component: Hero,
};
