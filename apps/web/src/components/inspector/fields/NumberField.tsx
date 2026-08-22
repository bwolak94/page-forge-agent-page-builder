"use client";

import { Controller, type Control } from "react-hook-form";
import type { FieldDescriptor } from "../zod-to-fields.js";

interface FieldProps {
  field: FieldDescriptor;
  control: Control;
}

export function NumberField({ field, control }: FieldProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf, fieldState }) => (
        <div>
          <input
            type="number"
            {...rhf}
            value={(rhf.value as number) ?? 0}
            onChange={e => rhf.onChange(e.target.valueAsNumber)}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
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
      )}
    />
  );
}
