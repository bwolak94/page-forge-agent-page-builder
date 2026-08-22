/**
 * tool-handlers.test.ts — unit tests for each tool handler.
 *
 * Uses fixture documents + NoopEventLogAdapter — no LLM, no DB.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeMinimalDocument, fromNestedTree } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";
import { REGISTRY, canAccept } from "@pageforge/registry";
import { toolHandlers, type ToolContext } from "../tool-handlers.js";
import { NoopEventLogAdapter } from "../adapters/event-log.adapter.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Minimal Page doc — root has `children` slot. */
function makeSimpleDoc(): Document {
  return makeMinimalDocument();
}

/** Page → Section → Heading fixture. */
function makeNestedDoc(): Document {
  return fromNestedTree({
    root: {
      type: "Page",
      slots: {
        children: [
          {
            type: "Section",
            slots: {
              children: [{ type: "Heading", props: { text: "Hello" } }],
            },
          },
        ],
      },
    },
  });
}

function makeCtx(doc: Document): ToolContext & { log: NoopEventLogAdapter } {
  const log = new NoopEventLogAdapter();
  const ctx: ToolContext = {
    docRef: { current: doc },
    registry: {
      canAccept: (p, c, s) => canAccept(REGISTRY, p, c, s),
      propsSchema: (type) => REGISTRY[type]?.propsSchema ?? null,
    },
    fullRegistry: REGISTRY,
    eventLog: log,
    sseEmit: vi.fn(),
    documentId: "doc-test",
  };
  return Object.assign(ctx, { log });
}

// ---------------------------------------------------------------------------
// queryTree
// ---------------------------------------------------------------------------

describe("queryTree", () => {
  it("returns a tree summary with root node", async () => {
    const ctx = makeCtx(makeSimpleDoc());
    const result = await toolHandlers.queryTree({ maxDepth: 3, maxNodes: 50 }, ctx);
    expect(result.ok).toBe(true);
    expect(result.tree).toBeDefined();
    expect((result.tree as { type: string }).type).toBe("Page");
  });

  it("respects focusId parameter", async () => {
    const doc = makeSimpleDoc();
    const ctx = makeCtx(doc);
    const result = await toolHandlers.queryTree(
      { focusId: doc.root, maxDepth: 2, maxNodes: 50 },
      ctx,
    );
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// inspectNode
// ---------------------------------------------------------------------------

describe("inspectNode", () => {
  it("returns node details for a valid id", async () => {
    const doc = makeSimpleDoc();
    const ctx = makeCtx(doc);
    const result = await toolHandlers.inspectNode({ id: doc.root }, ctx);
    expect(result.ok).toBe(true);
    const node = result.node as { type: string };
    expect(node.type).toBe("Page");
  });

  it("returns structured error for unknown id", async () => {
    const ctx = makeCtx(makeSimpleDoc());
    const result = await toolHandlers.inspectNode({ id: "non-existent-id" }, ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not found");
  });
});

// ---------------------------------------------------------------------------
// listComponents
// ---------------------------------------------------------------------------

describe("listComponents", () => {
  it("returns all components when no category filter", async () => {
    const ctx = makeCtx(makeSimpleDoc());
    const result = await toolHandlers.listComponents({}, ctx);
    expect(result.ok).toBe(true);
    const components = result.components as unknown[];
    expect(components.length).toBeGreaterThan(0);
  });

  it("filters by category", async () => {
    const ctx = makeCtx(makeSimpleDoc());
    const result = await toolHandlers.listComponents({ category: "layout" }, ctx);
    expect(result.ok).toBe(true);
    const components = result.components as Array<{ category: string }>;
    expect(components.every(c => c.category === "layout")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// insertNode
// ---------------------------------------------------------------------------

describe("insertNode", () => {
  it("inserts a valid node and updates docRef", async () => {
    const doc = makeSimpleDoc();
    const ctx = makeCtx(doc);
    const nodesBefore = Object.keys(doc.nodes).length;

    const result = await toolHandlers.insertNode(
      { parentId: doc.root, slot: "children", index: 0, type: "Section", props: {} },
      ctx,
    );

    expect(result.ok).toBe(true);
    expect(Object.keys(ctx.docRef.current.nodes).length).toBeGreaterThan(nodesBefore);
    expect((ctx.sseEmit as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(ctx.log.events.length).toBe(1);
    expect(ctx.log.events[0]?.kind).toBe("insert-node");
  });

  it("returns error when parent node does not exist", async () => {
    const ctx = makeCtx(makeSimpleDoc());
    const result = await toolHandlers.insertNode(
      { parentId: "ghost-parent-id", slot: "children", index: 0, type: "Section", props: {} },
      ctx,
    );
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// updateProps
// ---------------------------------------------------------------------------

describe("updateProps", () => {
  it("updates props on an existing node", async () => {
    const doc = makeNestedDoc();
    const ctx = makeCtx(doc);

    const headingId = Object.entries(doc.nodes).find(([, n]) => n.type === "Heading")?.[0];
    expect(headingId).toBeDefined();

    const result = await toolHandlers.updateProps(
      { id: headingId!, patch: { text: "Updated" } },
      ctx,
    );

    expect(result.ok).toBe(true);
    const updatedNode = ctx.docRef.current.nodes[headingId!];
    expect((updatedNode?.props as { text?: string })?.text).toBe("Updated");
  });
});

// ---------------------------------------------------------------------------
// deleteNode
// ---------------------------------------------------------------------------

describe("deleteNode", () => {
  it("deletes a node and its descendants", async () => {
    const doc = makeNestedDoc();
    const ctx = makeCtx(doc);

    const sectionId = Object.entries(doc.nodes).find(([, n]) => n.type === "Section")?.[0];
    expect(sectionId).toBeDefined();

    const result = await toolHandlers.deleteNode({ id: sectionId! }, ctx);
    expect(result.ok).toBe(true);
    expect(ctx.docRef.current.nodes[sectionId!]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// preview
// ---------------------------------------------------------------------------

describe("preview", () => {
  it("returns ok with a message", async () => {
    const ctx = makeCtx(makeSimpleDoc());
    const result = await toolHandlers.preview({}, ctx);
    expect(result.ok).toBe(true);
    expect(typeof result.message).toBe("string");
  });
});
