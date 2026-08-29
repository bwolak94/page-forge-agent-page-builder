/**
 * PageForge Agent Service — Hono HTTP server.
 *
 * Port: 3001 (configurable via PORT env var).
 * Routes:
 *   POST /api/commands/:docId  — command execution
 *   POST /api/chat/:docId      — agent chat (SSE)
 *   POST /api/builds/:docId    — HTML export build
 *   GET  /metrics              — Prometheus scrape endpoint
 *   GET  /health               — liveness probe
 *
 * This service owns the write path: command execution, event persistence,
 * OCC, and snapshot compaction. The Next.js app (web) reads the document
 * via GET endpoints (T11) and sends commands to this service.
 */

import { initOtel } from "./observability/otel.js";
initOtel(); // Must be first — before any other instrumented libraries load

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { commandsRoute } from "./routes/commands.js";
import { chatRoute } from "./routes/chat.js";
import { buildsRoute } from "./routes/builds.js";
import { previewRoute } from "./routes/preview.js";
import { deployRoute } from "./routes/deploy.js";
import { historyRoute } from "./routes/history.js";
import { register } from "./observability/metrics.js";

const app = new Hono();

app.get("/health", c => c.json({ status: "ok" }));

// Prometheus scrape endpoint — Prometheus polls this every 15s
app.get("/metrics", async c => {
  const metrics = await register.metrics();
  return c.text(metrics, 200, { "Content-Type": register.contentType });
});

app.route("/api", commandsRoute);
app.route("/api", chatRoute);
app.route("/api/builds", buildsRoute);
app.route("/api/preview", previewRoute);
app.route("/api/deploy", deployRoute);
app.route("/api/documents", historyRoute);

const port = Number(process.env["PORT"] ?? 3001);

serve({ fetch: app.fetch, port }, info => {
  console.log(`[agent] Listening on http://localhost:${info.port}`);
});

export { app };
