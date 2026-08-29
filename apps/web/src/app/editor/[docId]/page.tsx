"use client";

/**
 * Editor page — full editor shell with ComponentPalette + LayerPanel + Canvas.
 *
 * T05: canvas panel + iframe renderer.
 * T06: LayerPanel (virtualized tree) + DndProvider (proxy-zone DnD)
 *      + ComponentPalette (draggable new nodes).
 *
 * Uses a fixture document until persistence (T08) is wired.
 * Initialises editorStore.doc with FIXTURE_DOCUMENT on mount so that
 * useDropzones, LayerPanel, and CanvasHost all read from the same source.
 */

import { use, useEffect } from "react";
import { DndProvider } from "@/components/dnd/DndProvider";
import { CanvasHost } from "@/components/canvas/CanvasHost";
import { LayerPanel } from "@/components/layer-panel/LayerPanel";
import { ComponentLibrary } from "@/components/library/ComponentLibrary";
import { Inspector } from "@/components/inspector/Inspector";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PageBar } from "@/components/pages/PageBar";
import { PreviewBar } from "@/components/chat/PreviewBar";
import { useEditorStore } from "@/stores/editorStore";
import { FIXTURE_DOCUMENT } from "@/lib/fixtureDocument";

interface EditorPageProps {
  params: Promise<{ docId: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const { docId } = use(params);

  const setDoc = useEditorStore(s => s.setDoc);
  const canUndo = useEditorStore(s => s.canUndo);
  const undo = useEditorStore(s => s.undo);

  // Initialise the store with the fixture document once on mount.
  useEffect(() => {
    setDoc(FIXTURE_DOCUMENT);
  }, [setDoc]);

  return (
    <DndProvider>
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
            background: "#0f172a",
            borderBottom: "1px solid #1e293b",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#6366f1", fontWeight: 700, fontSize: 15, letterSpacing: -0.5 }}>
            PageForge
          </span>
          <span style={{ color: "#334155", fontSize: 12, marginLeft: 4 }}>/ {docId}</span>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              data-testid="undo-btn"
              disabled={!canUndo}
              onClick={undo}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "1px solid #334155",
                background: canUndo ? "#1e293b" : "transparent",
                color: canUndo ? "#cbd5e1" : "#475569",
                cursor: canUndo ? "pointer" : "default",
                fontSize: 12,
              }}
            >
              Undo
            </button>
          </div>
        </header>

        {/* Page tab bar */}
        <PageBar />

        {/* Main layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Component library browser */}
          <ComponentLibrary />

          {/* Layer panel sidebar */}
          <aside style={{ width: 220, flexShrink: 0 }}>
            <LayerPanel />
          </aside>

          {/* Canvas */}
          <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <CanvasHost docId={docId} />
          </main>

          {/* Inspector */}
          <Inspector docId={docId} />

          {/* Chat panel */}
          <aside style={{ width: 280, flexShrink: 0 }}>
            <ChatPanel docId={docId} />
          </aside>
        </div>
      </div>

      {/* Agent preview accept/reject bar — floats above canvas */}
      <PreviewBar docId={docId} />
    </DndProvider>
  );
}
