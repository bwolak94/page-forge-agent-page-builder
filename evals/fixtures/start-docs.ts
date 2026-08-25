/**
 * start-docs.ts — pre-built fixture documents used as starting state for
 * eval tasks that test mutation, relocation, or deletion operations.
 */

import { fromNestedTree } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";

// ---------------------------------------------------------------------------
// heroWithCtaDoc — Page with Nav + Hero (CTA button in hero slot)
// Used by: T006 (move CTA from hero to pricing section)
// ---------------------------------------------------------------------------

export const heroWithCtaDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    slots: {
      children: [
        { type: "Nav", props: { logo: "PageForge" }, slots: {} },
        {
          type: "Hero",
          props: { headline: "Build faster", subheadline: "Powered by AI" },
          slots: {
            cta: [{ type: "Button", props: { label: "Get started", variant: "primary" }, slots: {} }],
          },
        },
        {
          type: "Section",
          props: { name: "pricing" },
          slots: { children: [] },
        },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// cardsInStackDoc — Page with Section → Stack → 3 Cards
// Used by: T007 (wrap cards in a Grid)
// ---------------------------------------------------------------------------

export const cardsInStackDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    slots: {
      children: [
        {
          type: "Section",
          props: { name: "features" },
          slots: {
            children: [
              {
                type: "Stack",
                props: { direction: "horizontal" },
                slots: {
                  children: [
                    { type: "Card", props: { title: "Feature 1" }, slots: {} },
                    { type: "Card", props: { title: "Feature 2" }, slots: {} },
                    { type: "Card", props: { title: "Feature 3" }, slots: {} },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// pageWithFaqDoc — Page with Hero + FAQ
// Used by: T009 (delete the FAQ section)
// ---------------------------------------------------------------------------

export const pageWithFaqDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    slots: {
      children: [
        { type: "Hero", props: { headline: "Welcome" }, slots: {} },
        {
          type: "FAQ",
          props: {
            items: [
              { question: "What is PageForge?", answer: "An AI page builder." },
              { question: "Is it free?", answer: "Yes, free tier available." },
            ],
          },
          slots: {},
        },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// pricingOnlyDoc — Page with Section → 3 PricingCards
// Used by: T010 (duplicate Pro plan → Enterprise)
// ---------------------------------------------------------------------------

export const pricingOnlyDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    slots: {
      children: [
        {
          type: "Section",
          props: { name: "pricing" },
          slots: {
            children: [
              {
                type: "PricingCard",
                props: { title: "Free", price: "$0/mo", highlighted: false },
                slots: {},
              },
              {
                type: "PricingCard",
                props: { title: "Pro", price: "$29/mo", highlighted: true },
                slots: {},
              },
              {
                type: "PricingCard",
                props: { title: "Business", price: "$79/mo", highlighted: false },
                slots: {},
              },
            ],
          },
        },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// heroWithHeadingDoc — Page with Hero for heading update tasks
// Used by: T017 (update heading text in hero)
// ---------------------------------------------------------------------------

export const heroWithHeadingDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    slots: {
      children: [
        {
          type: "Hero",
          props: { headline: "Old Headline", subheadline: "Old subheadline" },
          slots: {},
        },
      ],
    },
  },
});
