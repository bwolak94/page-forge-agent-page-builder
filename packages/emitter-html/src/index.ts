/**
 * @pageforge/emitter-html — public API
 *
 * Zero IO. Pure SSR: Document + Registry → HTML string.
 */

export { HtmlEmitter } from "./emitter.js";
export { renderIrToHtml } from "./ssr.js";
export { collectIslandScripts } from "./island-collector.js";
export type { NodeVisitor, EmitContext } from "./visitor.js";
