"use client";

/**
 * ColorTokenField — shows a CSS variable reference (e.g. "var(--pf-color-text)")
 * as a text input, with a live swatch computed from a style attribute.
 */

import { Controller, type Control } from "react-hook-form";
import type { FieldDescriptor } from "../zod-to-fields.js";

interface FieldProps {
  field: FieldDescriptor;
  control: Control;
}

export function ColorTokenField({ field, control }: FieldProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf, fieldState }) => {
        const value = (rhf.value as string) ?? "";
        return (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Swatch preview */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 3,
                border: "1px solid #334155",
                background: value,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <input
                {...rhf}
                value={value}
                placeholder="var(--pf-color-...) or #hex"
                style={{
                  width: "100%",
                  padding: "4px 7px",
                  background: "#0f172a",
                  border: `1px solid ${fieldState.error ? "#ef4444" : "#334155"}`,
                  borderRadius: 3,
                  color: "#e2e8f0",
                  fontSize: 12,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {fieldState.error && (
                <span style={{ color: "#ef4444", fontSize: 10 }}>
                  {fieldState.error.message}
                </span>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}
