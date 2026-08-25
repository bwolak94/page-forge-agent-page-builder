/**
 * judge.ts — LLM-as-judge: screenshot → visual quality score (0–5).
 *
 * Uses Claude claude-sonnet-4-6 vision to evaluate page aesthetics.
 * This is a "soft metric" — it doesn't gate CI, but appears in Langfuse
 * alongside the hard structural assertion results.
 *
 * Rubric (0–5):
 *   0 = blank / broken render
 *   1 = renders but severely broken layout
 *   2 = basic structure present, poor spacing/contrast
 *   3 = acceptable, minor issues
 *   4 = good layout, consistent spacing, readable
 *   5 = professional, visually polished, excellent hierarchy
 */

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// JudgeScore
// ---------------------------------------------------------------------------

export interface JudgeScore {
  /** Integer score 0–5. */
  score: number;
  /** One-sentence reasoning from the model. */
  reasoning: string;
}

// ---------------------------------------------------------------------------
// judgeVisualQuality
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
  }
  return _client;
}

/**
 * Rate the visual quality of a rendered page screenshot.
 *
 * @param screenshotBase64 - PNG image encoded as base64.
 * @param prompt           - The prompt that generated the page (context for judge).
 * @returns                JudgeScore with integer 0–5 and reasoning string.
 */
export async function judgeVisualQuality(
  screenshotBase64: string,
  prompt: string,
): Promise<JudgeScore> {
  const client = getClient();

  const response = await client.messages.create({
    model: process.env["JUDGE_MODEL_ID"] ?? "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: screenshotBase64,
            },
          },
          {
            type: "text",
            text: `You are evaluating the visual quality of an AI-generated web page.

The page was built in response to this prompt:
"${prompt}"

Rate it on a scale of 0–5 across these dimensions:
- Visual hierarchy and flow (0–1)
- Spacing and whitespace (0–1)
- Contrast and readability (0–1)
- Layout consistency (0–1)
- Professional appearance (0–1)

Respond with ONLY valid JSON — no markdown, no explanation outside JSON:
{ "score": <integer 0-5>, "reasoning": "<one sentence>" }`,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Unexpected LLM response format from visual judge");
  }

  const parsed = JSON.parse(content.text) as { score: number; reasoning: string };
  return {
    score: Math.max(0, Math.min(5, Math.round(parsed.score))),
    reasoning: parsed.reasoning,
  };
}
