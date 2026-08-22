"use client";

/**
 * Inspector — right sidebar panel with Props / Theme / Meta tabs.
 *
 * Observer pattern: subscribes to editorStore.selectedIds — re-mounts
 * PropsPanel / MetaPanel when the selection changes.
 *
 * When nothing is selected, shows a placeholder and only Theme tab is active.
 */

import { useState } from "react";
import { useInspector } from "../../hooks/useInspector.js";
import { PropsPanel } from "./PropsPanel.js";
import { ThemePanel } from "./ThemePanel.js";
import { MetaPanel } from "./MetaPanel.js";

type Tab = "props" | "theme" | "meta";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "props", label: "Props" },
  { id: "theme", label: "Theme" },
  { id: "meta", label: "Meta" },
];

export function Inspector() {
  const [activeTab, setActiveTab] = useState<Tab>("props");
  const { selectedId, node } = useInspector();

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        borderLeft: "1px solid #1e293b",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #1e293b",
          flexShrink: 0,
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 11,
              fontWeight: 500,
              color: activeTab === tab.id ? "#e2e8f0" : "#475569",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "props" && (
          selectedId ? (
            <PropsPanel key={selectedId} nodeId={selectedId} />
          ) : (
            <Placeholder text="Select a node to inspect its props." />
          )
        )}

        {activeTab === "theme" && <ThemePanel />}

        {activeTab === "meta" && (
          selectedId ? (
            <MetaPanel key={selectedId} nodeId={selectedId} />
          ) : (
            <Placeholder text="Select a node to edit its metadata." />
          )
        )}
      </div>

      {/* Footer: selected node info */}
      {node && (
        <div
          style={{
            padding: "6px 12px",
            borderTop: "1px solid #1e293b",
            fontSize: 11,
            color: "#475569",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#6366f1", fontWeight: 600 }}>{node.type}</span>
          {node.meta?.name && (
            <span style={{ marginLeft: 6 }}>{node.meta.name}</span>
          )}
          <span style={{ marginLeft: 6, color: "#334155" }}>{selectedId}</span>
        </div>
      )}
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 16,
        color: "#475569",
        fontSize: 12,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}
