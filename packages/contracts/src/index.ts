/**
 * @pageforge/contracts — public API
 *
 * Typed postMessage bridge protocol and SSE event types.
 * Zero IO. Safe to import from any package.
 */

export type {
  NodeBounds,
  ParentMessage,
  FrameMessage,
} from "./bridge.js";

export {
  nodeBoundsSchema,
  parentMessageSchema,
  frameMessageSchema,
} from "./bridge.js";

export type { SseEvent } from "./sse.js";
export { sseEventSchema } from "./sse.js";
