/**
 * UndoStack — Memento-pattern undo history using inverse patch arrays.
 *
 * Memory cost: O(total patches across history), not O(document snapshots).
 *
 * Redo is intentionally omitted. Re-executing the original command is safer
 * than re-applying forward patches because the document may have been mutated
 * by the agent between undo and redo.
 */

import type { Document } from "@pageforge/ir";
import { applyPatches } from "@pageforge/ir";
import type { JsonPatch } from "@pageforge/ir";

export class UndoStack {
  private readonly past: JsonPatch[][] = [];
  private readonly limit: number;

  /**
   * @param limit — maximum number of undo steps retained. Older entries are dropped.
   */
  constructor(limit = 100) {
    this.limit = limit;
  }

  /** Record the inverse patches from a successful command execution. */
  push(inverse: JsonPatch[]): void {
    if (inverse.length === 0) return; // no-op commands produce no history entry
    this.past.push(inverse);
    if (this.past.length > this.limit) {
      this.past.shift(); // drop oldest
    }
  }

  /**
   * Undo the last command by applying its inverse patches to `doc`.
   * Returns `null` if there is nothing to undo.
   */
  undo(doc: Document): { doc: Document; patches: JsonPatch[] } | null {
    const inverse = this.past.pop();
    if (!inverse) return null;
    return { doc: applyPatches(doc, inverse), patches: inverse };
  }

  /** True when at least one undo step is available. */
  get canUndo(): boolean {
    return this.past.length > 0;
  }

  /** Number of undo steps currently stored. */
  get size(): number {
    return this.past.length;
  }

  /** Clear all history. */
  clear(): void {
    this.past.length = 0;
  }
}
