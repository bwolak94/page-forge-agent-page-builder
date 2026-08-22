"use client";

/**
 * BreakpointBar — buttons that resize the canvas iframe.
 *
 * Resizing the iframe element IS a real viewport resize inside the frame.
 * Media queries defined in the frame respond correctly.
 */

export const BREAKPOINTS = [
  { label: "Mobile", width: 375 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: 1280 },
] as const;

type BreakpointWidth = (typeof BREAKPOINTS)[number]["width"];

interface BreakpointBarProps {
  activeWidth: number;
  onSelect: (width: BreakpointWidth) => void;
}

export function BreakpointBar({ activeWidth, onSelect }: BreakpointBarProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        alignItems: "center",
        padding: "6px 12px",
        background: "#1e1e2e",
        borderBottom: "1px solid #2d2d3f",
      }}
    >
      {BREAKPOINTS.map(bp => (
        <button
          key={bp.width}
          onClick={() => onSelect(bp.width)}
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            background: activeWidth === bp.width ? "#3b82f6" : "#2d2d3f",
            color: activeWidth === bp.width ? "#fff" : "#94a3b8",
            transition: "background 0.15s",
          }}
        >
          {bp.label}
          <span style={{ marginLeft: 4, opacity: 0.6 }}>{bp.width}px</span>
        </button>
      ))}
    </div>
  );
}
