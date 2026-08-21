/**
 * Typed error types for the IR and command layers.
 *
 * Domain errors are VALUES (neverthrow Result), not thrown exceptions.
 * The commands layer returns `Result<T, DomainError>` — never throws.
 */

// ---------------------------------------------------------------------------
// Invariant violation codes
// ---------------------------------------------------------------------------

export type InvariantCode =
  | "CYCLIC"           // a node is its own ancestor
  | "DANGLING_REF"     // a slot references a NodeId not in nodes map
  | "ORPHAN"           // a node is not reachable from root
  | "ROOT_IN_SLOT"     // root node appears as a child of another node
  | "CONSTRAINT_VIOLATION" // child type not accepted by parent slot
  | "PROPS_INVALID";   // props fail the registry Zod schema

export interface ValidationError {
  readonly code: InvariantCode;
  readonly message: string;
  /** The node that caused the violation, if applicable. */
  readonly nodeId?: string;
}

// ---------------------------------------------------------------------------
// Domain error — returned by commands and selectors
// ---------------------------------------------------------------------------

export type DomainErrorKind =
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "CONSTRAINT_VIOLATION"
  | "INVARIANT_VIOLATED"
  | "INVALID_ARGS"
  | "LOCKED"
  | "ROOT_IMMUTABLE";

export interface DomainError {
  readonly kind: DomainErrorKind;
  readonly message: string;
  /**
   * Short suggestion for the agent to self-correct.
   * Included in tool result strings to steer next model turn.
   */
  readonly hint?: string;
  readonly nodeId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function domainError(
  kind: DomainErrorKind,
  message: string,
  opts?: { hint?: string; nodeId?: string },
): DomainError {
  return { kind, message, ...opts };
}
