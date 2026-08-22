/**
 * prop-serializer.test.ts — unit tests for serializeProps + serializeValue.
 */

import { describe, it, expect } from "vitest";
import { serializeProps, serializeValue } from "../prop-serializer.js";
import { heroPropsSchema } from "@pageforge/registry";
import { pricingCardPropsSchema } from "@pageforge/registry";
import { headingPropsSchema } from "@pageforge/registry";

describe("serializeValue", () => {
  it("serializes strings with JSON.stringify", () => {
    expect(serializeValue("hello")).toBe('"hello"');
  });

  it("serializes booleans", () => {
    expect(serializeValue(true)).toBe("true");
    expect(serializeValue(false)).toBe("false");
  });

  it("serializes numbers", () => {
    expect(serializeValue(42)).toBe("42");
    expect(serializeValue(0)).toBe("0");
  });

  it("serializes null", () => {
    expect(serializeValue(null)).toBe("null");
  });

  it("serializes arrays", () => {
    expect(serializeValue(["a", "b"])).toBe('["a", "b"]');
  });

  it("serializes nested arrays", () => {
    expect(serializeValue([1, [2, 3]])).toBe("[1, [2, 3]]");
  });

  it("serializes objects", () => {
    const result = serializeValue({ label: "Click", href: "/foo" });
    expect(result).toBe('{ label: "Click", href: "/foo" }');
  });
});

describe("serializeProps", () => {
  it("omits props equal to defaults", () => {
    // Hero defaults: headline="", subheadline="", layout="centered"
    const result = serializeProps(
      { headline: "", subheadline: "", layout: "centered" },
      heroPropsSchema,
    );
    expect(result).toBe("");
  });

  it("emits non-default string props", () => {
    const result = serializeProps({ headline: "Hello world" }, heroPropsSchema);
    expect(result).toContain('headline={"Hello world"}');
  });

  it("omits default layout but emits changed layout", () => {
    const result = serializeProps({ layout: "split" }, heroPropsSchema);
    expect(result).toContain('layout={"split"}');
  });

  it("emits boolean true when non-default", () => {
    // PricingCard: highlighted defaults to false
    const result = serializeProps({ highlighted: true }, pricingCardPropsSchema);
    expect(result).toContain("highlighted={true}");
  });

  it("omits boolean false that equals default", () => {
    const result = serializeProps({ highlighted: false }, pricingCardPropsSchema);
    expect(result).toBe("");
  });

  it("emits arrays", () => {
    const result = serializeProps(
      { features: ["Feature A", "Feature B"] },
      pricingCardPropsSchema,
    );
    expect(result).toContain('features={["Feature A", "Feature B"]}');
  });

  it("emits number props when non-default", () => {
    // Heading: level defaults to 2
    const result = serializeProps({ level: 1, text: "Title" }, headingPropsSchema);
    expect(result).toContain("level={1}");
    expect(result).toContain('text={"Title"}');
  });

  it("omits number props equal to default", () => {
    // Heading: level defaults to 2 — level=2 should be omitted
    const result = serializeProps({ level: 2 }, headingPropsSchema);
    expect(result).toBe("");
  });
});
