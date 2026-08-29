"use client";

/**
 * PreviewBar — floating Accept / Reject bar shown when the agent proposes a change.
 *
 * Appears when `editorStore.pendingPreview` is non-null.
 * Accept → POSTs to /api/preview/:docId/commit and applies patches locally.
 * Reject → POSTs to /api/preview/:docId/discard and clears preview state.
 */

import { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";

const AGENT_API = process.env["NEXT_PUBLIC_AGENT_API_URL"] ?? "http://localhost:3001";

interface PreviewBarProps {
  docId: string;
}

export function PreviewBar({ docId }: PreviewBarProps) {
  const pendingPreview = useEditorStore(s => s.pendingPreview);
  const setPendingPreview = useEditorStore(s => s.setPendingPreview);
  const applyServerPatch = useEditorStore(s => s.applyServerPatch);
  const [loading, setLoading] = useState(false);

  if (!pendingPreview) return null;

  async function handleAccept() {
    if (!pendingPreview) return;
    setLoading(true);
    try {
      const res = await fetch(`${AGENT_API}/api/preview/${docId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previewId: pendingPreview.previewId,
          kind: pendingPreview.kind,
          patches: pendingPreview.patches,
          inverse: pendingPreview.inverse,
        }),
      });
      if (res.ok) {
        const { seq } = await res.json() as { seq: number };
        applyServerPatch(pendingPreview.patches, seq);
        setPendingPreview(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!pendingPreview) return;
    setLoading(true);
    try {
      await fetch(`${AGENT_API}/api/preview/${docId}/discard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId: pendingPreview.previewId }),
      });
    } finally {
      setPendingPreview(null);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: "#1e293b",
        border: "1px solid #6366f1",
        borderRadius: 8,
        boxShadow: "0 4px 24px rgba(99,102,241,0.25)",
        zIndex: 1000,
        fontSize: 13,
        color: "#e2e8f0",
      }}
    >
      <span style={{ color: "#a5b4fc", fontWeight: 600 }}>Agent proposed:</span>
      <code style={{ color: "#c084fc", fontSize: 12 }}>{pendingPreview.kind}</code>
      <span style={{ color: "#475569", fontSize: 11 }}>
        ({pendingPreview.affected.length} node{pendingPreview.affected.length !== 1 ? "s" : ""} affected)
      </span>

      <button
        onClick={() => { void handleAccept(); }}
        disabled={loading}
        style={{
          padding: "4px 14px",
          borderRadius: 4,
          border: "none",
          background: "#6366f1",
          color: "#fff",
          fontWeight: 600,
          fontSize: 12,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        Accept
      </button>
      <button
        onClick={() => { void handleReject(); }}
        disabled={loading}
        style={{
          padding: "4px 14px",
          borderRadius: 4,
          border: "1px solid #334155",
          background: "transparent",
          color: "#94a3b8",
          fontSize: 12,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        Reject
      </button>
    </div>
  );
}
