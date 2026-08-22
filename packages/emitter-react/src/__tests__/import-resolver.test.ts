/**
 * import-resolver.test.ts — unit tests for ImportCollector.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ImportCollector } from "../import-resolver.js";

describe("ImportCollector", () => {
  let collector: ImportCollector;

  beforeEach(() => {
    collector = new ImportCollector();
  });

  it("generates a single import statement", () => {
    collector.add("Hero", "@pageforge/registry/components/hero");
    const result = collector.toStatements();
    expect(result).toBe('import { Hero } from "@pageforge/registry/components/hero";');
  });

  it("merges multiple names from the same path into one import", () => {
    collector.add("Hero", "@pageforge/registry/components/hero");
    collector.add("Hero", "@pageforge/registry/components/hero");
    const result = collector.toStatements();
    expect(result).toBe('import { Hero } from "@pageforge/registry/components/hero";');
  });

  it("deduplicates same name + path (idempotent)", () => {
    collector.add("PricingCard", "@pageforge/registry/components/pricing-card");
    collector.add("PricingCard", "@pageforge/registry/components/pricing-card");
    collector.add("PricingCard", "@pageforge/registry/components/pricing-card");
    const stmts = collector.toStatements();
    const matches = (stmts.match(/PricingCard/g) ?? []).length;
    expect(matches).toBe(1);
  });

  it("sorts import statements alphabetically by path", () => {
    collector.add("Section", "@pageforge/registry/components/section");
    collector.add("Hero", "@pageforge/registry/components/hero");
    collector.add("Button", "@pageforge/registry/components/button");
    const stmts = collector.toStatements();
    const lines = stmts.split("\n");
    expect(lines[0]).toContain("button");
    expect(lines[1]).toContain("hero");
    expect(lines[2]).toContain("section");
  });

  it("returns empty string when nothing collected", () => {
    expect(collector.toStatements()).toBe("");
  });

  it("extracts scoped package name for usedPackages()", () => {
    collector.add("Hero", "@pageforge/registry/components/hero");
    collector.add("Button", "@pageforge/registry/components/button");
    const pkgs = collector.usedPackages();
    expect(pkgs).toEqual(["@pageforge/registry"]);
  });

  it("extracts unscoped package name", () => {
    collector.add("React", "react");
    const pkgs = collector.usedPackages();
    expect(pkgs).toContain("react");
  });

  it("deduplicates packages from multiple paths of the same package", () => {
    collector.add("Hero", "@pageforge/registry/components/hero");
    collector.add("Button", "@pageforge/registry/components/button");
    collector.add("Grid", "@pageforge/registry/components/grid");
    const pkgs = collector.usedPackages();
    expect(pkgs.filter(p => p === "@pageforge/registry")).toHaveLength(1);
  });
});
