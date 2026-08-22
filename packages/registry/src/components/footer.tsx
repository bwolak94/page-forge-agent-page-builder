import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const footerColumnSchema = z.object({
  title: z.string().describe("Column heading"),
  links: z.array(z.object({ label: z.string(), href: z.string() })).describe("Column links"),
});

export const footerPropsSchema = z.object({
  columns: z
    .array(footerColumnSchema)
    .default([])
    .describe("Footer link columns (title + links)"),
  copyright: z.string().default("").describe("Copyright notice displayed at the bottom"),
});

type FooterProps = z.infer<typeof footerPropsSchema>;

function Footer({ columns, copyright, children }: FooterProps & { children?: ReactNode }) {
  const style: CSSProperties = {
    background: "var(--pf-color-surface)",
    borderTop: "1px solid var(--pf-color-border)",
    padding: "var(--pf-spacing-xl) var(--pf-spacing-lg)",
  };
  return (
    <footer style={style}>
      {columns.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            gap: "var(--pf-spacing-lg)",
            marginBottom: "var(--pf-spacing-lg)",
          }}
        >
          {columns.map((col, i) => (
            <div key={i}>
              <h4
                style={{
                  fontWeight: 600,
                  color: "var(--pf-color-text)",
                  marginBottom: "var(--pf-spacing-sm)",
                }}
              >
                {col.title}
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {col.links.map((link, j) => (
                  <li key={j} style={{ marginBottom: "var(--pf-spacing-xs)" }}>
                    <a
                      href={link.href}
                      style={{ color: "var(--pf-color-muted)", textDecoration: "none" }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {children}
      {copyright && (
        <p style={{ color: "var(--pf-color-muted)", fontSize: "var(--pf-scale-sm)" }}>
          {copyright}
        </p>
      )}
    </footer>
  );
}

export const footerDef: ComponentDef<FooterProps> = {
  type: "Footer",
  category: "navigation",
  description: "Site footer with link columns and copyright text.",
  propsSchema: footerPropsSchema,
  slots: {
    links: { accepts: ["Text", "Button"], label: "Extra footer links" },
  },
  allowedParents: ["Page"],
  runtime: "static",
  importPath: "@pageforge/registry/components/footer",
  Component: Footer,
};
