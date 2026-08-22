"use client";

import { useChatWithPatches } from "@/hooks/useChatWithPatches";
import { MessageList } from "./MessageList.js";
import { ChatInput } from "./ChatInput.js";

interface ChatPanelProps {
  docId: string;
}

/**
 * Full chat panel: scrollable message list + input bar.
 * Wired to useChatWithPatches which applies doc.patch SSE events to the store.
 */
export function ChatPanel({ docId }: ChatPanelProps) {
  const { messages, input, setInput, submit, isLoading, stop } = useChatWithPatches(docId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0f172a",
        borderLeft: "1px solid #1e293b",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #1e293b",
          fontSize: 12,
          fontWeight: 600,
          color: "#6366f1",
          letterSpacing: 0.5,
          flexShrink: 0,
        }}
      >
        AI Chat
      </div>

      {/* Message list — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #1e293b",
          flexShrink: 0,
        }}
      >
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={submit}
          onStop={stop}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
