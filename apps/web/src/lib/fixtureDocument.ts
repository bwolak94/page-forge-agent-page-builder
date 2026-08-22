/**
 * Fixture document used by the editor until real persistence (T08) is wired.
 *
 * Structure: Page → Nav + Hero + Section (Grid of 3 Cards) + Footer
 * All props match the registry component schemas from T04.
 */

import { fromNestedTree } from "@pageforge/ir";

export const FIXTURE_DOCUMENT = fromNestedTree({
  root: {
    id: "root",
    type: "Page",
    props: { title: "My First Page", lang: "en" },
    slots: {
      children: [
        {
          id: "nav1",
          type: "Nav",
          props: { logo: "PageForge", items: [], sticky: false, transparent: false },
          slots: {
            actions: [
              {
                id: "btn-cta",
                type: "Button",
                props: { label: "Get Started", variant: "primary", size: "md", disabled: false, href: "" },
              },
            ],
          },
        },
        {
          id: "hero1",
          type: "Hero",
          props: { headline: "Build pages visually", subheadline: "Drag, drop, and let the AI do the rest.", layout: "centered" },
          slots: {
            cta: [
              {
                id: "btn-hero",
                type: "Button",
                props: { label: "Try it now", variant: "primary", size: "lg", disabled: false, href: "" },
              },
            ],
          },
        },
        {
          id: "sec1",
          type: "Section",
          props: { padding: "xl", background: "var(--pf-color-surface)", fullWidth: false, minHeight: "auto" },
          slots: {
            children: [
              {
                id: "h1",
                type: "Heading",
                props: { level: 2, text: "Why PageForge?", align: "center", color: "var(--pf-color-text)" },
              },
              {
                id: "grid1",
                type: "Grid",
                props: { columns: 3, gap: "md", minColWidth: "240px" },
                slots: {
                  children: [
                    {
                      id: "card1",
                      type: "Card",
                      props: { padding: "lg", shadow: "md", radius: "md", border: true },
                      slots: {
                        header: [
                          { id: "card1-h", type: "Heading", props: { level: 3, text: "IR-based", align: "left", color: "var(--pf-color-text)" } },
                        ],
                        body: [
                          { id: "card1-t", type: "Text", props: { content: "A flat normalized graph — O(1) node access and minimal patches.", size: "sm", align: "left", color: "var(--pf-color-muted)" } },
                        ],
                      },
                    },
                    {
                      id: "card2",
                      type: "Card",
                      props: { padding: "lg", shadow: "md", radius: "md", border: true },
                      slots: {
                        header: [
                          { id: "card2-h", type: "Heading", props: { level: 3, text: "Agent-powered", align: "left", color: "var(--pf-color-text)" } },
                        ],
                        body: [
                          { id: "card2-t", type: "Text", props: { content: "Claude edits the IR via typed commands — never raw HTML.", size: "sm", align: "left", color: "var(--pf-color-muted)" } },
                        ],
                      },
                    },
                    {
                      id: "card3",
                      type: "Card",
                      props: { padding: "lg", shadow: "md", radius: "md", border: true },
                      slots: {
                        header: [
                          { id: "card3-h", type: "Heading", props: { level: 3, text: "Event-sourced", align: "left", color: "var(--pf-color-text)" } },
                        ],
                        body: [
                          { id: "card3-t", type: "Text", props: { content: "Append-only event log — undo, replay, and collaboration built-in.", size: "sm", align: "left", color: "var(--pf-color-muted)" } },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          id: "footer1",
          type: "Footer",
          props: { columns: [], copyright: `© ${new Date().getFullYear()} PageForge` },
        },
      ],
    },
  },
});
