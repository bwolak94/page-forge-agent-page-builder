import type { CSSProperties } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

const faqItemSchema = z.object({
  question: z.string().describe("FAQ question"),
  answer: z.string().describe("FAQ answer"),
});

export const faqPropsSchema = z.object({
  items: z.array(faqItemSchema).default([]).describe("Array of question/answer pairs"),
  openFirst: z.boolean().default(false).describe("Expand the first item on load"),
});

type FAQProps = z.infer<typeof faqPropsSchema>;

function FAQ({ items, openFirst }: FAQProps) {
  const listStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--pf-spacing-sm)",
  };
  const itemStyle: CSSProperties = {
    borderBottom: "1px solid var(--pf-color-border)",
    paddingBottom: "var(--pf-spacing-md)",
  };
  const questionStyle: CSSProperties = {
    fontWeight: 600,
    color: "var(--pf-color-text)",
    fontSize: "var(--pf-scale-base)",
    cursor: "pointer",
  };
  const answerStyle: CSSProperties = {
    marginTop: "var(--pf-spacing-sm)",
    color: "var(--pf-color-muted)",
    fontSize: "var(--pf-scale-base)",
    lineHeight: 1.6,
  };
  return (
    <dl style={listStyle}>
      {items.map((item, i) => (
        <div key={i} style={itemStyle}>
          <details open={i === 0 && openFirst}>
            <summary style={questionStyle}>{item.question}</summary>
            <p style={answerStyle}>{item.answer}</p>
          </details>
        </div>
      ))}
    </dl>
  );
}

export { FAQ };

export const faqDef: ComponentDef<FAQProps> = {
  type: "FAQ",
  category: "commerce",
  description: "Accordion FAQ with question/answer pairs and optional open-first behaviour.",
  propsSchema: faqPropsSchema,
  slots: {}, // leaf — items are props, not IR nodes
  allowedParents: ["Section", "Container"],
  runtime: "static",
  importPath: "@pageforge/registry/components/faq",
  Component: FAQ,
};
