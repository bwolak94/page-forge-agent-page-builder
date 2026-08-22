"use client";

/**
 * CanvasHost — manages the canvas iframe, IframeBridge, SelectionOverlay,
 * and proxy DnD elements (ProxyDropzone + InsertionIndicator).
 *
 * Reads doc / selectedIds from editorStore and writes boundsMap /
 * iframeOffset back into the store so useDropzones has geometry data.
 *
 * DnD proxy zones are mounted only while a drag is active (dragItem ≠ null)
 * and only for legal drop targets (computed by useDropzones).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { NodeId } from "@pageforge/ir";
import type { NodeBounds } from "@pageforge/contracts";
import { IframeBridge } from "./IframeBridge.js";
import { SelectionOverlay } from "./SelectionOverlay.js";
import { BreakpointBar, BREAKPOINTS } from "./BreakpointBar.js";
import { ProxyDropzone } from "../dnd/ProxyDropzone.js";
import { InsertionIndicator } from "../dnd/InsertionIndicator.js";
import { useDropzones } from "../dnd/useDropzones.js";
import { useEditorStore } from "../../stores/editorStore.js";
import { useDndStore } from "../../stores/dndStore.js";

interface CanvasHostProps {
  docId: string;
}

export function CanvasHost({ docId }: CanvasHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<IframeBridge | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredId, setHoveredId] = useState<NodeId | null>(null);
  const [activeWidth, setActiveWidth] = useState<number>(BREAKPOINTS[2].width);

  // Store reads
  const doc = useEditorStore(s => s.doc);
  const selectedIds = useEditorStore(s => s.selectedIds);
  const boundsMap = useEditorStore(s => s.boundsMap);
  const iframeOffset = useEditorStore(s => s.iframeOffset);
  const setSelectedIds = useEditorStore(s => s.setSelectedIds);
  const setBoundsMap = useEditorStore(s => s.setBoundsMap);
  const setIframeOffset = useEditorStore(s => s.setIframeOffset);

  // DnD state
  const dragItem = useDndStore(s => s.dragItem);
  const activeZoneId = useDndStore(s => s.activeZoneId);
  const dropzones = useDropzones(dragItem);

  // Sync iframe offset whenever the window resizes
  const updateOffset = useCallback(() => {
    if (!iframeRef.current) return;
    const rect = iframeRef.current.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 };
    setIframeOffset({
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left,
    });
  }, [setIframeOffset]);

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
      const current = useEditorStore.getState().selectedIds;
      const next: NodeId[] = msg.multi
        ? current.includes(msg.id)
          ? current.filter(id => id !== msg.id)
          : [...current, msg.id]
        : [msg.id];
      setSelectedIds(next);
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

  // Re-send doc when it changes
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

  const activeZone = activeZoneId ? dropzones.find(z => z.id === activeZoneId) : null;

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

          {/* Overlay: selection boxes + proxy DnD zones */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <SelectionOverlay
              selectedIds={selectedIds}
              hoveredId={hoveredId}
              boundsMap={boundsMap}
              iframeOffset={iframeOffset}
              onSelect={id => {
                const next = [id];
                setSelectedIds(next);
                bridgeRef.current?.send({ type: "selection.set", ids: next });
              }}
            />

            {/* Proxy dropzones — only mounted during an active drag */}
            {dragItem &&
              dropzones.map(zone => (
                <ProxyDropzone
                  key={zone.id}
                  id={zone.id}
                  rect={zone.rect}
                  isActive={true}
                />
              ))}

            {/* Insertion indicator for the currently hovered zone */}
            {activeZone && <InsertionIndicator rect={activeZone.rect} />}
          </div>
        </div>
      </div>
    </div>
  );
}
