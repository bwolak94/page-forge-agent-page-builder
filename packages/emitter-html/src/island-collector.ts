/**
 * island-collector.ts — scan the document for nodes whose ComponentDef
 * has `runtime: "island"` and collect their JS bootstrap snippets.
 *
 * Islands are interactive components that need vanilla-JS hydration at
 * runtime. The snippets are embedded at end of <body> in the exported HTML.
 */

import type { Document } from "@pageforge/ir";
import type { Registry } from "@pageforge/registry";

// ---------------------------------------------------------------------------
// collectIslandScripts
// ---------------------------------------------------------------------------

/**
 * Walk every node in the document and collect unique `emitHtmlRuntime`
 * snippets from registry components marked as `runtime: "island"`.
 *
 * Returns deduplicated scripts in document order (first occurrence wins).
 */
export function collectIslandScripts(doc: Document, registry: Registry): string[] {
  const seen = new Set<string>();
  const scripts: string[] = [];

  for (const node of Object.values(doc.nodes)) {
    const def = registry[node.type];
    if (!def || def.runtime !== "island" || !def.emitHtmlRuntime) continue;

    if (!seen.has(def.emitHtmlRuntime)) {
      seen.add(def.emitHtmlRuntime);
      scripts.push(def.emitHtmlRuntime);
    }
  }

  return scripts;
}
