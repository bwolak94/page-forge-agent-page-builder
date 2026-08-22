import type { CSSProperties } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

export const buttonPropsSchema = z.object({
  label: z.string().default("Click me").describe("Button label text"),
  variant: z
    .enum(["primary", "secondary", "ghost", "outline"])
    .default("primary")
    .describe("Visual style variant"),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("Button size"),
  href: z.string().default("").describe("If set, renders as <a> instead of <button>"),
  disabled: z.boolean().default(false).describe("Disable interaction"),
});

type ButtonProps = z.infer<typeof buttonPropsSchema>;

const PADDING: Record<ButtonProps["size"], string> = {
  sm: "var(--pf-spacing-xs) var(--pf-spacing-sm)",
  md: "var(--pf-spacing-sm) var(--pf-spacing-md)",
  lg: "var(--pf-spacing-md) var(--pf-spacing-lg)",
};

const FONT_SIZE: Record<ButtonProps["size"], string> = {
  sm: "var(--pf-scale-sm)",
  md: "var(--pf-scale-base)",
  lg: "var(--pf-scale-lg)",
};

function getVariantStyle(variant: ButtonProps["variant"]): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: "var(--pf-color-primary)",
        color: "var(--pf-color-background)",
        border: "none",
      };
    case "secondary":
      return {
        background: "var(--pf-color-secondary)",
        color: "var(--pf-color-background)",
        border: "none",
      };
    case "ghost":
      return {
        background: "transparent",
        color: "var(--pf-color-primary)",
        border: "none",
      };
    case "outline":
      return {
        background: "transparent",
        color: "var(--pf-color-primary)",
        border: "1px solid var(--pf-color-primary)",
      };
  }
}

function Button({ label, variant, size, href, disabled }: ButtonProps) {
  const style: CSSProperties = {
    ...getVariantStyle(variant),
    padding: PADDING[size],
    fontSize: FONT_SIZE[size],
    borderRadius: "var(--pf-radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    fontWeight: 600,
    textDecoration: "none",
  };

  if (href) {
    return (
      <a href={href} style={style} aria-disabled={disabled}>
        {label}
      </a>
    );
  }

  return (
    <button type="button" disabled={disabled} style={style}>
      {label}
    </button>
  );
}

export { Button };

export const buttonDef: ComponentDef<ButtonProps> = {
  type: "Button",
  category: "interactive",
  description: "Call-to-action button or link with variant, size, and optional href.",
  propsSchema: buttonPropsSchema,
  slots: {}, // leaf
  allowedParents: ["Container", "Stack", "Card", "Hero", "Nav", "PricingCard"],
  runtime: "island",
  importPath: "@pageforge/registry/components/button",
  Component: Button,
  emitHtmlRuntime: `
    document.querySelectorAll('[data-pf-button]').forEach(el => {
      el.addEventListener('click', () => { /* island hydration placeholder */ });
    });
  `.trim(),
};
