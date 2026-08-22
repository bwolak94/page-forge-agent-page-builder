/**
 * errors.ts — structured error formatting for the ACL (Anti-Corruption Layer).
 *
 * Domain errors from the command layer are never exposed as exceptions.
 * Instead, they are formatted into human-readable hint strings that the
 * model can use to self-correct on the next step.
 */

import type { CommandError } from "@pageforge/commands";

/** Per-error-kind tips returned to the model alongside the error message. */
const ERROR_HINTS: Partial<Record<string, string>> = {
  CONSTRAINT_VIOLATION:
    "Check allowedParents for the component type and verify valid slots on the target parent. Use queryTree to inspect the current tree structure.",
  DANGLING_REF:
    "The referenced node does not exist in the document. Use queryTree to list valid node IDs.",
  PROPS_INVALID:
    "Props failed schema validation. Use listComponents to see required props and their types.",
  NOT_FOUND:
    "The target node was not found. Use queryTree to verify the node ID is correct.",
  UNKNOWN_COMMAND:
    "The command kind is not recognised. Available commands are listed in the tool descriptions.",
  INVARIANT_VIOLATED:
    "The operation would violate a document invariant (cycle, orphan, etc.). This is unexpected — report the issue.",
  VALIDATION_FAILED:
    "Argument validation failed. Check the tool parameter schema and try again with corrected values.",
};

/**
 * Format a CommandError into a string suitable for returning to the model
 * as a tool result. The model reads this and self-corrects without user input.
 */
export function formatDomainError(error: CommandError): string {
  const lines: string[] = [`Error: ${error.message}`];

  if (error.hint) lines.push(`Hint: ${error.hint}`);

  const tip = ERROR_HINTS[error.kind];
  if (tip) lines.push(`Tip: ${tip}`);

  return lines.join("\n");
}

/** Standard result shape returned from all tool handlers. */
export interface ToolResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/** Convenience constructor for a successful tool result. */
export function ok(data: Record<string, unknown>): ToolResult {
  return { ok: true, ...data };
}

/** Convenience constructor for a failed tool result (goes back to model). */
export function fail(message: string): ToolResult {
  return { ok: false, error: message };
}
