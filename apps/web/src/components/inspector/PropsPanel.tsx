"use client";

/**
 * PropsPanel — schema-driven props form.
 *
 * Pipeline: registry[type].propsSchema → zodToFields → FieldRenderer[].
 * Uses react-hook-form with zodResolver for live validation.
 * Dispatches UpdateProps with only the changed keys (diff, not full replace).
 */

import { useMemo, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { NodeId } from "@pageforge/ir";
import { REGISTRY } from "@pageforge/registry";
import { useEditorStore } from "../../stores/editorStore.js";
import { zodToFields } from "./zod-to-fields.js";
import { FieldRenderer } from "./FieldRenderer.js";

interface PropsPanelProps {
  nodeId: NodeId;
}

function diffProps(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (prev[key] !== value) patch[key] = value;
  }
  return patch;
}

export function PropsPanel({ nodeId }: PropsPanelProps) {
  const node = useEditorStore(s => s.doc.nodes[nodeId]);
  const executeCmd = useEditorStore(s => s.executeCmd);

  const def = REGISTRY[node?.type ?? ""];
  const schema = def?.propsSchema ?? z.object({});
  const fields = useMemo(() => (def ? zodToFields(def.propsSchema) : []), [def]);

  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: (node?.props as Record<string, unknown>) ?? {},
    mode: "onChange",
  });

  // Reset when the selected node changes
  useEffect(() => {
    reset((node?.props as Record<string, unknown>) ?? {});
  }, [nodeId, reset]); // intentionally omit node.props to avoid reset loops on cmd dispatch

  const onSubmit = useCallback(
    (values: Record<string, unknown>) => {
      const patch = diffProps(
        (node?.props as Record<string, unknown>) ?? {},
        values,
      );
      if (Object.keys(patch).length > 0) {
        executeCmd("update-props", { id: nodeId, patch });
      }
    },
    [nodeId, node?.props, executeCmd],
  );

  if (!def) {
    return (
      <div style={{ padding: 12, color: "#475569", fontSize: 12 }}>
        Unknown component type.
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div style={{ padding: 12, color: "#475569", fontSize: 12 }}>
        No configurable props.
      </div>
    );
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form
      onChange={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}
    >
      {fields.map(field => (
        <FieldRenderer key={field.name} field={field} control={control} />
      ))}
    </form>
  );
}
