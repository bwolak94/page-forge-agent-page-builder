/**
 * @pageforge/emitter-react — public API
 *
 * Zero IO. All exports are pure types, classes, or functions.
 */

export type { EmitResult } from "./emitter.js";
export { ReactEmitter } from "./emitter.js";

export type { EmitContext, NodeVisitor } from "./visitor.js";

export { ImportCollector } from "./import-resolver.js";

export { serializeProps, serializeValue } from "./prop-serializer.js";

export { buildJsxElement, indent } from "./ast-helpers.js";

export {
  renderThemeCss,
  buildPackageJson,
  TAILWIND_CONFIG_TEMPLATE,
  TSCONFIG_TEMPLATE,
} from "./project-template.js";
