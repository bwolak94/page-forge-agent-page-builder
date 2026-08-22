/**
 * IframeBridge — Mediator for all postMessage traffic between the editor shell
 * and the canvas iframe.
 *
 * No component sends postMessages directly; all traffic flows through this class.
 * Validates incoming messages with Zod — malformed messages are silently ignored.
 */

import { frameMessageSchema } from "@pageforge/contracts";
import type { ParentMessage, FrameMessage } from "@pageforge/contracts";

export class IframeBridge {
  private readonly iframe: HTMLIFrameElement;
  private readonly listeners = new Map<
    FrameMessage["type"],
    Set<(msg: FrameMessage) => void>
  >();

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    window.addEventListener("message", this.handleMessage);
  }

  /** Send a typed message to the iframe. */
  send(msg: ParentMessage): void {
    this.iframe.contentWindow?.postMessage(msg, "*");
  }

  /**
   * Subscribe to a specific FrameMessage type.
   * Returns an unsubscribe function.
   */
  on<T extends FrameMessage["type"]>(
    type: T,
    handler: (msg: Extract<FrameMessage, { type: T }>) => void,
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    const h = handler as (msg: FrameMessage) => void;
    set.add(h);
    return () => {
      set.delete(h);
    };
  }

  /** Remove the window message listener and clear all subscriptions. */
  dispose(): void {
    window.removeEventListener("message", this.handleMessage);
    this.listeners.clear();
  }

  private handleMessage = (event: MessageEvent): void => {
    const parsed = frameMessageSchema.safeParse(event.data);
    if (!parsed.success) return;
    const msg = parsed.data;
    const handlers = this.listeners.get(msg.type);
    if (!handlers) return;
    handlers.forEach(h => h(msg));
  };
}
