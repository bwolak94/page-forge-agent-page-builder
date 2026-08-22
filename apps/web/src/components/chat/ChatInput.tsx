"use client";

import type { KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, onStop, isLoading }: ChatInputProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder="Ask PageForge…"
        rows={1}
        style={{
          flex: 1,
          resize: "none",
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 6,
          padding: "8px 10px",
          color: "#e2e8f0",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
          outline: "none",
          lineHeight: 1.5,
          maxHeight: 120,
          overflowY: "auto",
        }}
      />

      {isLoading ? (
        <button
          onClick={onStop}
          title="Stop"
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: 6,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#f87171",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          }}
        >
          ■
        </button>
      ) : (
        <button
          onClick={() => onSubmit()}
          disabled={!value.trim()}
          title="Send"
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: 6,
            border: "none",
            background: value.trim() ? "#6366f1" : "#1e293b",
            color: value.trim() ? "#fff" : "#475569",
            cursor: value.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          ↑
        </button>
      )}
    </div>
  );
}
