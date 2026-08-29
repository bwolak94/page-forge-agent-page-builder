"use client";

/**
 * PageBar — tab strip for multi-page document navigation.
 *
 * Renders one tab per page in `doc.pages`, highlights the active one,
 * and dispatches switch-page / add-page commands via editorStore.
 */

import { useEditorStore } from "@/stores/editorStore";

export function PageBar() {
  const doc = useEditorStore(s => s.doc);
  const executeCmd = useEditorStore(s => s.executeCmd);

  const pages = Object.values(doc.pages).sort((a, b) => a.slug.localeCompare(b.slug));
  const activePageId = doc.activePageId;

  function handleSwitch(pageId: string) {
    if (pageId === activePageId) return;
    executeCmd("switch-page", { pageId });
  }

  function handleAddPage() {
    const slug = `page-${Date.now()}`;
    executeCmd("add-page", { slug, title: "New Page", activate: true });
  }

  function handleRemovePage(pageId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (pages.length <= 1) return;
    executeCmd("remove-page", { pageId });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "0 12px",
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        height: 36,
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      {pages.map(page => {
        const isActive = page.id === activePageId;
        return (
          <button
            key={page.id}
            onClick={() => handleSwitch(page.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: "4px 4px 0 0",
              border: "1px solid",
              borderColor: isActive ? "#334155" : "transparent",
              borderBottom: isActive ? "1px solid #0f172a" : "none",
              background: isActive ? "#1e293b" : "transparent",
              color: isActive ? "#e2e8f0" : "#64748b",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.1s, background 0.1s",
            }}
          >
            <span>{page.title}</span>
            {pages.length > 1 && (
              <span
                onClick={e => handleRemovePage(page.id, e)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  color: "#475569",
                  fontSize: 10,
                  lineHeight: 1,
                }}
                title="Remove page"
              >
                ×
              </span>
            )}
          </button>
        );
      })}

      <button
        onClick={handleAddPage}
        title="Add page"
        style={{
          padding: "2px 8px",
          borderRadius: 4,
          border: "1px solid #1e293b",
          background: "transparent",
          color: "#475569",
          fontSize: 14,
          cursor: "pointer",
          lineHeight: 1,
          marginLeft: 4,
        }}
      >
        +
      </button>
    </div>
  );
}
