"use client";

import { Controller, type Control } from "react-hook-form";
import type { FieldDescriptor } from "../zod-to-fields.js";

interface FieldProps {
  field: FieldDescriptor;
  control: Control;
}

export function BooleanField({ field, control }: FieldProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf }) => {
        const checked = Boolean(rhf.value);
        return (
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => rhf.onChange(!checked)}
            style={{
              position: "relative",
              width: 32,
              height: 18,
              borderRadius: 9,
              background: checked ? "#6366f1" : "#334155",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "background 0.15s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: checked ? 16 : 2,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.15s",
              }}
            />
          </button>
        );
      }}
    />
  );
}
