/**
 * pricing-doc.ts — Section with Grid of 3 PricingCard nodes.
 * Tests: import deduplication (3 PricingCards → 1 import).
 */

import { fromNestedTree } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";

export const pricingDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    props: { title: "Pricing" },
    slots: {
      children: [
        {
          type: "Section",
          props: { name: "pricing" },
          slots: {
            children: [
              {
                type: "Grid",
                props: { cols: 3 },
                slots: {
                  children: [
                    {
                      type: "PricingCard",
                      props: {
                        title: "Starter",
                        price: "$0",
                        features: ["5 pages", "Basic export"],
                      },
                    },
                    {
                      type: "PricingCard",
                      props: {
                        title: "Pro",
                        price: "$29",
                        highlighted: true,
                        features: ["Unlimited pages", "React export", "Priority support"],
                      },
                    },
                    {
                      type: "PricingCard",
                      props: {
                        title: "Team",
                        price: "$99",
                        features: ["Everything in Pro", "5 seats"],
                      },
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
});
