"use client";

/**
 * Editor page — full editor shell with LayerPanel + Canvas.
 *
 * T05: canvas panel + iframe renderer.
 * T06: LayerPanel (virtualized tree) + DndProvider (proxy-zone DnD).
 *
 * Uses a fixture document until persistence (T08) is wired.
 */

import { use } from "react";
import { DndProvider } from "@/components/dnd/DndProvider";
import { CanvasHost } from "@/components/canvas/CanvasHost";
import { LayerPanel } from "@/components/layer-panel/LayerPanel";
import { useEditorStore } from "@/stores/editorStore";
import { FIXTURE_DOCUMENT } from "@/lib/fixtureDocument";

interface EditorPageProps {
  params: Promise<{ docId: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const { docId } = use(params);

  const selectedIds = useEditorStore(s => s.selectedIds);
  const setSelectedIds = useEditorStore(s => s.setSelectedIds);
  const canUndo = useEditorStore(s => s.canUndo);
  const undo = useEditorStore(s => s.undo);

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

        {/* Main layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Layer panel sidebar */}
          <aside style={{ width: 220, flexShrink: 0 }}>
            <LayerPanel />
          </aside>

          {/* Canvas */}
          <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <CanvasHost
              docId={docId}
              doc={FIXTURE_DOCUMENT}
              selectedIds={selectedIds}
              onNodeSelect={setSelectedIds}
            />
          </main>
        </div>
      </div>
    </DndProvider>
  );
}
