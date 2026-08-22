/**
 * acl.test.ts — Anti-Corruption Layer tests.
 *
 * Verifies that malformed args and domain errors are returned as structured
 * ToolResult strings rather than thrown exceptions. The model uses these
 * to self-correct on the next step.
 */

import { describe, it, expect, vi } from "vitest";
import { makeMinimalDocument } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";
import { REGISTRY, canAccept } from "@pageforge/registry";
import { toolHandlers, type ToolContext } from "../tool-handlers.js";
import { NoopEventLogAdapter } from "../adapters/event-log.adapter.js";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeCtx(doc: Document): ToolContext {
  return {
    docRef: { current: doc },
    registry: {
      canAccept: (p, c, s) => canAccept(REGISTRY, p, c, s),
      propsSchema: (type) => REGISTRY[type]?.propsSchema ?? null,
    },
    fullRegistry: REGISTRY,
    eventLog: new NoopEventLogAdapter(),
    sseEmit: vi.fn(),
    documentId: "doc-acl-test",
  };
}

// ---------------------------------------------------------------------------
// Zod / schema validation errors
// ---------------------------------------------------------------------------

describe("ACL — schema validation", () => {
  it("returns error (not throw) when insertNode args are missing required fields", async () => {
    const ctx = makeCtx(makeMinimalDocument());
    // Missing 'type' field — command should reject, not throw
    const result = await toolHandlers.insertNode(
      { parentId: "root", slot: "children", index: 0, props: {} }, // no 'type'
      ctx,
    );
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error!.length).toBeGreaterThan(0);
  });

  it("returns error (not throw) when updateProps patch is not an object", async () => {
    const ctx = makeCtx(makeMinimalDocument());
    const result = await toolHandlers.updateProps(
      { id: "some-id", patch: "not-an-object" },
      ctx,
    );
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
  });

  it("returns error (not throw) for deleteNode with missing id", async () => {
    const ctx = makeCtx(makeMinimalDocument());
    const result = await toolHandlers.deleteNode({}, ctx);
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Domain validation errors
// ---------------------------------------------------------------------------

describe("ACL — domain validation", () => {
  it("returns error when parent node does not exist", async () => {
    const ctx = makeCtx(makeMinimalDocument());
    const result = await toolHandlers.insertNode(
      { parentId: "ghost-parent", slot: "children", index: 0, type: "Section", props: {} },
      ctx,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error when referencing a non-existent node in updateProps", async () => {
    const ctx = makeCtx(makeMinimalDocument());
    const result = await toolHandlers.updateProps(
      { id: "ghost-node-id", patch: { text: "hello" } },
      ctx,
    );
    expect(result.ok).toBe(false);
  });

  it("does not throw — errors are always ToolResult", async () => {
    const doc = makeMinimalDocument();
    const ctx = makeCtx(doc);
    const cases = [
      toolHandlers.insertNode(
        { type: "Heading", parentId: "ghost", slot: "s", index: 0, props: {} },
        ctx,
      ),
      toolHandlers.deleteNode({ id: "ghost" }, ctx),
      toolHandlers.moveNode(
        { id: "ghost", newParentId: doc.root, newSlot: "children", newIndex: 0 },
        ctx,
      ),
    ];
    const results = await Promise.all(cases);
    for (const r of results) {
      expect(r.ok).toBe(false);
      expect(typeof r.error).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// Successful path — ACL does not block valid calls
// ---------------------------------------------------------------------------

describe("ACL — valid calls pass through", () => {
  it("allows a valid insertNode to succeed", async () => {
    const doc = makeMinimalDocument();
    const ctx = makeCtx(doc);
    const result = await toolHandlers.insertNode(
      { parentId: doc.root, slot: "children", index: 0, type: "Section", props: {} },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(result.affected).toBeDefined();
  });

  it("allows applyTheme to succeed", async () => {
    const doc = makeMinimalDocument();
    const ctx = makeCtx(doc);
    const result = await toolHandlers.applyTheme(
      { tokens: { colors: { primary: "#6366f1" } } },
      ctx,
    );
    expect(result.ok).toBe(true);
  });
});
