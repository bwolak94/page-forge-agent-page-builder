"use client";

import { TOOL_CALL_RENDERERS } from "./ToolCallRenderers.js";

export interface ToolCallBubbleProps {
  toolName: string;
  args: unknown;
  result: unknown;
}

/**
 * Decorator wrapper — selects the per-tool renderer by name,
 * falls back to default. ToolCallBubble itself never changes.
 */
export function ToolCallBubble({ toolName, args, result }: ToolCallBubbleProps) {
  const Renderer = TOOL_CALL_RENDERERS[toolName] ?? TOOL_CALL_RENDERERS["_default"]!;
  return (
    <div style={{ marginTop: 4 }}>
      <Renderer args={args} result={result} />
    </div>
  );
}
