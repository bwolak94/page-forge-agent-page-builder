/**
 * Core types for the component registry.
 *
 * `ComponentDef<P>` is the single definition that feeds:
 *   - Canvas renderer (T05)
 *   - Props inspector form (T07)
 *   - Agent tool schema (T09)
 *   - Constraint validator (canAccept)
 *   - React emitter (T12) and HTML SSR emitter (T13)
 *
 * Zero IO — no imports beyond zod and react types.
 */

import type React from "react";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

/** Rendering mode for the HTML emitter. */
export type Runtime = "static" | "island";

// ---------------------------------------------------------------------------
// SlotDef
// ---------------------------------------------------------------------------

export interface SlotDef {
  /**
   * Component type keys this slot accepts.
   * Use `["*"]` for an unconstrained slot.
   */
  accepts: string[];
  /** Minimum number of children. Default: 0. */
  min?: number;
  /** Maximum number of children. Default: Infinity. */
  max?: number;
  /** Human-readable label for the inspector drag-drop zone. */
  label?: string;
}

// ---------------------------------------------------------------------------
// ComponentDef
// ---------------------------------------------------------------------------

/**
 * Self-contained description of a component.
 *
 * P — the props type inferred from `propsSchema`.
 * The generic is intentionally covariant-only: consumers cast to
 * `ComponentDef<Record<string, unknown>>` when storing in the registry map.
 */
export interface ComponentDef<P extends Record<string, unknown> = Record<string, unknown>> {
  /** Registry key — matches the component table naming convention. */
  type: string;

  /** Human-readable category used in the agent manifest and inspector sidebar. */
  category: "layout" | "typography" | "media" | "interactive" | "commerce" | "navigation";

  /** One-sentence description for the agent system prompt and inspector tooltip. */
  description: string;

  /**
   * Zod schema for this component's props.
   * Single source of truth for:
   *   [1] TypeScript types  [2] Zod validation  [3] Inspector form fields
   *   [4] Agent tool schema (T09)  [5] Default props generation
   *
   * Every field MUST have a `.default()` so `propsSchema.parse({})` succeeds.
   */
  propsSchema: z.ZodObject<z.ZodRawShape>;

  /**
   * Named child slots with acceptance constraints.
   * Empty object means the component accepts no children.
   */
  slots: Record<string, SlotDef>;

  /**
   * Component types that may contain this component.
   * Empty array means root-level only (cannot appear inside any component).
   */
  allowedParents: string[];

  /** Rendering mode for the HTML emitter. */
  runtime: Runtime;

  /**
   * Import path used by the React emitter (T12) when generating page code.
   * e.g. "@pageforge/registry/components/button"
   */
  importPath: string;

  /**
   * React component implementation.
   * Shared between the canvas renderer (T05) and the HTML SSR emitter (T13).
   */
  Component: React.ComponentType<P & { children?: React.ReactNode }>;

  /**
   * Vanilla JS bootstrap snippet for island hydration (T13).
   * Omit for purely static components.
   */
  emitHtmlRuntime?: string;
}

// ---------------------------------------------------------------------------
// Registry alias
// ---------------------------------------------------------------------------

export type Registry = Record<string, ComponentDef>;
