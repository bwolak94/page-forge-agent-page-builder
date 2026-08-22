"use client";

import type { ChatMessage } from "@/hooks/useChatWithPatches";

interface MessageBubbleProps {
  message: ChatMessage;
}

const USER_STYLE: React.CSSProperties = {
  alignSelf: "flex-end",
  maxWidth: "80%",
  background: "#6366f1",
  color: "#fff",
  borderRadius: "12px 12px 2px 12px",
  padding: "8px 12px",
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const ASSISTANT_STYLE: React.CSSProperties = {
  alignSelf: "flex-start",
  maxWidth: "90%",
  background: "#1e293b",
  color: "#cbd5e1",
  borderRadius: "12px 12px 12px 2px",
  padding: "8px 12px",
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const style = message.role === "user" ? USER_STYLE : ASSISTANT_STYLE;

  return (
    <div style={style}>
      {message.content || (
        <span style={{ opacity: 0.4, fontStyle: "italic" }}>…</span>
      )}
    </div>
  );
}
