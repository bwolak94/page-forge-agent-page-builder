/**
 * executeCommand — the single write gateway to the document.
 *
 * Pipeline (Chain of Responsibility):
 *   1. Registry lookup  — unknown kind → UNKNOWN_COMMAND error
 *   2. Zod parse        — malformed args → VALIDATION_FAILED error
 *   3. cmd.validate     — domain pre-condition → VALIDATION_FAILED error
 *   4. produceWithPatches → Immer draft mutation
 *   5. validateDocument — IR post-condition → INVARIANT_VIOLATED error
 *
 * Returns Result<CommandResult, CommandError> — never throws.
 * Zero IO — pure function over immutable Document.
 */

import { ok, err } from "neverthrow";
import type { Result } from "neverthrow";
import { produceWithPatches, enablePatches, enableMapSet } from "immer";
import type { Patch as ImmerPatch } from "immer";
import type { Document, NodeId } from "@pageforge/ir";
import { validateDocument, toJsonPatch } from "@pageforge/ir";
import type { CommandResult, CommandError, RegistryInterface } from "./types.js";
import { COMMAND_REGISTRY } from "./registry.js";

// Ensure Immer plugins are active when this module loads.
enablePatches();
enableMapSet();

// ---------------------------------------------------------------------------
// Affected nodes — extracted from Immer patch paths
// ---------------------------------------------------------------------------

function computeAffected(immerPatches: ImmerPatch[]): NodeId[] {
  const ids = new Set<string>();
  for (const patch of immerPatches) {
    const seg0 = patch.path[0];
    const seg1 = patch.path[1];
    if (seg0 === "nodes" && typeof seg1 === "string") {
      ids.add(seg1);
    }
  }
  return [...ids] as NodeId[];
}

// ---------------------------------------------------------------------------
// executeCommand
// ---------------------------------------------------------------------------

/**
 * Execute a named command against a document.
 *
 * @param doc       — current document (not mutated)
 * @param _registry — component registry (used for canAccept checks in T04+)
 * @param kind      — command kind string (e.g. "insert-node")
 * @param rawArgs   — unvalidated args object from the agent or UI
 */
export function executeCommand(
  doc: Document,
  _registry: RegistryInterface,
  kind: string,
  rawArgs: unknown,
): Result<CommandResult, CommandError> {
  // 1. Registry lookup
  const cmd = COMMAND_REGISTRY[kind];
  if (!cmd) {
    return err({
      kind: "UNKNOWN_COMMAND",
      message: `Unknown command: "${kind}".`,
      hint: `Available commands: ${Object.keys(COMMAND_REGISTRY).join(", ")}.`,
    });
  }

  // 2. Zod parse
  const parsed = cmd.argsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return err({
      kind: "VALIDATION_FAILED",
      message: parsed.error.message,
      hint: "Check the command arguments schema.",
    });
  }

  // 3. Domain validation
  const valid = cmd.validate(doc, parsed.data);
  if (valid.isErr()) {
    return err({
      kind: "VALIDATION_FAILED",
      message: valid.error.message,
      hint: valid.error.hint,
      domainError: valid.error,
    });
  }

  // 4. Execute via Immer
  const [nextDoc, fwdImmer, invImmer] = produceWithPatches(doc, draft => {
    cmd.execute(draft, parsed.data);
  });

  // 5. Post-condition invariant check
  const invariantCheck = validateDocument(nextDoc);
  if (invariantCheck.isErr()) {
    return err({
      kind: "INVARIANT_VIOLATED",
      message: invariantCheck.error.message,
      hint: "This indicates a bug in the command implementation.",
    });
  }

  return ok({
    doc: nextDoc,
    patches: toJsonPatch(fwdImmer),
    inverse: toJsonPatch(invImmer),
    affected: computeAffected(fwdImmer),
  });
}
