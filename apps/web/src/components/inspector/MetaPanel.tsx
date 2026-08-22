"use client";

/**
 * MetaPanel — editor metadata controls (name, locked, hidden).
 *
 * Meta is editor-only — does not affect rendering or export.
 * Changes dispatch SetMeta with only the touched key.
 */

import type { NodeId } from "@pageforge/ir";
import { useEditorStore } from "../../stores/editorStore.js";

interface MetaPanelProps {
  nodeId: NodeId;
}

const inputStyle = {
  width: "100%",
  padding: "4px 7px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 3,
  color: "#e2e8f0",
  fontSize: 12,
  outline: "none",
  boxSizing: "border-box" as const,
};

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>{label}</span>
      {children}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: "relative",
          width: 32,
          height: 18,
          borderRadius: 9,
          background: checked ? "#6366f1" : "#334155",
          border: "none",
          cursor: "pointer",
          padding: 0,
          transition: "background 0.15s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </button>
    </div>
  );
}

export function MetaPanel({ nodeId }: MetaPanelProps) {
  const meta = useEditorStore(s => s.doc.nodes[nodeId]?.meta ?? {});
  const executeCmd = useEditorStore(s => s.executeCmd);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}>
      <LabelRow label="Name">
        <input
          value={meta.name ?? ""}
          onChange={e =>
            executeCmd("set-meta", { id: nodeId, meta: { name: e.target.value } })
          }
          placeholder="Node name…"
          style={inputStyle}
        />
      </LabelRow>

      <SwitchRow
        label="Locked"
        checked={meta.locked ?? false}
        onChange={v =>
          executeCmd("set-meta", { id: nodeId, meta: { locked: v } })
        }
      />

      <SwitchRow
        label="Hidden"
        checked={meta.hidden ?? false}
        onChange={v =>
          executeCmd("set-meta", { id: nodeId, meta: { hidden: v } })
        }
      />
    </div>
  );
}
