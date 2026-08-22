/**
 * full-page-doc.ts — full landing page fixture.
 * Tests: golden file snapshot, determinism, multi-section structure.
 */

import { fromNestedTree } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";

export const fullPageDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    props: { title: "PageForge — AI Page Builder" },
    slots: {
      children: [
        {
          type: "Nav",
          props: {
            logo: "PageForge",
            sticky: true,
            items: [
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
            ],
          },
          slots: {
            actions: [
              {
                type: "Button",
                props: { label: "Get started", variant: "primary", href: "/signup" },
              },
            ],
          },
        },
        {
          type: "Hero",
          props: {
            headline: "Build pages by talking",
            subheadline: "Describe what you want, watch PageForge build it in real time.",
            layout: "centered",
          },
          slots: {
            cta: [
              {
                type: "Button",
                props: { label: "Start for free", variant: "primary", href: "/signup" },
              },
              {
                type: "Button",
                props: { label: "Watch demo", variant: "outline", href: "#demo" },
              },
            ],
          },
        },
        {
          type: "Section",
          props: { name: "pricing" },
          slots: {
            children: [
              {
                type: "Heading",
                props: { level: 2, text: "Simple, transparent pricing", align: "center" },
              },
              {
                type: "Grid",
                props: { cols: 3, gap: "lg" },
                slots: {
                  children: [
                    {
                      type: "PricingCard",
                      props: {
                        title: "Starter",
                        price: "$0",
                        period: "mo",
                        features: ["5 pages", "Basic export"],
                      },
                      slots: {
                        cta: [
                          {
                            type: "Button",
                            props: { label: "Get started", variant: "outline", href: "/signup" },
                          },
                        ],
                      },
                    },
                    {
                      type: "PricingCard",
                      props: {
                        title: "Pro",
                        price: "$29",
                        period: "mo",
                        highlighted: true,
                        features: ["Unlimited pages", "React export", "Priority support"],
                      },
                      slots: {
                        cta: [
                          {
                            type: "Button",
                            props: { label: "Start Pro", variant: "primary", href: "/signup/pro" },
                          },
                        ],
                      },
                    },
                    {
                      type: "PricingCard",
                      props: {
                        title: "Team",
                        price: "$99",
                        period: "mo",
                        features: ["Everything in Pro", "5 seats", "SSO"],
                      },
                      slots: {
                        cta: [
                          {
                            type: "Button",
                            props: { label: "Contact sales", variant: "ghost", href: "/contact" },
                          },
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
          type: "Footer",
          props: {
            copyright: "© 2026 PageForge. All rights reserved.",
            columns: [
              {
                title: "Product",
                links: [
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                ],
              },
              {
                title: "Company",
                links: [
                  { label: "About", href: "/about" },
                  { label: "Blog", href: "/blog" },
                ],
              },
            ],
          },
        },
      ],
    },
  },
});
