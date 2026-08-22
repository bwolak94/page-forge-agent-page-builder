"use client";

/**
 * Per-tool rendering strategies for ToolCallBubble.
 * Open/Closed: add a new tool → add a new entry here; ToolCallBubble is unchanged.
 */

interface RendererProps {
  args: unknown;
  result: unknown;
}

type ToolCallRenderer = React.ComponentType<RendererProps>;

const codeStyle: React.CSSProperties = {
  fontSize: 11,
  background: "#1e293b",
  borderRadius: 4,
  padding: "4px 8px",
  fontFamily: "monospace",
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
};

function InsertNodeRenderer({ args, result }: RendererProps) {
  const a = args as Record<string, unknown>;
  const r = result as Record<string, unknown> | null;
  return (
    <div style={codeStyle}>
      <span style={{ color: "#4ade80" }}>insertNode</span>
      <span style={{ color: "#94a3b8" }}>
        {String(a.type)} → {String(a.parentId)}:{String(a.slot)}
      </span>
      {r?.ok && <span style={{ color: "#60a5fa" }}>✓ inserted</span>}
    </div>
  );
}

function UpdatePropsRenderer({ args }: RendererProps) {
  const a = args as Record<string, unknown>;
  return (
    <div style={codeStyle}>
      <span style={{ color: "#facc15" }}>updateProps</span>
      <span style={{ color: "#94a3b8" }}>{String(a.id)}</span>
    </div>
  );
}

function DeleteNodeRenderer({ args }: RendererProps) {
  const a = args as Record<string, unknown>;
  return (
    <div style={codeStyle}>
      <span style={{ color: "#f87171" }}>deleteNode</span>
      <span style={{ color: "#94a3b8" }}>{String(a.id)}</span>
    </div>
  );
}

function QueryTreeRenderer() {
  return (
    <div style={codeStyle}>
      <span style={{ color: "#c084fc" }}>queryTree</span>
      <span style={{ color: "#94a3b8" }}>reading document structure…</span>
    </div>
  );
}

function InspectNodeRenderer({ args }: RendererProps) {
  const a = args as Record<string, unknown>;
  return (
    <div style={codeStyle}>
      <span style={{ color: "#c084fc" }}>inspectNode</span>
      <span style={{ color: "#94a3b8" }}>{String(a.id)}</span>
    </div>
  );
}

function DefaultRenderer({ args }: RendererProps) {
  return (
    <div style={{ ...codeStyle, opacity: 0.6 }}>
      {JSON.stringify(args).slice(0, 80)}
    </div>
  );
}

export const TOOL_CALL_RENDERERS: Record<string, ToolCallRenderer> = {
  insertNode: InsertNodeRenderer,
  updateProps: UpdatePropsRenderer,
  deleteNode: DeleteNodeRenderer,
  queryTree: QueryTreeRenderer,
  inspectNode: InspectNodeRenderer,
  _default: DefaultRenderer,
};
