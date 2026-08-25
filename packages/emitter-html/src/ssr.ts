/**
 * ssr.ts — renderIrToHtml: Document + Registry → full HTML document string.
 *
 * The output is a self-contained HTML page that:
 * - references styles.css (generated separately by Tailwind CLI)
 * - embeds theme CSS custom properties in a <style> tag
 * - embeds island hydration scripts at end of <body>
 *
 * This function is the single entry point used by the build worker job.
 */

import type { Document, ThemeTokens } from "@pageforge/ir";
import type { Registry } from "@pageforge/registry";
import { HtmlEmitter } from "./emitter.js";
import { collectIslandScripts } from "./island-collector.js";
import type { EmitContext } from "./visitor.js";

// ---------------------------------------------------------------------------
// renderIrToHtml
// ---------------------------------------------------------------------------

/**
 * Render a PageForge Document to a full static HTML document string.
 *
 * @param doc      - The document to render.
 * @param registry - Component registry (same registry used by the canvas).
 * @returns        Full HTML document as a string.
 */
export function renderIrToHtml(doc: Document, registry: Registry): string {
  const emitter = new HtmlEmitter(registry);
  const ctx: EmitContext = { doc, registry };

  const rootNode = doc.nodes[doc.root];
  if (!rootNode) throw new Error(`Root node "${doc.root}" not found in document`);

  const bodyHtml = emitter.visit(rootNode, ctx);
  const islandScripts = collectIslandScripts(doc, registry);
  const themeVars = renderThemeCssVars(doc.theme);

  const islandScriptTags = islandScripts.map(s => `  <script>${s}</script>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="styles.css" />
  <style>
    :root {
${themeVars}
    }
  </style>
</head>
<body>
  ${bodyHtml}
${islandScriptTags}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// renderThemeCssVars — inline :root vars from ThemeTokens
// ---------------------------------------------------------------------------

function renderThemeCssVars(theme: ThemeTokens): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(theme.colors)) {
    lines.push(`      --pf-color-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.spacing)) {
    lines.push(`      --pf-spacing-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(theme.radii)) {
    lines.push(`      --pf-radius-${key}: ${value};`);
  }
  if (theme.fonts.sans) lines.push(`      --pf-font-sans: ${theme.fonts.sans};`);
  if (theme.fonts.serif) lines.push(`      --pf-font-serif: ${theme.fonts.serif};`);
  if (theme.fonts.mono) lines.push(`      --pf-font-mono: ${theme.fonts.mono};`);
  for (const [key, value] of Object.entries(theme.scale)) {
    lines.push(`      --pf-scale-${key}: ${value};`);
  }

  return lines.join("\n");
}
