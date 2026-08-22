"use client";

/**
 * FrameEntry — the root component rendered inside the canvas iframe.
 *
 * Lifecycle:
 * 1. On mount: sends { type: "ready" } to parent.
 * 2. On "doc.replace": sets the full document state.
 * 3. On "doc.patch": applies JSON patches to the document (preserves scroll position).
 * 4. Wires click and hover events back to the parent via postMessage.
 */

import { useState, useEffect, useCallback } from "react";
import type { Document, NodeId } from "@pageforge/ir";
import { applyPatches, nodeId } from "@pageforge/ir";
import { REGISTRY } from "@pageforge/registry";
import { parentMessageSchema } from "@pageforge/contracts";
import { IrRenderer } from "./IrRenderer.js";
import { BoundsPublisher } from "./BoundsPublisher.js";

export function FrameEntry() {
  const [doc, setDoc] = useState<Document | null>(null);

  // Listen for messages from the parent editor
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const parsed = parentMessageSchema.safeParse(event.data);
      if (!parsed.success) return;
      const msg = parsed.data;

      if (msg.type === "doc.replace") {
        setDoc(msg.doc);
      } else if (msg.type === "doc.patch") {
        setDoc(prev => (prev ? applyPatches(prev, msg.patches) : prev));
      }
    }

    window.addEventListener("message", handleMessage);
    // Signal parent that the frame is ready to receive messages
    window.parent.postMessage({ type: "ready" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Wire hover events
  const handleMouseOver = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const el = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
    const id = el?.dataset["nodeId"] ?? null;
    window.parent.postMessage({ type: "node.hover", id: id ? nodeId(id) : null }, "*");
  }, []);

  const handleMouseLeave = useCallback(() => {
    window.parent.postMessage({ type: "node.hover", id: null }, "*");
  }, []);

  // Wire click events
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const el = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
    if (!el?.dataset["nodeId"]) return;
    window.parent.postMessage(
      {
        type: "node.click",
        id: nodeId(el.dataset["nodeId"]),
        multi: event.metaKey || event.ctrlKey || event.shiftKey,
      },
      "*",
    );
  }, []);

  if (!doc) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#6b7280",
          fontFamily: "sans-serif",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <>
      <BoundsPublisher />
      <div
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ minHeight: "100vh" }}
      >
        <IrRenderer doc={doc} nodeId={doc.root} registry={REGISTRY} />
      </div>
    </>
  );
}
