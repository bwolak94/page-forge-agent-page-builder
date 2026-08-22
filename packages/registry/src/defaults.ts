/**
 * Default props and node factories.
 *
 * `createDefaultProps(type)` — schema-driven: calls `propsSchema.parse({})`
 * so the schema's `.default()` values are the single source of truth.
 *
 * `createDefaultNode(type)` — wraps createDefaultProps + generates a nanoid.
 */

import { nanoid } from "nanoid";
import type { DocNode } from "@pageforge/ir";
import { nodeId } from "@pageforge/ir";
import type { Registry } from "./types.js";
import { REGISTRY } from "./registry.js";

// ---------------------------------------------------------------------------
// createDefaultProps
// ---------------------------------------------------------------------------

/**
 * Returns the default props for a component type by parsing an empty object
 * against the component's `propsSchema`.
 *
 * Throws if `type` is not in the registry or the schema lacks defaults.
 */
export function createDefaultProps(
  type: string,
  registry: Registry = REGISTRY,
): Record<string, unknown> {
  const def = registry[type];
  if (!def) throw new Error(`Unknown component type: "${type}"`);
  return def.propsSchema.parse({}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// createDefaultNode
// ---------------------------------------------------------------------------

/**
 * Returns a minimal `DocNode` for the given component type with:
 *   - A fresh nanoid-based NodeId
 *   - Default props from `createDefaultProps`
 *   - Empty slots matching the component's slot definitions
 */
export function createDefaultNode(
  type: string,
  registry: Registry = REGISTRY,
): DocNode {
  const def = registry[type];
  if (!def) throw new Error(`Unknown component type: "${type}"`);

  const id = nodeId(nanoid());
  const props = createDefaultProps(type, registry) as DocNode["props"];
  const slots: DocNode["slots"] = {};
  for (const slotName of Object.keys(def.slots)) {
    slots[slotName] = [];
  }

  return { id, type, props, slots };
}
