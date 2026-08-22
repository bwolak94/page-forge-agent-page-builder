import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IframeBridge } from "../components/canvas/IframeBridge.js";
import type { FrameMessage, NodeId } from "@pageforge/contracts";
import { nodeId } from "@pageforge/ir";

function makeIframe(postMessageFn = vi.fn()): HTMLIFrameElement {
  return {
    contentWindow: { postMessage: postMessageFn } as unknown as Window,
  } as HTMLIFrameElement;
}

function dispatch(data: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data }));
}

describe("IframeBridge", () => {
  let bridge: IframeBridge;

  afterEach(() => {
    bridge.dispose();
  });

  it("dispatches typed messages to registered handlers", () => {
    bridge = new IframeBridge(makeIframe());
    const handler = vi.fn();
    bridge.on("ready", handler);

    dispatch({ type: "ready" });

    expect(handler).toHaveBeenCalledWith({ type: "ready" });
  });

  it("passes correct payload for node.hover", () => {
    bridge = new IframeBridge(makeIframe());
    const handler = vi.fn();
    bridge.on("node.hover", handler);

    const id = nodeId("n1") as unknown as string;
    dispatch({ type: "node.hover", id });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "node.hover", id: "n1" }),
    );
  });

  it("ignores malformed messages silently", () => {
    bridge = new IframeBridge(makeIframe());
    const handler = vi.fn();
    bridge.on("ready", handler);

    dispatch({ type: "unknown.garbage", foo: 42 });
    dispatch("not-an-object");
    dispatch(null);

    expect(handler).not.toHaveBeenCalled();
  });

  it("returns an unsubscribe function that stops delivery", () => {
    bridge = new IframeBridge(makeIframe());
    const handler = vi.fn();
    const unsub = bridge.on("ready", handler);

    unsub();
    dispatch({ type: "ready" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("allows multiple handlers for the same message type", () => {
    bridge = new IframeBridge(makeIframe());
    const h1 = vi.fn();
    const h2 = vi.fn();
    bridge.on("ready", h1);
    bridge.on("ready", h2);

    dispatch({ type: "ready" });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("sends messages to the iframe contentWindow", () => {
    const postMessage = vi.fn();
    bridge = new IframeBridge(makeIframe(postMessage));

    bridge.send({ type: "breakpoint.set", minWidth: 768 });

    expect(postMessage).toHaveBeenCalledWith({ type: "breakpoint.set", minWidth: 768 }, "*");
  });

  it("sends selection.set correctly", () => {
    const postMessage = vi.fn();
    bridge = new IframeBridge(makeIframe(postMessage));
    const ids: NodeId[] = [nodeId("a"), nodeId("b")];

    bridge.send({ type: "selection.set", ids });

    expect(postMessage).toHaveBeenCalledWith(
      { type: "selection.set", ids },
      "*",
    );
  });

  it("after dispose() stops handling messages", () => {
    bridge = new IframeBridge(makeIframe());
    const handler = vi.fn();
    bridge.on("ready", handler);

    bridge.dispose();
    dispatch({ type: "ready" });

    expect(handler).not.toHaveBeenCalled();

    // Re-create for afterEach cleanup
    bridge = new IframeBridge(makeIframe());
  });
});
