import { describe, it, expect } from "vitest";
import { executeCommand } from "../../../src/executor.js";
import { emptyDoc, stubRegistry } from "../helpers.js";

describe("apply-theme", () => {
  it("happy path — merges color tokens", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "apply-theme", {
      tokens: { colors: { primary: "#ff0000" } },
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect(updated.theme.colors["primary"]).toBe("#ff0000");
    // Other color tokens preserved
    expect(updated.theme.colors["background"]).toBe(emptyDoc.theme.colors["background"]);
  });

  it("merges font tokens", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "apply-theme", {
      tokens: { fonts: { sans: "Inter, sans-serif" } },
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect(updated.theme.fonts.sans).toBe("Inter, sans-serif");
  });

  it("merges spacing tokens", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "apply-theme", {
      tokens: { spacing: { xl: "3rem" } },
    });
    expect(result.isOk()).toBe(true);
    const updated = result._unsafeUnwrap().doc;
    expect(updated.theme.spacing["xl"]).toBe("3rem");
    // Other spacing tokens preserved
    expect(updated.theme.spacing["xs"]).toBe(emptyDoc.theme.spacing["xs"]);
  });

  it("accepts empty tokens object (no-op)", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "apply-theme", { tokens: {} });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().doc.theme).toEqual(emptyDoc.theme);
  });

  it("fails when fonts.sans is empty string", () => {
    const result = executeCommand(emptyDoc, stubRegistry, "apply-theme", {
      tokens: { fonts: { sans: "" } },
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe("VALIDATION_FAILED");
  });
});
