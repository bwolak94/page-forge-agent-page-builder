/**
 * zod-to-fields — Visitor over the Zod AST.
 *
 * `zodToFields(schema)` walks a ZodObject's shape and converts each field
 * into a FieldDescriptor that the inspector knows how to render.
 * New Zod types → add a case; no component changes needed (OCP).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldKind =
  | "text"
  | "number"
  | "boolean"
  | "enum"
  | "color-token"
  | "string-array"
  | "slider"
  | "textarea";

export interface FieldDescriptor {
  kind: FieldKind;
  name: string;
  label: string;
  required: boolean;
  defaultValue: unknown;
  /** For "enum" */
  options?: string[];
  /** For "slider" */
  min?: number;
  max?: number;
  step?: number;
  /** For "color-token" */
  isColorToken?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/** Recursively strip ZodOptional, ZodNullable, ZodDefault wrappers. */
function unwrapModifiers(type: z.ZodTypeAny): z.ZodTypeAny {
  if (type instanceof z.ZodOptional || type instanceof z.ZodNullable) {
    return unwrapModifiers(type.unwrap());
  }
  if (type instanceof z.ZodDefault) {
    return unwrapModifiers(type._def.innerType as z.ZodTypeAny);
  }
  return type;
}

/** True if the type has a default or is optional — i.e. not strictly required. */
function isOptionalOrDefault(type: z.ZodTypeAny): boolean {
  return (
    type instanceof z.ZodOptional ||
    type instanceof z.ZodNullable ||
    type instanceof z.ZodDefault
  );
}

/** Extract default value from ZodDefault / ZodOptional wrappers. */
function getDefault(type: z.ZodTypeAny): unknown {
  if (type instanceof z.ZodDefault) {
    return type._def.defaultValue();
  }
  if (type instanceof z.ZodOptional || type instanceof z.ZodNullable) {
    return getDefault(type.unwrap());
  }
  return undefined;
}

function getMin(type: z.ZodNumber): number | undefined {
  const check = type._def.checks.find(c => c.kind === "min");
  return check?.kind === "min" ? check.value : undefined;
}

function getMax(type: z.ZodNumber): number | undefined {
  const check = type._def.checks.find(c => c.kind === "max");
  return check?.kind === "max" ? check.value : undefined;
}

function detectStringKind(name: string, _type: z.ZodString): FieldKind {
  if (name.toLowerCase().includes("color")) return "color-token";
  return "text";
}

// ---------------------------------------------------------------------------
// Core visitor
// ---------------------------------------------------------------------------

function zodTypeToField(name: string, zodType: z.ZodTypeAny): FieldDescriptor {
  const unwrapped = unwrapModifiers(zodType);
  const label = zodType.description ?? humanizeKey(name);
  const required = !isOptionalOrDefault(zodType);
  const defaultValue = getDefault(zodType);

  if (unwrapped instanceof z.ZodString) {
    const kind = detectStringKind(name, unwrapped);
    return { kind, name, label, required, defaultValue };
  }

  if (unwrapped instanceof z.ZodNumber) {
    const hasRange = unwrapped._def.checks.some(
      c => c.kind === "min" || c.kind === "max",
    );
    return {
      kind: hasRange ? "slider" : "number",
      name,
      label,
      required,
      defaultValue,
      min: getMin(unwrapped),
      max: getMax(unwrapped),
    };
  }

  if (unwrapped instanceof z.ZodBoolean) {
    return { kind: "boolean", name, label, required, defaultValue };
  }

  if (unwrapped instanceof z.ZodEnum) {
    return {
      kind: "enum",
      name,
      label,
      required,
      defaultValue,
      options: (unwrapped._def as { values: string[] }).values,
    };
  }

  if (unwrapped instanceof z.ZodArray) {
    return {
      kind: "string-array",
      name,
      label,
      required,
      defaultValue: defaultValue ?? [],
    };
  }

  // Fallback — render as plain text
  return {
    kind: "text",
    name,
    label,
    required,
    defaultValue: String(defaultValue ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a ZodObject shape into an ordered array of FieldDescriptors.
 * Adding a new component to the registry auto-produces a complete inspector
 * form with zero UI code.
 */
export function zodToFields(schema: z.ZodObject<z.ZodRawShape>): FieldDescriptor[] {
  return Object.entries(schema.shape).map(([name, zodType]) =>
    zodTypeToField(name, zodType as z.ZodTypeAny),
  );
}
