import { describe, it, expect } from "vitest";
import { canAccept, getValidDropTargets } from "../../src/constraints.js";
import { REGISTRY } from "../../src/registry.js";
import { EMPTY_DOCUMENT } from "@pageforge/ir";

describe("canAccept — positive cases", () => {
  it("allows Section in Page.children", () => {
    expect(canAccept(REGISTRY, "Page", "Section", "children")).toBe(true);
  });

  it("allows Nav in Page.children", () => {
    expect(canAccept(REGISTRY, "Page", "Nav", "children")).toBe(true);
  });

  it("allows Footer in Page.children", () => {
    expect(canAccept(REGISTRY, "Page", "Footer", "children")).toBe(true);
  });

  it("allows Hero in Page.children", () => {
    expect(canAccept(REGISTRY, "Page", "Hero", "children")).toBe(true);
  });

  it("allows Container in Section.children", () => {
    expect(canAccept(REGISTRY, "Section", "Container", "children")).toBe(true);
  });

  it("allows Grid in Section.children", () => {
    expect(canAccept(REGISTRY, "Section", "Grid", "children")).toBe(true);
  });

  it("allows Card in Grid.children", () => {
    expect(canAccept(REGISTRY, "Grid", "Card", "children")).toBe(true);
  });

  it("allows PricingCard in Grid.children", () => {
    expect(canAccept(REGISTRY, "Grid", "PricingCard", "children")).toBe(true);
  });

  it("allows Button in PricingCard.cta", () => {
    expect(canAccept(REGISTRY, "PricingCard", "Button", "cta")).toBe(true);
  });

  it("allows Button in Card.footer", () => {
    expect(canAccept(REGISTRY, "Card", "Button", "footer")).toBe(true);
  });

  it("allows Heading in Card.header", () => {
    expect(canAccept(REGISTRY, "Card", "Heading", "header")).toBe(true);
  });

  it("allows Button in Hero.cta", () => {
    expect(canAccept(REGISTRY, "Hero", "Button", "cta")).toBe(true);
  });

  it("allows Image in Hero.media", () => {
    expect(canAccept(REGISTRY, "Hero", "Image", "media")).toBe(true);
  });

  it("allows Button in Nav.actions", () => {
    expect(canAccept(REGISTRY, "Nav", "Button", "actions")).toBe(true);
  });

  it("allows Container in Stack.children (wildcard slot)", () => {
    expect(canAccept(REGISTRY, "Stack", "Container", "children")).toBe(true);
  });

  it("allows Heading in Stack.children (wildcard slot)", () => {
    expect(canAccept(REGISTRY, "Stack", "Heading", "children")).toBe(true);
  });

  it("allows FAQ in Section.children", () => {
    expect(canAccept(REGISTRY, "Section", "FAQ", "children")).toBe(true);
  });

  it("allows Hero in Section.children", () => {
    expect(canAccept(REGISTRY, "Section", "Hero", "children")).toBe(true);
  });
});

describe("canAccept — negative cases", () => {
  it("rejects Button directly in Grid.children", () => {
    expect(canAccept(REGISTRY, "Grid", "Button", "children")).toBe(false);
  });

  it("rejects Page as a child of Section", () => {
    expect(canAccept(REGISTRY, "Section", "Page", "children")).toBe(false);
  });

  it("rejects Page inside Container (wildcard slot + root-only guard)", () => {
    expect(canAccept(REGISTRY, "Container", "Page", "children")).toBe(false);
  });

  it("rejects Section inside Section", () => {
    expect(canAccept(REGISTRY, "Section", "Section", "children")).toBe(false);
  });

  it("rejects Heading in Grid.children", () => {
    expect(canAccept(REGISTRY, "Grid", "Heading", "children")).toBe(false);
  });

  it("rejects Image in Page.children", () => {
    expect(canAccept(REGISTRY, "Page", "Image", "children")).toBe(false);
  });

  it("rejects unknown type → always false", () => {
    expect(canAccept(REGISTRY, "Unknown", "Button", "children")).toBe(false);
    expect(canAccept(REGISTRY, "Page", "Unknown", "children")).toBe(false);
  });

  it("rejects valid type in non-existent slot", () => {
    expect(canAccept(REGISTRY, "Page", "Section", "sidebar")).toBe(false);
  });

  it("rejects Image in PricingCard.cta", () => {
    expect(canAccept(REGISTRY, "PricingCard", "Image", "cta")).toBe(false);
  });

  it("rejects Nav inside Section", () => {
    expect(canAccept(REGISTRY, "Section", "Nav", "children")).toBe(false);
  });

  it("rejects Footer inside Section", () => {
    expect(canAccept(REGISTRY, "Section", "Footer", "children")).toBe(false);
  });
});

describe("getValidDropTargets", () => {
  it("returns empty array for EMPTY_DOCUMENT (only root Page with no structural slots for Heading)", () => {
    // Page.children accepts [Section, Nav, Footer, Hero] — not Heading
    const targets = getValidDropTargets(REGISTRY, EMPTY_DOCUMENT, "Heading");
    expect(targets).toHaveLength(0);
  });

  it("returns root for Section drop target", () => {
    const targets = getValidDropTargets(REGISTRY, EMPTY_DOCUMENT, "Section");
    expect(targets).toHaveLength(1);
    expect(targets[0]?.nodeId).toBe("root");
    expect(targets[0]?.slot).toBe("children");
  });
});
