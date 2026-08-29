"use client";

/**
 * useChatWithPatches — chat hook that consumes the agent's SSE stream.
 *
 * Two event streams arrive over a single SSE connection:
 *   1. agent.text  → appended to the current assistant message
 *   2. doc.patch   → applied to editorStore doc + forwarded to canvas bridge
 *
 * Manages messages, loading state, and abort control internally.
 * No Vercel AI SDK dependency — uses native fetch + ReadableStream.
 */

import { useState, useCallback, useRef } from "react";
import type { JsonPatch, NodeId } from "@pageforge/ir";
import { useEditorStore } from "@/stores/editorStore";

// ---------------------------------------------------------------------------
// SSE event types (mirrors packages/harness/src/tool-handlers.ts)
// ---------------------------------------------------------------------------

type AgentTextEvent = { type: "agent.text"; chunk: string };
type AgentStepEvent = { type: "agent.step"; step: number; usage: unknown };
type AgentDoneEvent = { type: "agent.done"; steps: number; usage: unknown };
type AgentErrorEvent = { type: "agent.error"; message: string };
type DocPatchEvent = {
  type: "doc.patch";
  seq: number;
  patches: JsonPatch[];
  affected: NodeId[];
};

type DocPreviewEvent = {
  type: "doc.preview";
  previewId: string;
  kind: string;
  patches: JsonPatch[];
  inverse: JsonPatch[];
  affected: NodeId[];
};

type AgentSSEEvent =
  | AgentTextEvent
  | AgentStepEvent
  | AgentDoneEvent
  | AgentErrorEvent
  | DocPatchEvent
  | DocPreviewEvent;

// ---------------------------------------------------------------------------
// Chat message type
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

export function useChatWithPatches(docId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const applyServerPatch = useEditorStore(s => s.applyServerPatch);
  const setAffected = useEditorStore(s => s.setAffected);
  const setPendingPreview = useEditorStore(s => s.setPendingPreview);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const trimmed = input.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = { id: nextId(), role: "user", content: trimmed };
      const assistantId = nextId();

      setMessages(prev => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
      setInput("");
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let assistantContent = "";

      try {
        const res = await fetch(`/api/chat/${docId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Agent error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE lines end with \n; events are separated by \n\n
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;

            let event: AgentSSEEvent;
            try {
              event = JSON.parse(raw) as AgentSSEEvent;
            } catch {
              continue;
            }

            if (event.type === "agent.text") {
              assistantContent += event.chunk;
              const snapshot = assistantContent;
              setMessages(prev =>
                prev.map(m => (m.id === assistantId ? { ...m, content: snapshot } : m)),
              );
            } else if (event.type === "doc.patch") {
              applyServerPatch(event.patches, event.seq);
              setAffected(event.affected);
              // Flash affected nodes for 2 s then clear
              setTimeout(() => setAffected([]), 2000);
            } else if (event.type === "doc.preview") {
              setPendingPreview({
                previewId: event.previewId,
                kind: event.kind,
                patches: event.patches,
                inverse: event.inverse,
                affected: event.affected,
              });
            }
            // agent.step, agent.done, agent.error — no UI action needed for MVP
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        // Show error in assistant message
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: `⚠ Error: ${(err as Error).message}` }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [input, isLoading, docId, applyServerPatch, setAffected, setPendingPreview],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { messages, input, setInput, submit, isLoading, stop };
}
