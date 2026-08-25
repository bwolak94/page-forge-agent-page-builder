/**
 * empty-doc.ts — minimal starting document for eval tasks.
 * A Page with no children — the agent must build from scratch.
 */

import { fromNestedTree } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";

export const EMPTY_DOCUMENT: Document = fromNestedTree({
  root: { type: "Page", props: { title: "Untitled" }, slots: { children: [] } },
});
