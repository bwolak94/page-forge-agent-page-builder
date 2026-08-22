/**
 * LLMAdapter — Strategy interface for the LLM provider.
 *
 * The loop depends on this interface only.
 * Swap Anthropic for OpenAI or a local model by providing a different adapter.
 * (Strategy pattern, DIP)
 */

import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import Langfuse from "langfuse";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface LLMAdapter {
  /** AI SDK LanguageModel instance passed directly to streamText/generateText. */
  readonly model: LanguageModel;
}

// ---------------------------------------------------------------------------
// Anthropic adapter (production)
// ---------------------------------------------------------------------------

export interface AnthropicAdapterOptions {
  /** Model id, defaults to claude-sonnet-4-6. */
  modelId?: string;
  /** Langfuse client for tracing. If omitted, no traces are emitted. */
  langfuse?: Langfuse;
}

export class AnthropicAdapter implements LLMAdapter {
  readonly model: LanguageModel;

  constructor({ modelId = "claude-sonnet-4-6", langfuse }: AnthropicAdapterOptions = {}) {
    const anthropic = createAnthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });

    const baseModel = anthropic(modelId);

    // Wrap in Langfuse observer if available (T14 wires dashboards)
    if (langfuse) {
      // Langfuse AI SDK integration: wrap via langfuse.observeOpenAI or manual tracing
      // For now store the langfuse client so loop can create spans around each run.
      (baseModel as unknown as { _langfuse?: Langfuse })._langfuse = langfuse;
    }

    this.model = baseModel as unknown as LanguageModel;
  }
}

// ---------------------------------------------------------------------------
// Langfuse singleton factory
// ---------------------------------------------------------------------------

let _langfuse: Langfuse | null = null;

export function getLangfuse(): Langfuse {
  if (!_langfuse) {
    _langfuse = new Langfuse({
      publicKey: process.env["LANGFUSE_PUBLIC_KEY"] ?? "",
      secretKey: process.env["LANGFUSE_SECRET_KEY"] ?? "",
      baseUrl: process.env["LANGFUSE_BASE_URL"] ?? "https://cloud.langfuse.com",
      flushAt: 1, // eager flush in dev
    });
  }
  return _langfuse;
}
