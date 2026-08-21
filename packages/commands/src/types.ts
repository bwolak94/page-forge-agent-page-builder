/**
 * Command layer public types.
 *
 * Command<A>      — interface every command module must satisfy.
 * CommandResult   — successful execution output.
 * CommandError    — structured error returned by executeCommand.
 * RegistryInterface — minimal surface the executor needs from the component registry (T04).
 *
 * Zero IO — no imports beyond zod, neverthrow, and @pageforge/ir types.
 */

import type { z } from "zod";
import type { Draft } from "immer";
import type { Result } from "neverthrow";
import type { Document, NodeId, JsonValue } from "@pageforge/ir";
import type { DomainError } from "@pageforge/ir";
import type { JsonPatch } from "@pageforge/ir";

// ---------------------------------------------------------------------------
// Command interface
// ---------------------------------------------------------------------------

/**
 * A self-contained write operation on a Document.
 *
 * Lifecycle (enforced by executeCommand):
 *   1. argsSchema.safeParse(rawArgs)  — structural validation
 *   2. validate(doc, args)            — domain / pre-condition check
 *   3. produceWithPatches(doc, draft => execute(draft, args)) — mutation
 *   4. validateDocument(nextDoc)      — post-condition invariant check
 */
export interface Command<A = unknown> {
  /** Unique string identifier — used as the agent tool name. */
  readonly kind: string;

  /**
   * Zod schema for this command's arguments.
   * Reused verbatim as the agent tool parameter schema in T09.
   */
  /**
   * Input type is `unknown` because the executor always calls
   * `argsSchema.safeParse(rawArgs)` where rawArgs comes from the network.
   * Output type is `A` (the typed args used by validate/execute).
   */
  readonly argsSchema: z.ZodType<A, z.ZodTypeDef, unknown>;

  /**
   * Pure pre-condition check — must not mutate doc.
   * Returns Err with a DomainError if the operation cannot proceed.
   */
  validate(doc: Document, args: A): Result<void, DomainError>;

  /**
   * Immer draft mutation — only called when validate returns Ok.
   * Must not throw. Must not return a value.
   */
  execute(draft: Draft<Document>, args: A): void;
}

// ---------------------------------------------------------------------------
// Execution result
// ---------------------------------------------------------------------------

export interface CommandResult {
  /** New document after the command. Structurally shared with previous doc. */
  readonly doc: Document;
  /** Forward RFC 6902 patches (for event log + optimistic UI). */
  readonly patches: JsonPatch[];
  /** Inverse RFC 6902 patches (for undo stack). */
  readonly inverse: JsonPatch[];
  /**
   * NodeIds of nodes visibly changed by the command.
   * Derived from patch paths. Used for UI highlight and agent feedback.
   */
  readonly affected: NodeId[];
}

// ---------------------------------------------------------------------------
// Execution error
// ---------------------------------------------------------------------------

export interface CommandError {
  readonly kind: "VALIDATION_FAILED" | "INVARIANT_VIOLATED" | "UNKNOWN_COMMAND";
  readonly message: string;
  /**
   * Human-readable correction hint for the agent.
   * Included in the tool result string to steer the next model turn.
   */
  readonly hint?: string;
  readonly domainError?: DomainError;
}

// ---------------------------------------------------------------------------
// Registry interface — stub until T04 is implemented
// ---------------------------------------------------------------------------

/**
 * Minimal surface the commands executor needs from the component registry.
 * Implemented in packages/registry (T04). Injected via executeCommand.
 *
 * T03 commands perform IR-level validation only; registry-level checks
 * (canAccept, propsSchema) are invoked by the executor when a registry is provided.
 */
export interface RegistryInterface {
  /** Returns true if `childType` is a valid child in `slot` of `parentType`. */
  canAccept(parentType: string, childType: string, slot: string): boolean;
  /** Returns a Zod schema for the component's props, or null if type is unknown. */
  propsSchema(type: string): z.ZodTypeAny | null;
}

// ---------------------------------------------------------------------------
// Registry type alias used by executor
// ---------------------------------------------------------------------------

export type { JsonValue };
