/**
 * loop.test.ts — integration test for runLoop with a mocked LLM.
 *
 * The mock LLM returns a predetermined sequence of stream parts.
 * We verify SSE events are emitted correctly.
 *
 * No real Anthropic API calls are made — the LLM is stubbed via a mock
 * LanguageModel that produces a fixed ReadableStream of LanguageModelV1StreamPart.
 */

import { describe, it, expect, vi } from "vitest";
import type { LanguageModel, LanguageModelV1StreamPart } from "ai";
import { makeMinimalDocument } from "@pageforge/ir";
import type { Document } from "@pageforge/ir";
import { REGISTRY } from "@pageforge/registry";
import { runLoop, type LoopContext } from "../loop.js";
import { NoopEventLogAdapter } from "../adapters/event-log.adapter.js";
import type { LLMAdapter } from "../adapters/llm.adapter.js";
import type { HarnessEvent } from "../tool-handlers.js";

// ---------------------------------------------------------------------------
// Mock LLM helpers
// ---------------------------------------------------------------------------

function createMockModel(parts: LanguageModelV1StreamPart[]): LanguageModel {
  return {
    specificationVersion: "v1",
    provider: "mock",
    modelId: "mock-model",
    defaultObjectGenerationMode: undefined,
    doGenerate: vi.fn(),
    doStream: vi.fn().mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          for (const part of parts) controller.enqueue(part);
          controller.close();
        },
      }),
      rawCall: { rawPrompt: [], rawSettings: {} },
    }),
  } as unknown as LanguageModel;
}

function mockLLMAdapter(parts: LanguageModelV1StreamPart[]): LLMAdapter {
  return { model: createMockModel(parts) };
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeCtx(
  doc: Document,
  llm: LLMAdapter,
): { ctx: LoopContext; events: HarnessEvent[] } {
  const sseEvents: HarnessEvent[] = [];
  const ctx: LoopContext = {
    doc,
    registry: REGISTRY,
    history: [{ role: "user", content: "Add a hero section." }],
    llm,
    eventLog: new NoopEventLogAdapter(),
    sseEmit: (e) => sseEvents.push(e),
    documentId: "doc-loop-test",
    config: { maxSteps: 5 },
  };
  return { ctx, events: sseEvents };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runLoop", () => {
  it("emits agent.done event after completing", async () => {
    const llm = mockLLMAdapter([
      { type: "text-delta", textDelta: "Done!" },
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 5 },
      },
    ]);

    const { ctx, events } = makeCtx(makeMinimalDocument(), llm);
    await runLoop(ctx);

    const doneEvent = events.find(e => e.type === "agent.done");
    expect(doneEvent).toBeDefined();
  });

  it("emits agent.text chunks from the model response", async () => {
    const llm = mockLLMAdapter([
      { type: "text-delta", textDelta: "Hello " },
      { type: "text-delta", textDelta: "world." },
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 5, completionTokens: 5 },
      },
    ]);

    const { ctx, events } = makeCtx(makeMinimalDocument(), llm);
    await runLoop(ctx);

    const textEvents = events.filter(e => e.type === "agent.text");
    expect(textEvents.length).toBe(2);
    const texts = textEvents.map(e => (e as { type: "agent.text"; chunk: string }).chunk);
    expect(texts.join("")).toBe("Hello world.");
  });

  it("does not mutate the original doc object passed in — docRef is internal", async () => {
    const llm = mockLLMAdapter([
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 1, completionTokens: 1 },
      },
    ]);

    const doc = makeMinimalDocument();
    const originalNodeCount = Object.keys(doc.nodes).length;

    const { ctx } = makeCtx(doc, llm);
    await runLoop(ctx);

    // Original doc reference is unchanged
    expect(Object.keys(doc.nodes).length).toBe(originalNodeCount);
  });

  it("resolves without throwing on empty stream", async () => {
    const llm = mockLLMAdapter([
      {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 0, completionTokens: 0 },
      },
    ]);

    const { ctx } = makeCtx(makeMinimalDocument(), llm);
    const result = await runLoop(ctx);
    expect(result.steps).toBe(1);
    expect(result.doc).toBeDefined();
  });
});
