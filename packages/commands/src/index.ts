/**
 * @pageforge/commands — public API
 *
 * Zero IO. Exports the command interface, all 10 concrete commands,
 * the executor, the registry, and the undo stack.
 */

// Types
export type { Command, CommandResult, CommandError, RegistryInterface } from "./types.js";

// Executor
export { executeCommand } from "./executor.js";

// Registry
export { COMMAND_REGISTRY, COMMAND_KINDS } from "./registry.js";

// Undo stack
export { UndoStack } from "./undo-stack.js";

// Commands — exported for test assertions and agent tool schema reuse (T09)
export { insertNode, insertNodeSchema } from "./commands/insert-node.js";
export type { InsertNodeArgs } from "./commands/insert-node.js";

export { moveNode, moveNodeSchema } from "./commands/move-node.js";
export type { MoveNodeArgs } from "./commands/move-node.js";

export { updateProps, updatePropsSchema } from "./commands/update-props.js";
export type { UpdatePropsArgs } from "./commands/update-props.js";

export { deleteNode, deleteNodeSchema } from "./commands/delete-node.js";
export type { DeleteNodeArgs } from "./commands/delete-node.js";

export { wrapNode, wrapNodeSchema } from "./commands/wrap-node.js";
export type { WrapNodeArgs } from "./commands/wrap-node.js";

export { unwrapNode, unwrapNodeSchema } from "./commands/unwrap-node.js";
export type { UnwrapNodeArgs } from "./commands/unwrap-node.js";

export { duplicateNode, duplicateNodeSchema } from "./commands/duplicate-node.js";
export type { DuplicateNodeArgs } from "./commands/duplicate-node.js";

export { reorderSlot, reorderSlotSchema } from "./commands/reorder-slot.js";
export type { ReorderSlotArgs } from "./commands/reorder-slot.js";

export { applyTheme, applyThemeSchema } from "./commands/apply-theme.js";
export type { ApplyThemeArgs } from "./commands/apply-theme.js";

export { setMeta, setMetaSchema } from "./commands/set-meta.js";
export type { SetMetaArgs } from "./commands/set-meta.js";

export { addPage, addPageSchema } from "./commands/add-page.js";
export type { AddPageArgs } from "./commands/add-page.js";

export { removePage, removePageSchema } from "./commands/remove-page.js";
export type { RemovePageArgs } from "./commands/remove-page.js";

export { renamePage, renamePageSchema } from "./commands/rename-page.js";
export type { RenamePageArgs } from "./commands/rename-page.js";

export { switchPage, switchPageSchema } from "./commands/switch-page.js";
export type { SwitchPageArgs } from "./commands/switch-page.js";
