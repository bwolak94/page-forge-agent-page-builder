/**
 * emitter.test.ts — golden file tests for ReactEmitter.
 *
 * Snapshots are created on first run (vitest --update-snapshots).
 * They live in src/__tests__/__snapshots__/ and are committed to git.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { REGISTRY } from "@pageforge/registry";
import { makeMinimalDocument, fromNestedTree } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";
import { ReactEmitter } from "../emitter.js";
import { heroDoc } from "./__fixtures__/hero-doc.js";
import { pricingDoc } from "./__fixtures__/pricing-doc.js";
import { fullPageDoc } from "./__fixtures__/full-page-doc.js";

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

function makeDocWithOnly(types: string[]): Document {
  // Build a Page with each type as a direct child
  const slots: Record<string, unknown[]> = {};
  const children = types.map(type => ({ type, props: {}, slots: {} }));
  return fromNestedTree({
    root: { type: "Page", slots: { children } },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReactEmitter", () => {
  const emitter = new ReactEmitter(REGISTRY);

  // -------------------------------------------------------------------------
  // Golden file tests
  // -------------------------------------------------------------------------

  it("hero doc — golden file snapshot", async () => {
    const { files } = await emitter.emit(heroDoc);
    expect(files.get("app/page.tsx")).toMatchSnapshot();
  });

  it("pricing doc — golden file snapshot", async () => {
    const { files } = await emitter.emit(pricingDoc);
    expect(files.get("app/page.tsx")).toMatchSnapshot();
  });

  it("full landing page — golden file snapshot", async () => {
    const { files } = await emitter.emit(fullPageDoc);
    expect(files.get("app/page.tsx")).toMatchSnapshot();
  });

  // -------------------------------------------------------------------------
  // Determinism
  // -------------------------------------------------------------------------

  it("is deterministic — same IR → same output twice", async () => {
    const r1 = await emitter.emit(fullPageDoc);
    const r2 = await emitter.emit(fullPageDoc);
    expect(r1.files.get("app/page.tsx")).toBe(r2.files.get("app/page.tsx"));
  });

  it("is deterministic for minimal doc", async () => {
    const doc = makeMinimalDocument();
    const r1 = await emitter.emit(doc);
    const r2 = await emitter.emit(doc);
    expect(r1.files.get("app/page.tsx")).toBe(r2.files.get("app/page.tsx"));
  });

  // -------------------------------------------------------------------------
  // Import deduplication
  // -------------------------------------------------------------------------

  it("3 PricingCard nodes → exactly one PricingCard import", async () => {
    const { files } = await emitter.emit(pricingDoc);
    const page = files.get("app/page.tsx")!;
    const matches = (page.match(/import.*PricingCard/g) ?? []).length;
    expect(matches).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Only used imports
  // -------------------------------------------------------------------------

  it("imports only used components — hero doc excludes PricingCard", async () => {
    const { files } = await emitter.emit(heroDoc);
    const page = files.get("app/page.tsx")!;
    expect(page).toContain("@pageforge/registry/components/hero");
    expect(page).not.toContain("@pageforge/registry/components/pricing-card");
  });

  it("minimal doc with only Hero and Button excludes Section", async () => {
    const doc = makeDocWithOnly(["Hero", "Button"]);
    const { files } = await emitter.emit(doc);
    const page = files.get("app/page.tsx")!;
    expect(page).toContain("@pageforge/registry/components/hero");
    expect(page).not.toContain("@pageforge/registry/components/section");
  });

  // -------------------------------------------------------------------------
  // Default prop omission
  // -------------------------------------------------------------------------

  it("omits default props — layout=centered not emitted for Hero", async () => {
    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: {
          children: [
            {
              type: "Hero",
              props: { headline: "Hello", layout: "centered" }, // layout is default
            },
          ],
        },
      },
    });
    const { files } = await emitter.emit(doc);
    const page = files.get("app/page.tsx")!;
    expect(page).toContain("headline");
    expect(page).not.toContain("layout");
  });

  it("emits non-default props — highlighted=true for PricingCard", async () => {
    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: {
          children: [
            {
              type: "PricingCard",
              props: { title: "Pro", price: "$29", highlighted: true },
            },
          ],
        },
      },
    });
    const { files } = await emitter.emit(doc);
    const page = files.get("app/page.tsx")!;
    expect(page).toContain("highlighted={true}");
  });

  // -------------------------------------------------------------------------
  // Output files
  // -------------------------------------------------------------------------

  it("emits all required project files", async () => {
    const { files } = await emitter.emit(heroDoc);
    expect(files.has("app/page.tsx")).toBe(true);
    expect(files.has("styles/tokens.css")).toBe(true);
    expect(files.has("tailwind.config.ts")).toBe(true);
    expect(files.has("package.json")).toBe(true);
    expect(files.has("tsconfig.json")).toBe(true);
  });

  it("generated package.json includes next dependency", async () => {
    const { files } = await emitter.emit(heroDoc);
    const pkgJson = JSON.parse(files.get("package.json")!) as Record<string, unknown>;
    const deps = pkgJson["dependencies"] as Record<string, string>;
    expect(deps["next"]).toBeDefined();
    expect(deps["react"]).toBeDefined();
  });

  it("styles/tokens.css defines CSS custom properties", async () => {
    const { files } = await emitter.emit(heroDoc);
    const css = files.get("styles/tokens.css")!;
    expect(css).toContain(":root");
    expect(css).toContain("--pf-color-primary");
    expect(css).toContain("--pf-spacing-md");
  });

  // -------------------------------------------------------------------------
  // Unknown component fallback
  // -------------------------------------------------------------------------

  it("unknown component type emits a comment, does not throw", async () => {
    const doc = fromNestedTree({
      root: {
        type: "Page",
        slots: {
          children: [{ type: "UnknownWidget", props: {}, slots: {} }],
        },
      },
    });
    const { files } = await emitter.emit(doc);
    const page = files.get("app/page.tsx")!;
    expect(page).toContain("Unknown component: UnknownWidget");
  });

  // -------------------------------------------------------------------------
  // Custom visitor (OCP)
  // -------------------------------------------------------------------------

  it("custom visitor overrides default rendering", async () => {
    const customEmitter = new ReactEmitter(REGISTRY, {
      Hero: {
        visit: () => `<CustomHero />`,
      },
    });
    const { files } = await customEmitter.emit(heroDoc);
    const page = files.get("app/page.tsx")!;
    expect(page).toContain("CustomHero");
    expect(page).not.toContain("<Hero");
  });
});
