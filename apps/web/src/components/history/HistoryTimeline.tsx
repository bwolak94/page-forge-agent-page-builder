"use client";

/**
 * HistoryTimeline — scrollable version history panel.
 *
 * Shows all document events ordered by seq (newest first).
 * Clicking an event previews the document at that version in the canvas.
 *
 * Uses useDocumentHistory to fetch events from the agent API.
 * Clicking "Restore" applies the historical snapshot to editorStore.
 */

import { useState } from "react";
import { useDocumentHistory, fetchSnapshotAtSeq } from "@/hooks/useDocumentHistory";
import { useEditorStore } from "@/stores/editorStore";
import type { Document } from "@pageforge/ir";

const ACTOR_COLOR: Record<string, string> = {
  agent: "#a5b4fc",
  user: "#4ade80",
};

const KIND_LABELS: Record<string, string> = {
  "insert-node": "Insert",
  "update-props": "Update props",
  "delete-node": "Delete",
  "move-node": "Move",
  "wrap-node": "Wrap",
  "unwrap-node": "Unwrap",
  "duplicate-node": "Duplicate",
  "reorder-slot": "Reorder",
  "apply-theme": "Theme",
  "set-meta": "Set meta",
  "add-page": "Add page",
  "remove-page": "Remove page",
  "rename-page": "Rename page",
  "switch-page": "Switch page",
};

interface HistoryTimelineProps {
  docId: string;
}

export function HistoryTimeline({ docId }: HistoryTimelineProps) {
  const { events, loading, error } = useDocumentHistory(docId);
  const setDoc = useEditorStore(s => s.setDoc);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [previewSeq, setPreviewSeq] = useState<number | null>(null);

  const sorted = [...events].reverse(); // newest first

  async function handleRestore(seq: number) {
    setRestoring(seq);
    try {
      const { doc } = await fetchSnapshotAtSeq(docId, seq);
      setDoc(doc as Document);
      setPreviewSeq(seq);
    } catch {
      // ignore
    } finally {
      setRestoring(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 16, color: "#475569", fontSize: 12 }}>Loading history…</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, color: "#f87171", fontSize: 12 }}>{error}</div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px 6px",
          fontSize: 10,
          fontWeight: 700,
          color: "#475569",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderBottom: "1px solid #1e293b",
          flexShrink: 0,
        }}
      >
        History ({events.length} events)
      </div>

      {events.length === 0 ? (
        <div style={{ padding: 16, color: "#334155", fontSize: 12 }}>
          No events yet. Start editing to see history.
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sorted.map(event => {
            const isPreview = event.seq === previewSeq;
            const isRestoring = restoring === event.seq;
            const label = KIND_LABELS[event.kind] ?? event.kind;
            const date = new Date(event.createdAt);
            const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <div
                key={event.seq}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderBottom: "1px solid #1e293b",
                  background: isPreview ? "#1e293b" : "transparent",
                  transition: "background 0.1s",
                }}
              >
                {/* Seq badge */}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#334155",
                    width: 28,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  #{event.seq}
                </span>

                {/* Actor dot */}
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: ACTOR_COLOR[event.actor] ?? "#64748b",
                    flexShrink: 0,
                  }}
                  title={event.actor}
                />

                {/* Label + time */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 9, color: "#475569" }}>{timeStr}</div>
                </div>

                {/* Restore button */}
                <button
                  onClick={() => { void handleRestore(event.seq); }}
                  disabled={isRestoring}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 3,
                    border: "1px solid #334155",
                    background: isPreview ? "#6366f1" : "transparent",
                    color: isPreview ? "#fff" : "#64748b",
                    fontSize: 10,
                    cursor: isRestoring ? "default" : "pointer",
                    flexShrink: 0,
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  {isRestoring ? "…" : isPreview ? "Active" : "View"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
