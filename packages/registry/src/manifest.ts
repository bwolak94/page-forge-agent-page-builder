/**
 * registryManifest — compact text representation of the registry for the agent system prompt.
 *
 * Target: ~800 tokens for 15 components (one block per component).
 * Format:
 *   TypeName · category · One-sentence description
 *     props: name(type) …
 *     slots: slotName→[AcceptedTypes]  …
 *     parents: ParentA ParentB …
 */

import { z } from "zod";
import type { ComponentDef, Registry } from "./types.js";

// ---------------------------------------------------------------------------
// Prop type label helpers
// ---------------------------------------------------------------------------

function zodLabel(schema: z.ZodTypeAny): string {
  const inner = unwrap(schema);
  if (inner instanceof z.ZodString) return "str";
  if (inner instanceof z.ZodNumber) return "num";
  if (inner instanceof z.ZodBoolean) return "bool";
  if (inner instanceof z.ZodEnum) return (inner.options as string[]).join("|");
  if (inner instanceof z.ZodArray) return `${zodLabel(inner.element)}[]`;
  if (inner instanceof z.ZodObject) return "obj";
  return "any";
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodDefault) return unwrap(schema._def.innerType as z.ZodTypeAny);
  if (schema instanceof z.ZodOptional) return unwrap(schema._def.innerType as z.ZodTypeAny);
  return schema;
}

// ---------------------------------------------------------------------------
// Single component entry formatter
// ---------------------------------------------------------------------------

function formatEntry(def: ComponentDef): string {
  const shape = def.propsSchema.shape as Record<string, z.ZodTypeAny>;

  // Top 5 props by natural order
  const propEntries = Object.entries(shape)
    .slice(0, 5)
    .map(([name, schema]) => `${name}(${zodLabel(schema)})`)
    .join(" ");

  const slotEntries = Object.entries(def.slots)
    .map(([name, slot]) => `${name}→[${slot.accepts.join(",")}]`)
    .join("  ");

  const parents =
    def.allowedParents.length === 0 ? "root-only" : def.allowedParents.join(" ");

  const lines = [
    `${def.type} · ${def.category} · ${def.description}`,
    `  props: ${propEntries}`,
  ];
  if (slotEntries) lines.push(`  slots: ${slotEntries}`);
  lines.push(`  parents: ${parents}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// registryManifest
// ---------------------------------------------------------------------------

/**
 * Build a compact, stable manifest string suitable for injection into the
 * agent system prompt. Sorted alphabetically for determinism.
 */
export function registryManifest(registry: Registry): string {
  return Object.values(registry)
    .sort((a, b) => a.type.localeCompare(b.type))
    .map(formatEntry)
    .join("\n\n");
}
