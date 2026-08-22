import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

export const pricingCardPropsSchema = z.object({
  title: z.string().default("Plan name").describe("Pricing tier name"),
  price: z.string().default("$0").describe("Price amount (formatted string, e.g. '$49')"),
  period: z.enum(["mo", "yr"]).default("mo").describe("Billing period: monthly or yearly"),
  features: z.array(z.string()).default([]).describe("List of included feature descriptions"),
  highlighted: z.boolean().default(false).describe("Visually emphasise as the recommended plan"),
});

type PricingCardProps = z.infer<typeof pricingCardPropsSchema>;

function PricingCard({
  title,
  price,
  period,
  features,
  highlighted,
  children,
}: PricingCardProps & { children?: ReactNode }) {
  const style: CSSProperties = {
    padding: "var(--pf-spacing-xl)",
    borderRadius: "var(--pf-radius-lg)",
    border: highlighted
      ? "2px solid var(--pf-color-primary)"
      : "1px solid var(--pf-color-border)",
    background: highlighted ? "var(--pf-color-surface)" : "var(--pf-color-background)",
    boxShadow: highlighted ? "0 10px 15px rgba(0,0,0,0.12)" : "none",
    display: "flex",
    flexDirection: "column",
    gap: "var(--pf-spacing-md)",
  };
  return (
    <div style={style}>
      <h3
        style={{
          fontSize: "var(--pf-scale-xl)",
          fontWeight: 700,
          color: "var(--pf-color-text)",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--pf-spacing-xs)" }}>
        <span
          style={{
            fontSize: "var(--pf-scale-3xl)",
            fontWeight: 800,
            color: "var(--pf-color-primary)",
          }}
        >
          {price}
        </span>
        <span style={{ fontSize: "var(--pf-scale-sm)", color: "var(--pf-color-muted)" }}>
          /{period}
        </span>
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--pf-spacing-sm)",
        }}
      >
        {features.map((f, i) => (
          <li
            key={i}
            style={{ color: "var(--pf-color-text)", fontSize: "var(--pf-scale-base)" }}
          >
            ✓ {f}
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

export { PricingCard };

export const pricingCardDef: ComponentDef<PricingCardProps> = {
  type: "PricingCard",
  category: "commerce",
  description: "Pricing plan card with title, price, feature list, and CTA slot.",
  propsSchema: pricingCardPropsSchema,
  slots: {
    cta: { accepts: ["Button"], label: "Call-to-action button", max: 1 },
  },
  allowedParents: ["Grid", "Container", "Section"],
  runtime: "static",
  importPath: "@pageforge/registry/components/pricing-card",
  Component: PricingCard,
};
