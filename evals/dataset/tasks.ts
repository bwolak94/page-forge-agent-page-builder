/**
 * tasks.ts — 20 eval tasks for PageForge agent quality assessment.
 *
 * Design principles:
 *   - No string matching on LLM output (fragile, implementation-dependent).
 *   - All assertions are structural: they operate on the IR Document.
 *   - Hard assertions gate CI (binary pass/fail).
 *   - maxToolCalls enforces efficiency — the agent should not thrash.
 *   - Tags enable filtering: run only "basic" tasks in fast CI.
 *
 * Task categories:
 *   basic      — single-node operations (T001, T002, T004, T008)
 *   multi-node — multiple coordinated tool calls (T003, T010, T011)
 *   mutation   — modify existing nodes (T005, T014, T017)
 *   relocation — move nodes between slots (T006)
 *   wrap       — introduce layout parent (T007)
 *   delete     — remove nodes (T009)
 *   edge-case  — adversarial or tricky prompts (T016, T018, T019, T020)
 *   complex    — full-page builds (T011, T012, T013)
 *   efficiency — pass only if tool call budget is respected (T015, T019)
 */

import type { Document } from "@pageforge/ir";
import { validateDocument, fromNestedTree } from "@pageforge/ir";
import {
  hasNodeOfType,
  countDescendants,
  findFirst,
  getNode,
  descendants,
  getToolCallCount,
} from "./assertions.js";
import { EMPTY_DOCUMENT } from "../fixtures/empty-doc.js";
import {
  heroWithCtaDoc,
  cardsInStackDoc,
  pageWithFaqDoc,
  pricingOnlyDoc,
  heroWithHeadingDoc,
} from "../fixtures/start-docs.js";

// ---------------------------------------------------------------------------
// EvalTask interface
// ---------------------------------------------------------------------------

export interface EvalTask {
  /** Unique task identifier — used in reports and Langfuse scoring. */
  id: string;
  /** Natural language prompt sent to the agent. */
  prompt: string;
  /** Starting document. Defaults to EMPTY_DOCUMENT. */
  startDoc?: Document;
  /**
   * Structural assertions: each is a pure predicate `(doc) => boolean`.
   * All must pass for the task to be considered successful.
   */
  assertions: Array<(doc: Document) => boolean>;
  /** Tool call budget — failing this assertion gates CI. Default: 24. */
  maxToolCalls?: number;
  /** Filtering tags for selective eval runs. */
  tags: string[];
}

// ---------------------------------------------------------------------------
// Fixture — out-of-order page for T012 reorder test
// ---------------------------------------------------------------------------

