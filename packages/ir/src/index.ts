/**
 * @pageforge/ir — public API
 *
 * Zero IO. Everything exported here is a pure type, schema, constant, or function.
 * Importable from any package in the monorepo without violating boundary rules.
 */

// Types
export type {
  NodeId,
  NodeIdBrand,
  JsonValue,
  JsonPrimitive,
  JsonArray,
  JsonObject,
  DocNode,
  NodeMeta,
  ThemeTokens,
  Breakpoint,
  Document,
} from "./types.js";

export { nodeId } from "./types.js";

// Schemas
export {
  nodeIdSchema,
  docNodeSchema,
  nodeMetaSchema,
  themeTokensSchema,
  breakpointSchema,
  documentSchema,
  jsonPatchSchema,
  jsonPatchOpSchema,
  patchSetSchema,
  type JsonPatchSchema,
} from "./schemas.js";

// Errors
export type { InvariantCode, ValidationError, DomainError, DomainErrorKind } from "./errors.js";
export { domainError } from "./errors.js";

// Constants
export {
  SCHEMA_VERSION,
  ROOT_ID,
  DEFAULT_THEME,
  DEFAULT_BREAKPOINTS,
  EMPTY_DOCUMENT,
} from "./constants.js";

// Validation
export {
  validateDocument,
  checkAcyclicity,
  checkReferentialIntegrity,
  checkReachability,
  checkRootNotInSlot,
} from "./validate.js";

// Selectors
export {
  parentOf,
  slotOf,
  ancestors,
  pathTo,
  descendants,
  siblings,
  allNodeIds,
  subtreeSize,
} from "./selectors.js";

// Normalize / builders
export type { NestedNode, NestedDocument } from "./normalize.js";
export {
  fromNestedTree,
  toNestedTree,
  makeDocument,
  makeMinimalDocument,
} from "./normalize.js";
