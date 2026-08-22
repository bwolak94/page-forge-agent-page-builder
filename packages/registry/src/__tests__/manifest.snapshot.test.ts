import { describe, it, expect } from "vitest";
import { registryManifest } from "../../src/manifest.js";
import { REGISTRY } from "../../src/registry.js";

describe("registryManifest", () => {
  it("is stable across runs (snapshot)", () => {
    expect(registryManifest(REGISTRY)).toMatchSnapshot();
  });

  it("contains all 15 component types", () => {
    const manifest = registryManifest(REGISTRY);
    const types = Object.keys(REGISTRY);
    for (const type of types) {
      expect(manifest).toContain(type);
    }
  });

  it("contains category labels", () => {
    const manifest = registryManifest(REGISTRY);
    expect(manifest).toContain("layout");
    expect(manifest).toContain("typography");
    expect(manifest).toContain("commerce");
    expect(manifest).toContain("navigation");
    expect(manifest).toContain("interactive");
    expect(manifest).toContain("media");
  });

  it("sorts components alphabetically", () => {
    const manifest = registryManifest(REGISTRY);
    const typeLines = manifest
      .split("\n")
      .filter(l => l.trim() !== "" && !l.startsWith(" "))
      .map(l => l.split(" · ")[0] ?? "");
    const sorted = [...typeLines].sort((a, b) => a.localeCompare(b));
    expect(typeLines).toEqual(sorted);
  });

  it("mentions allowedParents (parents: ...)", () => {
    const manifest = registryManifest(REGISTRY);
    expect(manifest).toContain("parents:");
  });

  it("mentions root-only for Page", () => {
    const manifest = registryManifest(REGISTRY);
    expect(manifest).toContain("root-only");
  });
});
