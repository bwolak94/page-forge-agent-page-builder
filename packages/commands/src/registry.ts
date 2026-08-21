/**
 * COMMAND_REGISTRY — maps command kind strings to Command implementations.
 *
 * Open/Closed: adding a command = new file + entry here. Executor unchanged.
 */

import type { Command } from "./types.js";
import { insertNode } from "./commands/insert-node.js";
import { moveNode } from "./commands/move-node.js";
import { updateProps } from "./commands/update-props.js";
import { deleteNode } from "./commands/delete-node.js";
import { wrapNode } from "./commands/wrap-node.js";
import { unwrapNode } from "./commands/unwrap-node.js";
import { duplicateNode } from "./commands/duplicate-node.js";
import { reorderSlot } from "./commands/reorder-slot.js";
import { applyTheme } from "./commands/apply-theme.js";
import { setMeta } from "./commands/set-meta.js";

export const COMMAND_REGISTRY: Record<string, Command<unknown>> = {
  [insertNode.kind]: insertNode as Command<unknown>,
  [moveNode.kind]: moveNode as Command<unknown>,
  [updateProps.kind]: updateProps as Command<unknown>,
  [deleteNode.kind]: deleteNode as Command<unknown>,
  [wrapNode.kind]: wrapNode as Command<unknown>,
  [unwrapNode.kind]: unwrapNode as Command<unknown>,
  [duplicateNode.kind]: duplicateNode as Command<unknown>,
  [reorderSlot.kind]: reorderSlot as Command<unknown>,
  [applyTheme.kind]: applyTheme as Command<unknown>,
  [setMeta.kind]: setMeta as Command<unknown>,
};

/** Ordered list of all registered command kind strings. */
export const COMMAND_KINDS = Object.keys(COMMAND_REGISTRY);
