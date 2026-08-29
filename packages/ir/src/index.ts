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
  PageEntry,
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
  pageEntrySchema,
  documentSchema,
} from "./schemas.js";

// Errors
export type { InvariantCode, ValidationError, DomainError, DomainErrorKind } from "./errors.js";
export { domainError } from "./errors.js";

// Constants
export {
  SCHEMA_VERSION,
  ROOT_ID,
  HOME_PAGE_ID,
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

// Patches
export type { JsonPatch, PatchSet, SerializedPatchSet } from "./patches.js";
export {
  toJsonPatch,
  fromJsonPatch,
  applyPatches,
  invertPatches,
  serializePatchSet,
  deserializePatchSet,
} from "./patches.js";
export { jsonPatchSchema, patchSetSchema } from "./patches.schema.js";

// Normalize / builders
export type { NestedNode, NestedDocument } from "./normalize.js";
export {
  fromNestedTree,
  toNestedTree,
  makeDocument,
  makeMinimalDocument,
} from "./normalize.js";
