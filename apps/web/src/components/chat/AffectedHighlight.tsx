"use client";

import { useEditorStore } from "@/stores/editorStore";

/**
 * Overlay that flashes blue borders around nodes affected by the last agent patch.
 * Rendered inside the canvas container (position: absolute, pointer-events: none).
 * Clears automatically after 2 s (controlled by useChatWithPatches).
 */
export function AffectedHighlight() {
  const affected = useEditorStore(s => s.affected);
  const boundsMap = useEditorStore(s => s.boundsMap);
  const iframeOffset = useEditorStore(s => s.iframeOffset);

  if (affected.length === 0) return null;

  return (
    <>
      {affected.map(id => {
        const bounds = boundsMap.get(id);
        if (!bounds) return null;
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              top: bounds.rect.top + iframeOffset.top,
              left: bounds.rect.left + iframeOffset.left,
              width: bounds.rect.width,
              height: bounds.rect.height,
              border: "2px solid #60a5fa",
              borderRadius: 3,
              pointerEvents: "none",
              animation: "affectedPulse 1s ease-in-out infinite",
            }}
          />
        );
      })}
      <style>{`
        @keyframes affectedPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
