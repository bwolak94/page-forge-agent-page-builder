"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/useChatWithPatches";
import { MessageBubble } from "./MessageBubble.js";
import { StreamingIndicator } from "./StreamingIndicator.js";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          fontSize: 13,
        }}
      >
        Ask PageForge to build something…
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "8px 0",
      }}
    >
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && <StreamingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
