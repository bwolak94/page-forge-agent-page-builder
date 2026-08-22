"use client";

import { Controller, type Control } from "react-hook-form";
import type { FieldDescriptor } from "../zod-to-fields.js";

interface FieldProps {
  field: FieldDescriptor;
  control: Control;
}

export function StringArrayField({ field, control }: FieldProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf }) => {
        const items = Array.isArray(rhf.value) ? (rhf.value as string[]) : [];

        function updateItem(index: number, value: string) {
          const next = [...items];
          next[index] = value;
          rhf.onChange(next);
        }

        function removeItem(index: number) {
          rhf.onChange(items.filter((_, i) => i !== index));
        }

        function addItem() {
          rhf.onChange([...items, ""]);
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 4 }}>
                <input
                  value={item}
                  onChange={e => updateItem(i, e.target.value)}
                  style={{
                    flex: 1,
                    padding: "4px 7px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 3,
                    color: "#e2e8f0",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  aria-label="Remove item"
                  style={{
                    padding: "2px 6px",
                    background: "transparent",
                    border: "1px solid #334155",
                    borderRadius: 3,
                    color: "#94a3b8",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              style={{
                padding: "3px 8px",
                background: "transparent",
                border: "1px dashed #334155",
                borderRadius: 3,
                color: "#64748b",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              + Add item
            </button>
          </div>
        );
      }}
    />
  );
}
