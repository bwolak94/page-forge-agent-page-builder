"use client";

import { Controller, type Control } from "react-hook-form";
import type { FieldDescriptor } from "../zod-to-fields.js";

interface FieldProps {
  field: FieldDescriptor;
  control: Control;
}

export function SliderField({ field, control }: FieldProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf }) => {
        const value = (rhf.value as number) ?? (field.min ?? 0);
        return (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              value={value}
              onChange={e => rhf.onChange(e.target.valueAsNumber)}
              style={{ flex: 1, accentColor: "#6366f1" }}
            />
            <span
              style={{
                minWidth: 28,
                textAlign: "right",
                color: "#94a3b8",
                fontSize: 12,
              }}
            >
              {value}
            </span>
          </div>
        );
      }}
    />
  );
}
