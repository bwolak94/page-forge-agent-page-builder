/**
 * hero-doc.ts — minimal fixture: Page → Nav + Hero (with Button CTA).
 */

import { fromNestedTree } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";

export const heroDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    props: { title: "Hero Page" },
    slots: {
      children: [
        {
          type: "Nav",
          props: { logo: "PageForge", sticky: true },
        },
        {
          type: "Hero",
          props: {
            headline: "Build pages by talking",
            subheadline: "AI-powered page builder",
          },
          slots: {
            cta: [
              {
                type: "Button",
                props: { label: "Get started", href: "/signup" },
              },
            ],
          },
        },
      ],
    },
  },
});
