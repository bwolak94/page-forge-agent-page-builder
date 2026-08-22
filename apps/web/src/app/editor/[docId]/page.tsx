"use client";

/**
 * Editor page — the full editor shell (T05 = canvas panel only).
 *
 * Uses a fixture document until persistence (T08) is wired.
 * Canvas panel fills the viewport; CanvasHost manages the iframe and overlay.
 */

import { useState } from "react";
import { EMPTY_DOCUMENT } from "@pageforge/ir";
import type { NodeId } from "@pageforge/ir";
import { CanvasHost } from "@/components/canvas/CanvasHost.js";

interface EditorPageProps {
  params: { docId: string };
}

export default function EditorPage({ params }: EditorPageProps) {
  const [selectedIds, setSelectedIds] = useState<NodeId[]>([]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <CanvasHost
        docId={params.docId}
        doc={EMPTY_DOCUMENT}
        selectedIds={selectedIds}
        onNodeSelect={setSelectedIds}
      />
    </div>
  );
}
