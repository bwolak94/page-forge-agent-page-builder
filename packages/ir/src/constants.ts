/**
 * Stable constants shared across the monorepo.
 * Zero dependencies — safe to import anywhere.
 */

import { nodeId } from "./types.js";
import type { Document, ThemeTokens } from "./types.js";

// ---------------------------------------------------------------------------
// Schema versioning
// ---------------------------------------------------------------------------

/** Increment when the shape of Document or DocNode changes breaking compatibility. */
export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** The root node's fixed id. Always the Page node. */
export const ROOT_ID = nodeId("root");

// ---------------------------------------------------------------------------
// Default theme — all values are CSS custom property references
// ---------------------------------------------------------------------------

export const DEFAULT_THEME: ThemeTokens = {
  colors: {
    primary: "var(--pf-color-primary)",
    secondary: "var(--pf-color-secondary)",
    background: "var(--pf-color-background)",
    surface: "var(--pf-color-surface)",
    text: "var(--pf-color-text)",
    muted: "var(--pf-color-muted)",
    border: "var(--pf-color-border)",
    accent: "var(--pf-color-accent)",
  },
  spacing: {
    xs: "var(--pf-spacing-xs)",
    sm: "var(--pf-spacing-sm)",
    md: "var(--pf-spacing-md)",
    lg: "var(--pf-spacing-lg)",
    xl: "var(--pf-spacing-xl)",
    "2xl": "var(--pf-spacing-2xl)",
  },
  radii: {
    sm: "var(--pf-radius-sm)",
    md: "var(--pf-radius-md)",
    lg: "var(--pf-radius-lg)",
    full: "var(--pf-radius-full)",
  },
  fonts: {
    sans: "var(--pf-font-sans)",
    mono: "var(--pf-font-mono)",
  },
  scale: {
    xs: "var(--pf-scale-xs)",
    sm: "var(--pf-scale-sm)",
    base: "var(--pf-scale-base)",
    lg: "var(--pf-scale-lg)",
    xl: "var(--pf-scale-xl)",
    "2xl": "var(--pf-scale-2xl)",
    "3xl": "var(--pf-scale-3xl)",
  },
};

// ---------------------------------------------------------------------------
// Default breakpoints
// ---------------------------------------------------------------------------

export const DEFAULT_BREAKPOINTS = [
  { id: "mobile", label: "Mobile", minWidth: 0 },
  { id: "tablet", label: "Tablet", minWidth: 768 },
  { id: "desktop", label: "Desktop", minWidth: 1280 },
] as const;

// ---------------------------------------------------------------------------
// Empty document — a valid minimal Document with only the root Page node
// ---------------------------------------------------------------------------

export const EMPTY_DOCUMENT: Document = {
  schemaVersion: SCHEMA_VERSION,
  root: ROOT_ID,
  nodes: {
    [ROOT_ID]: {
      id: ROOT_ID,
      type: "Page",
      props: { title: "Untitled page", lang: "en" },
      slots: { children: [] },
    },
  },
  theme: DEFAULT_THEME,
  breakpoints: [...DEFAULT_BREAKPOINTS],
};
