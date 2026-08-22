/**
 * prop-serializer.ts — JsonValue → JSX attribute string.
 *
 * DRY: default detection via `schema.parse({})` — ComponentDef.propsSchema is
 * the single source of truth for defaults.
 */

import type { JsonValue } from "@pageforge/ir";
import type { z } from "zod";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a props record to a JSX attribute string.
 * Only emits non-default props (omits props whose value equals the schema default).
 *
 * @param props  The node's actual props.
 * @param schema The Zod schema (all fields must have `.default()`).
 * @returns      A space-separated string of JSX attributes, e.g. `title="Hello" cols={3}`.
 */
export function serializeProps(
  props: Record<string, JsonValue>,
  schema: z.ZodObject<z.ZodRawShape>,
): string {
  let defaults: Record<string, unknown>;
  try {
    defaults = schema.parse({});
  } catch {
    defaults = {};
  }

  const parts: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    const defaultValue = defaults[key];
    // Skip if value equals default
    if (JSON.stringify(value) === JSON.stringify(defaultValue)) continue;
    // Skip null/undefined
    if (value === null || value === undefined) continue;

    parts.push(`${key}={${serializeValue(value)}}`);
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Value serializer
// ---------------------------------------------------------------------------

export function serializeValue(value: JsonValue): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    const items = value.map(v => serializeValue(v)).join(", ");
    return `[${items}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([k, v]) => `${k}: ${serializeValue(v)}`)
      .join(", ");
    return `{ ${entries} }`;
  }
  return "null";
}
