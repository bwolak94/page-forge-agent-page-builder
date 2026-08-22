"use client";

/**
 * ThemePanel — live editing of design tokens.
 *
 * Each token change immediately dispatches ApplyTheme so the canvas updates.
 * Token sections: Colors, Spacing, Radii, Typography scale.
 */

import { useEditorStore } from "../../stores/editorStore.js";
import type { ThemeTokens } from "@pageforge/ir";

type TokenSection = {
  label: string;
  key: keyof Omit<ThemeTokens, "fonts">;
};

const SECTIONS: TokenSection[] = [
  { label: "Colors", key: "colors" },
  { label: "Spacing", key: "spacing" },
  { label: "Radii", key: "radii" },
  { label: "Typography", key: "scale" },
];

interface TokenRowProps {
  tokenKey: keyof Omit<ThemeTokens, "fonts">;
  token: string;
  value: string;
  onChange: (value: string) => void;
}

function TokenRow({ tokenKey, token, value, onChange }: TokenRowProps) {
  const isColor = tokenKey === "colors";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
      }}
    >
      {isColor && (
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 2,
            background: value,
            border: "1px solid #334155",
            flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          flex: 1,
          fontSize: 11,
          color: "#64748b",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {token}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 90,
          padding: "2px 6px",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 3,
          color: "#e2e8f0",
          fontSize: 11,
          outline: "none",
        }}
      />
    </div>
  );
}

export function ThemePanel() {
  const theme = useEditorStore(s => s.doc.theme);
  const executeCmd = useEditorStore(s => s.executeCmd);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 12 }}>
      {SECTIONS.map(({ label, key }) => (
        <div key={key}>
          <h3
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#475569",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {label}
          </h3>
          {Object.entries(theme[key]).map(([token, value]) => (
            <TokenRow
              key={token}
              tokenKey={key}
              token={token}
              value={value as string}
              onChange={v =>
                executeCmd("apply-theme", { tokens: { [key]: { [token]: v } } })
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
