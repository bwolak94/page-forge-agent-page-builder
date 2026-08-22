"use client";

/**
 * CanvasHost — manages the canvas iframe, IframeBridge, and SelectionOverlay.
 *
 * Responsibilities (SRP):
 * - Creates and tears down the IframeBridge lifecycle.
 * - Sends doc.replace when the iframe reports ready.
 * - Collects node.bounds from the iframe and positions the SelectionOverlay.
 * - Propagates node.click/hover to the parent via callbacks.
 * - Resizes the iframe on breakpoint change.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Document, NodeId } from "@pageforge/ir";
import type { NodeBounds } from "@pageforge/contracts";
import { IframeBridge } from "./IframeBridge.js";
import { SelectionOverlay } from "./SelectionOverlay.js";
import { BreakpointBar, BREAKPOINTS } from "./BreakpointBar.js";

interface CanvasHostProps {
  docId: string;
  doc: Document;
  selectedIds: NodeId[];
  onNodeSelect: (ids: NodeId[]) => void;
}

export function CanvasHost({ docId, doc, selectedIds, onNodeSelect }: CanvasHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<IframeBridge | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [boundsMap, setBoundsMap] = useState<Map<NodeId, NodeBounds>>(new Map());
  const [hoveredId, setHoveredId] = useState<NodeId | null>(null);
  const [iframeOffset, setIframeOffset] = useState({ top: 0, left: 0 });
  const [activeWidth, setActiveWidth] = useState<number>(BREAKPOINTS[2].width);

  // Sync iframe offset whenever the window resizes
  const updateOffset = useCallback(() => {
    if (!iframeRef.current) return;
    const rect = iframeRef.current.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 };
    setIframeOffset({
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left,
    });
  }, []);

  // Create bridge on mount, tear down on unmount
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const bridge = new IframeBridge(iframe);
    bridgeRef.current = bridge;

    const unsubReady = bridge.on("ready", () => {
      bridge.send({ type: "doc.replace", doc });
      updateOffset();
    });

    const unsubBounds = bridge.on("node.bounds", msg => {
      const map = new Map<NodeId, NodeBounds>();
      for (const b of msg.bounds) map.set(b.id, b);
      setBoundsMap(map);
    });

    const unsubHover = bridge.on("node.hover", msg => {
      setHoveredId(msg.id);
    });

    const unsubClick = bridge.on("node.click", msg => {
      const next: NodeId[] = msg.multi
        ? selectedIds.includes(msg.id)
          ? selectedIds.filter(id => id !== msg.id)
          : [...selectedIds, msg.id]
        : [msg.id];
      onNodeSelect(next);
      bridge.send({ type: "selection.set", ids: next });
    });

    window.addEventListener("resize", updateOffset);

    return () => {
      unsubReady();
      unsubBounds();
      unsubHover();
      unsubClick();
      bridge.dispose();
      bridgeRef.current = null;
      window.removeEventListener("resize", updateOffset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // Re-send doc when it changes (after initial ready)
  useEffect(() => {
    bridgeRef.current?.send({ type: "doc.replace", doc });
  }, [doc]);

  // Sync selection into iframe
  useEffect(() => {
    bridgeRef.current?.send({ type: "selection.set", ids: selectedIds });
  }, [selectedIds]);

  function setBreakpoint(width: number) {
    setActiveWidth(width);
    if (iframeRef.current) {
      iframeRef.current.style.width = `${width}px`;
    }
    bridgeRef.current?.send({ type: "breakpoint.set", minWidth: width });
    updateOffset();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#111827",
      }}
    >
      <BreakpointBar activeWidth={activeWidth} onSelect={setBreakpoint} />

      {/* Scrollable canvas area */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center" }}>
        {/* Relative container for overlay positioning */}
        <div
          ref={containerRef}
          style={{ position: "relative", display: "inline-block", height: "fit-content" }}
        >
          <iframe
            ref={iframeRef}
            data-canvas
            src={`/canvas/${docId}`}
            style={{
              width: activeWidth,
              height: "100vh",
              border: "none",
              display: "block",
            }}
            title="Page canvas"
          />
          <SelectionOverlay
            selectedIds={selectedIds}
            hoveredId={hoveredId}
            boundsMap={boundsMap}
            iframeOffset={iframeOffset}
            onSelect={id => {
              const next = [id];
              onNodeSelect(next);
              bridgeRef.current?.send({ type: "selection.set", ids: next });
            }}
          />
        </div>
      </div>
    </div>
  );
}
