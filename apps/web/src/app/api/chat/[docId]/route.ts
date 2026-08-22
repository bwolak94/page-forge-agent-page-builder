/**
 * Next.js API proxy: POST /api/chat/[docId]
 *
 * Forwards the chat request to the agent service (apps/agent) and streams
 * the SSE response back to the browser. This keeps the ANTHROPIC_API_KEY
 * on the server and avoids CORS issues in production.
 *
 * The agent service emits HarnessEvents (agent.text, doc.patch, agent.done,
 * agent.error) as SSE — we pass them through as-is.
 */

import { type NextRequest, NextResponse } from "next/server";

const AGENT_URL = process.env["AGENT_URL"] ?? "http://localhost:3001";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Forward auth header (or inject a dev token)
  const authHeader = req.headers.get("authorization") ?? "Bearer dev-token";

  let agentResponse: Response;
  try {
    agentResponse = await fetch(`${AGENT_URL}/api/chat/${docId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
      // Forward the abort signal so client disconnect cancels the agent loop
      signal: req.signal,
    });
  } catch {
    return NextResponse.json({ error: "agent_unreachable" }, { status: 502 });
  }

  if (!agentResponse.ok && agentResponse.status !== 200) {
    const text = await agentResponse.text().catch(() => "");
    return NextResponse.json(
      { error: "agent_error", detail: text },
      { status: agentResponse.status },
    );
  }

  // Stream SSE response back to the browser
  return new Response(agentResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