const heroNavFooterDoc: Document = fromNestedTree({
  root: {
    type: "Page",
    slots: {
      children: [
        { type: "Hero", props: { headline: "Hello" }, slots: {} },
        { type: "Nav", props: { logo: "Logo" }, slots: {} },
        { type: "Footer", props: { copyright: "© 2026" }, slots: {} },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// Helper — isOk wraps neverthrow Result so assertions read cleanly
// ---------------------------------------------------------------------------

function isValid(doc: Document): boolean {
  return validateDocument(doc).isOk();
}

// ---------------------------------------------------------------------------
// EVAL_DATASET — 20 tasks
// ---------------------------------------------------------------------------

export const EVAL_DATASET: EvalTask[] = [
  // -------------------------------------------------------------------------
  // T001 — Add a navigation bar
  // -------------------------------------------------------------------------
  {
    id: "T001",
    prompt: "Add a navigation bar with the logo 'PageForge' and links: Home, Features, Pricing",
    assertions: [
      doc => hasNodeOfType(doc, "Nav"),
      doc => getNode(doc, "Nav")?.props["logo"] === "PageForge",
      doc => isValid(doc),
    ],
    maxToolCalls: 6,
    tags: ["navigation", "basic"],
  },

  // -------------------------------------------------------------------------
  // T002 — Hero section with CTA
  // -------------------------------------------------------------------------
  {
    id: "T002",
    prompt: "Add a hero section with headline 'Build faster' and a primary CTA button labeled 'Get started'",
    assertions: [
      doc => hasNodeOfType(doc, "Hero"),
      doc => {
        const heroId = findFirst(doc, "Hero");
        return heroId !== null &&
          descendants(doc, heroId).some(n => n.type === "Button");
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 8,
    tags: ["hero", "basic"],
  },

  // -------------------------------------------------------------------------
  // T003 — Pricing section with 3 plans
  // -------------------------------------------------------------------------
  {
    id: "T003",
    prompt: "Build a pricing section with three plans: Free ($0), Pro ($29/mo), Enterprise ($99/mo). Highlight the Pro plan.",
    assertions: [
      doc => hasNodeOfType(doc, "Section", { name: "pricing" }) ||
             hasNodeOfType(doc, "Section"),
      doc => countDescendants(doc, "PricingCard") === 3,
      doc => Object.values(doc.nodes).filter(n =>
        n.type === "PricingCard" && n.props["highlighted"] === true
      ).length === 1,
      doc => isValid(doc),
    ],
    maxToolCalls: 12,
    tags: ["pricing", "multi-node"],
  },

  // -------------------------------------------------------------------------
  // T004 — FAQ with 5 questions
  // -------------------------------------------------------------------------
  {
    id: "T004",
    prompt: "Add a FAQ section with 5 questions about an AI page builder product",
    assertions: [
      doc => hasNodeOfType(doc, "FAQ"),
      doc => {
        const items = getNode(doc, "FAQ")?.props["items"];
        return Array.isArray(items) && items.length >= 5;
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 8,
    tags: ["faq", "array-props", "basic"],
  },

  // -------------------------------------------------------------------------
  // T005 — Theme color change
  // -------------------------------------------------------------------------
  {
    id: "T005",
    prompt: "Change the primary color to blue (#3B82F6) and the background color to white (#FFFFFF)",
    assertions: [
      doc => {
        const primary = doc.theme.colors["primary"];
        return typeof primary === "string" &&
          (primary.toLowerCase().includes("blue") ||
           primary.toLowerCase().includes("#3b82f6") ||
           primary.toLowerCase().includes("3b82f6"));
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 4,
    tags: ["theme", "mutation"],
  },

  // -------------------------------------------------------------------------
  // T006 — Move CTA button from hero to pricing section
  // -------------------------------------------------------------------------
  {
    id: "T006",
    prompt: "Move the CTA button from the hero section into the pricing section",
    startDoc: heroWithCtaDoc,
    assertions: [
      doc => {
        const heroId = findFirst(doc, "Hero");
        return heroId !== null &&
          !descendants(doc, heroId).some(n => n.type === "Button");
      },
      doc => {
        const sectionId = findFirst(doc, "Section");
        return sectionId !== null &&
          descendants(doc, sectionId).some(n => n.type === "Button");
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 10,
    tags: ["relocation", "move"],
  },

  // -------------------------------------------------------------------------
  // T007 — Wrap feature cards in a 3-column grid
  // -------------------------------------------------------------------------
  {
    id: "T007",
    prompt: "Wrap the three feature cards in a grid with 3 columns",
    startDoc: cardsInStackDoc,
    assertions: [
      doc => hasNodeOfType(doc, "Grid"),
      doc => {
        const gridId = findFirst(doc, "Grid");
        return gridId !== null &&
          descendants(doc, gridId).filter(n => n.type === "Card").length === 3;
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 12,
    tags: ["wrap", "layout"],
  },

  // -------------------------------------------------------------------------
  // T008 — Add a footer
  // -------------------------------------------------------------------------
  {
    id: "T008",
    prompt: "Add a footer with copyright '© 2026 PageForge' and three column navigation links",
    assertions: [
      doc => hasNodeOfType(doc, "Footer"),
      doc => {
        const footer = getNode(doc, "Footer");
        const copyright = footer?.props["copyright"];
        return typeof copyright === "string" && copyright.includes("2026");
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 6,
    tags: ["footer", "basic"],
  },

  // -------------------------------------------------------------------------
  // T009 — Delete the FAQ section
  // -------------------------------------------------------------------------
  {
    id: "T009",
    prompt: "Delete the FAQ section from the page",
    startDoc: pageWithFaqDoc,
    assertions: [
      doc => !hasNodeOfType(doc, "FAQ"),
      doc => isValid(doc),
    ],
    maxToolCalls: 4,
    tags: ["delete"],
  },

  // -------------------------------------------------------------------------
  // T010 — Duplicate Pro plan → Enterprise
  // -------------------------------------------------------------------------
  {
    id: "T010",
    prompt: "Duplicate the Pro pricing card and change the copy to 'Enterprise' at $199/mo. The Enterprise plan should not be highlighted.",
    startDoc: pricingOnlyDoc,
    assertions: [
      doc => countDescendants(doc, "PricingCard") === 4,
      doc => Object.values(doc.nodes).some(n =>
        n.type === "PricingCard" &&
        typeof n.props["title"] === "string" &&
        (n.props["title"] as string).toLowerCase().includes("enterprise")
      ),
      doc => isValid(doc),
    ],
    maxToolCalls: 10,
    tags: ["duplicate", "multi-node"],
  },

  // -------------------------------------------------------------------------
  // T011 — Build complete landing page
  // -------------------------------------------------------------------------
  {
    id: "T011",
    prompt: "Build a complete landing page: navigation bar, hero with CTA, three feature cards in a grid, a pricing section with three plans, a FAQ section with at least 4 questions, and a footer.",
    assertions: [
      doc => hasNodeOfType(doc, "Nav"),
      doc => hasNodeOfType(doc, "Hero"),
      doc => countDescendants(doc, "Card") >= 3,
      doc => hasNodeOfType(doc, "Section"),
      doc => countDescendants(doc, "PricingCard") >= 3,
      doc => hasNodeOfType(doc, "FAQ"),
      doc => hasNodeOfType(doc, "Footer"),
      doc => isValid(doc),
    ],
    maxToolCalls: 30,
    tags: ["full-page", "complex"],
  },

  // -------------------------------------------------------------------------
  // T012 — Reorder sections (footer to bottom, nav to top)
  // -------------------------------------------------------------------------
  {
    id: "T012",
    prompt: "Ensure the navigation bar is the first child of the page and the footer is the last child",
    startDoc: heroNavFooterDoc,
    assertions: [
      doc => {
        const pageNode = doc.nodes[doc.root];
        const children = pageNode?.slots["children"] ?? [];
        if (children.length < 2) return false;
        const first = doc.nodes[children[0]!];
        const last = doc.nodes[children[children.length - 1]!];
        return first?.type === "Nav" && last?.type === "Footer";
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 8,
    tags: ["reorder", "complex"],
  },

  // -------------------------------------------------------------------------
  // T013 — Set node meta (lock a section)
  // -------------------------------------------------------------------------
  {
    id: "T013",
    prompt: "Lock the hero section so it cannot be accidentally moved or deleted",
    startDoc: heroWithCtaDoc,
    assertions: [
      doc => {
        const hero = getNode(doc, "Hero");
        return hero?.meta?.locked === true;
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 4,
    tags: ["meta", "mutation"],
  },

  // -------------------------------------------------------------------------
  // T014 — Typography scale change
  // -------------------------------------------------------------------------
  {
    id: "T014",
    prompt: "Update the typography: set the heading font to 'Georgia, serif' and the base scale to 18px",
    assertions: [
      doc => {
        const serif = doc.theme.fonts.serif;
        const sans = doc.theme.fonts.sans;
        return (typeof serif === "string" && serif.toLowerCase().includes("georgia")) ||
               (typeof sans === "string" && sans.toLowerCase().includes("georgia"));
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 4,
    tags: ["theme", "typography", "mutation"],
  },

  // -------------------------------------------------------------------------
  // T015 — Island component (interactive button)
  // -------------------------------------------------------------------------
  {
    id: "T015",
    prompt: "Add a call-to-action button labeled 'Start free trial' to the page",
    assertions: [
      doc => hasNodeOfType(doc, "Button", { label: "Start free trial" }) ||
             Object.values(doc.nodes).some(n =>
               n.type === "Button" &&
               typeof n.props["label"] === "string" &&
               (n.props["label"] as string).toLowerCase().includes("free trial")
             ),
      doc => isValid(doc),
    ],
    maxToolCalls: 4,
    tags: ["island", "basic", "efficiency"],
  },

  // -------------------------------------------------------------------------
  // T016 — Empty doc → single section
  // -------------------------------------------------------------------------
  {
    id: "T016",
    prompt: "Add a single centered section to the page",
    assertions: [
      doc => hasNodeOfType(doc, "Section"),
      doc => isValid(doc),
    ],
    maxToolCalls: 3,
    tags: ["edge-case", "basic"],
  },

  // -------------------------------------------------------------------------
  // T017 — Update headline text in hero
  // -------------------------------------------------------------------------
  {
    id: "T017",
    prompt: "Change the hero headline to 'The AI-powered page builder'",
    startDoc: heroWithHeadingDoc,
    assertions: [
      doc => {
        const hero = getNode(doc, "Hero");
        const headline = hero?.props["headline"];
        return typeof headline === "string" &&
          headline.toLowerCase().includes("ai");
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 4,
    tags: ["mutation", "updateProps"],
  },

  // -------------------------------------------------------------------------
  // T018 — Add image to a section
  // -------------------------------------------------------------------------
  {
    id: "T018",
    prompt: "Add an image to the page with alt text 'PageForge dashboard screenshot'",
    assertions: [
      doc => hasNodeOfType(doc, "Image"),
      doc => {
        const img = getNode(doc, "Image");
        return typeof img?.props["alt"] === "string" &&
          (img.props["alt"] as string).length > 0;
      },
      doc => isValid(doc),
    ],
    maxToolCalls: 6,
    tags: ["media", "basic"],
  },

  // -------------------------------------------------------------------------
  // T019 — Efficiency challenge (full hero in ≤ 5 tool calls)
  // -------------------------------------------------------------------------
  {
    id: "T019",
    prompt: "Add a hero section with headline 'Welcome', subheadline 'Build pages in seconds', and a 'Try now' button. Use as few tool calls as possible.",
    assertions: [
      doc => hasNodeOfType(doc, "Hero"),
      doc => hasNodeOfType(doc, "Button"),
      doc => isValid(doc),
      doc => getToolCallCount(doc) <= 5,
    ],
    maxToolCalls: 5,
    tags: ["efficiency", "hero"],
  },

  // -------------------------------------------------------------------------
  // T020 — Multi-section page with heading hierarchy
  // -------------------------------------------------------------------------
  {
    id: "T020",
    prompt: "Create a page with three sections: 'Features', 'Pricing', and 'Contact'. Each section should have a heading and at least one text block.",
    assertions: [
      doc => countDescendants(doc, "Section") >= 3,
      doc => countDescendants(doc, "Heading") >= 3,
      doc => countDescendants(doc, "Text") >= 3,
      doc => isValid(doc),
    ],
    maxToolCalls: 20,
    tags: ["multi-node", "complex"],
  },
];
