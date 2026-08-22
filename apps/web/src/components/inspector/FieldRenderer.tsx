"use client";

/**
 * FieldRenderer — Strategy pattern dispatch table.
 *
 * Maps FieldKind → the appropriate widget component.
 * Adding a new field kind = add a case here + new widget file; no other changes.
 */

import type { Control } from "react-hook-form";
import type { FieldDescriptor, FieldKind } from "./zod-to-fields.js";
import { TextField } from "./fields/TextField.js";
import { NumberField } from "./fields/NumberField.js";
import { BooleanField } from "./fields/BooleanField.js";
import { EnumField } from "./fields/EnumField.js";
import { ColorTokenField } from "./fields/ColorTokenField.js";
import { StringArrayField } from "./fields/StringArrayField.js";
import { SliderField } from "./fields/SliderField.js";
import type React from "react";

interface FieldProps {
  field: FieldDescriptor;
  control: Control;
}

const FIELD_RENDERERS: Record<FieldKind, React.ComponentType<FieldProps>> = {
  text: TextField,
  textarea: TextField, // same widget, multiline styling handled by CSS
  number: NumberField,
  boolean: BooleanField,
  enum: EnumField,
  "color-token": ColorTokenField,
  "string-array": StringArrayField,
  slider: SliderField,
};

export function FieldRenderer({ field, control }: FieldProps) {
  const Widget = FIELD_RENDERERS[field.kind];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        htmlFor={field.name}
        style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}
      >
        {field.label}
        {!field.required && (
          <span style={{ color: "#475569", marginLeft: 4 }}>optional</span>
        )}
      </label>
      <Widget field={field} control={control} />
    </div>
  );
}
