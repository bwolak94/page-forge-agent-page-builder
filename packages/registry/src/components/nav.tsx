import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const navItemSchema = z.object({
  label: z.string().describe("Navigation link label"),
  href: z.string().describe("Navigation link URL"),
});

export const navPropsSchema = z.object({
  logo: z.string().default("").describe("Logo text or image URL"),
  items: z.array(navItemSchema).default([]).describe("Navigation links"),
  sticky: z.boolean().default(false).describe("Stick to top of viewport on scroll"),
  transparent: z
    .boolean()
    .default(false)
    .describe("Transparent background (for hero sections)"),
});

type NavProps = z.infer<typeof navPropsSchema>;

function Nav({ logo, items, sticky, transparent, children }: NavProps & { children?: ReactNode }) {
  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--pf-spacing-sm) var(--pf-spacing-lg)",
    background: transparent ? "transparent" : "var(--pf-color-surface)",
    borderBottom: transparent ? "none" : "1px solid var(--pf-color-border)",
    ...(sticky ? { position: "sticky", top: 0, zIndex: 50 } : {}),
  };
  return (
    <nav style={style}>
      {logo && (
        <span
          style={{
            fontWeight: 700,
            fontSize: "var(--pf-scale-lg)",
            color: "var(--pf-color-primary)",
          }}
        >
          {logo}
        </span>
      )}
      <ul
        style={{
          display: "flex",
          gap: "var(--pf-spacing-md)",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {items.map((item, i) => (
          <li key={i}>
            <a
              href={item.href}
              style={{
                color: "var(--pf-color-text)",
                textDecoration: "none",
                fontSize: "var(--pf-scale-base)",
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      {children && <div style={{ display: "flex", gap: "var(--pf-spacing-sm)" }}>{children}</div>}
    </nav>
  );
}

export { Nav };

export const navDef: ComponentDef<NavProps> = {
  type: "Nav",
  category: "navigation",
  description: "Site navigation bar with logo, links, optional sticky behaviour, and CTA actions.",
  propsSchema: navPropsSchema,
  slots: {
    actions: { accepts: ["Button"], label: "Nav action buttons" },
  },
  allowedParents: ["Page"],
  runtime: "static",
  importPath: "@pageforge/registry/components/nav",
  Component: Nav,
};
