/**
 * Theme re-export + CSS custom property helper.
 *
 * Components reference tokens exclusively through CSS custom properties.
 * No hardcoded colors, spacing, or radii anywhere in the registry.
 */

export { DEFAULT_THEME, DEFAULT_BREAKPOINTS } from "@pageforge/ir";

/**
 * Returns a CSS `var()` reference for a PageForge design token.
 *
 * @example
 * tokenVar("color-primary")   // → "var(--pf-color-primary)"
 * tokenVar("spacing-md")      // → "var(--pf-spacing-md)"
 */
export function tokenVar(key: string): string {
  return `var(--pf-${key})`;
}
