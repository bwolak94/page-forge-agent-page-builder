/**
 * zodToFields — unit tests covering all supported Zod types.
 * 100% branch coverage of the visitor in zod-to-fields.ts.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodToFields } from "../components/inspector/zod-to-fields.js";

describe("zodToFields", () => {
  it("maps ZodString to text field", () => {
    const schema = z.object({ title: z.string().describe("Title") });
    const [field] = zodToFields(schema);
    expect(field).toMatchObject({ kind: "text", name: "title", label: "Title" });
  });

  it("maps ZodString with 'color' in name to color-token field", () => {
    const schema = z.object({ color: z.string() });
    const [field] = zodToFields(schema);
    expect(field?.kind).toBe("color-token");
  });

  it("maps ZodEnum to enum field with options", () => {
    const schema = z.object({ size: z.enum(["sm", "md", "lg"]) });
    const [field] = zodToFields(schema);
    expect(field).toMatchObject({ kind: "enum", options: ["sm", "md", "lg"] });
  });

  it("maps ZodBoolean to boolean field", () => {
    const schema = z.object({ disabled: z.boolean() });
    const [field] = zodToFields(schema);
    expect(field?.kind).toBe("boolean");
  });

  it("maps ZodNumber without range to number field", () => {
    const schema = z.object({ count: z.number() });
    const [field] = zodToFields(schema);
    expect(field?.kind).toBe("number");
  });

  it("maps ZodNumber with min/max to slider with bounds", () => {
    const schema = z.object({ cols: z.number().min(1).max(12) });
    const [field] = zodToFields(schema);
    expect(field).toMatchObject({ kind: "slider", min: 1, max: 12 });
  });

  it("maps ZodArray to string-array field", () => {
    const schema = z.object({ items: z.array(z.string()) });
    const [field] = zodToFields(schema);
    expect(field?.kind).toBe("string-array");
  });

  it("unwraps ZodDefault and extracts the default value", () => {
    const schema = z.object({ label: z.string().default("Click me") });
    const [field] = zodToFields(schema);
    expect(field).toMatchObject({ kind: "text", defaultValue: "Click me", required: false });
  });

  it("marks ZodDefault fields as not required", () => {
    const schema = z.object({
      title: z.string().default(""),
      required: z.string(),
    });
    const [titleField, requiredField] = zodToFields(schema);
    expect(titleField?.required).toBe(false);
    expect(requiredField?.required).toBe(true);
  });

  it("unwraps ZodOptional and marks field as not required", () => {
    const schema = z.object({ subtitle: z.string().optional() });
    const [field] = zodToFields(schema);
    expect(field?.required).toBe(false);
    expect(field?.kind).toBe("text");
  });

  it("uses .describe() as field label", () => {
    const schema = z.object({
      headlineText: z.string().describe("Main headline"),
    });
    const [field] = zodToFields(schema);
    expect(field?.label).toBe("Main headline");
  });

  it("humanizes key name when no description", () => {
    const schema = z.object({ myPropName: z.string() });
    const [field] = zodToFields(schema);
    expect(field?.label).toBe("My Prop Name");
  });

  it("falls back to text for unknown types", () => {
    const schema = z.object({ data: z.record(z.string()) });
    const [field] = zodToFields(schema);
    expect(field?.kind).toBe("text");
  });

  it("handles multiple fields in order", () => {
    const schema = z.object({
      name: z.string(),
      count: z.number().min(0).max(100),
      active: z.boolean(),
    });
    const fields = zodToFields(schema);
    expect(fields).toHaveLength(3);
    expect(fields.map(f => f.kind)).toEqual(["text", "slider", "boolean"]);
  });

  it("ZodEnum with ZodDefault unwraps to enum with correct default", () => {
    const schema = z.object({
      layout: z.enum(["centered", "split"]).default("centered"),
    });
    const [field] = zodToFields(schema);
    expect(field).toMatchObject({
      kind: "enum",
      options: ["centered", "split"],
      defaultValue: "centered",
      required: false,
    });
  });
});
