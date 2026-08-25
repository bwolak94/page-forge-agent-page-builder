/**
 * ssr.test.ts — unit tests for renderIrToHtml.
 *
 * Tests verify:
 * - Output is a valid HTML document (DOCTYPE, html, head, body).
 * - Stylesheet link is present (styles.css).
 * - Theme CSS custom properties are embedded in a <style> tag.
 * - Island scripts are embedded at end of <body>.
 * - Missing root node throws a descriptive error.
 */

import { describe, it, expect } from "vitest";
import { fromNestedTree, nodeId } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";
import { REGISTRY, DEFAULT_THEME } from "@pageforge/registry";
import { renderIrToHtml } from "../ssr.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(overrides?: Partial<Document>): Document {
  const base = fromNestedTree({
    root: {
      type: "Page",
      props: { title: "Test" },
      slots: {
        children: [
          { type: "Heading", props: { level: 1, text: "Hello SSR" }, slots: {} },
          { type: "Text", props: { text: "Body content here." }, slots: {} },
        ],
      },
    },
  });
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("renderIrToHtml", () => {
  it("returns a full HTML document with DOCTYPE", () => {
    const doc = makeDoc();
    const html = renderIrToHtml(doc, REGISTRY);

    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain("<html");
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
    expect(html).toContain("</html>");
  });

  it("includes a link to styles.css", () => {
    const doc = makeDoc();
    const html = renderIrToHtml(doc, REGISTRY);
    expect(html).toContain('href="styles.css"');
  });

  it("embeds theme CSS custom properties in a <style> tag", () => {
    const doc = makeDoc();
    const html = renderIrToHtml(doc, REGISTRY);

    // Default theme has primary color
    expect(html).toContain("--pf-color-primary");
    expect(html).toContain("<style>");
    expect(html).toContain(":root");
  });

  it("renders body content from the IR tree", () => {
    const doc = makeDoc();
    const html = renderIrToHtml(doc, REGISTRY);

    expect(html).toContain("Hello SSR");
    expect(html).toContain("Body content here.");
  });

  it("embeds island scripts at end of body when present", () => {
    // Create a registry entry with a custom island runtime snippet
    const islandScript = "window.__pf_island_ready = true";
    const islandRegistry = {
      ...REGISTRY,
      Button: {
        ...REGISTRY["Button"]!,
        runtime: "island" as const,
        emitHtmlRuntime: islandScript,
      },
    };

    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: {
          children: [{ type: "Button", props: { label: "Click" }, slots: {} }],
        },
      },
    });

    const html = renderIrToHtml(doc, islandRegistry);
    expect(html).toContain(`<script>${islandScript}</script>`);
  });

  it("deduplicates island scripts when the same component appears multiple times", () => {
    const islandScript = "window.__pf_modal_hydrated = true";
    const islandRegistry = {
      ...REGISTRY,
      Button: {
        ...REGISTRY["Button"]!,
        runtime: "island" as const,
        emitHtmlRuntime: islandScript,
      },
    };

    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: {
          children: [
            { type: "Button", props: { label: "A" }, slots: {} },
            { type: "Button", props: { label: "B" }, slots: {} },
          ],
        },
      },
    });

    const html = renderIrToHtml(doc, islandRegistry);
    // Count occurrences by splitting — avoids regex special char escaping
    const occurrences = html.split(islandScript).length - 1;
    expect(occurrences).toBe(1);
  });

  it("throws when the root node is missing from the document", () => {
    const doc = makeDoc({ root: nodeId("non-existent-id") });
    expect(() => renderIrToHtml(doc, REGISTRY)).toThrow(/Root node/);
  });
});
