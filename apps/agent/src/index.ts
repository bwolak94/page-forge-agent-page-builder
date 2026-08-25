/**
 * PageForge Agent Service — Hono HTTP server.
 *
 * Port: 3001 (configurable via PORT env var).
 * Routes: POST /api/commands/:docId
 *
 * This service owns the write path: command execution, event persistence,
 * OCC, and snapshot compaction. The Next.js app (web) reads the document
 * via GET endpoints (T11) and sends commands to this service.
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { commandsRoute } from "./routes/commands.js";
import { chatRoute } from "./routes/chat.js";
import { buildsRoute } from "./routes/builds.js";

const app = new Hono();

app.get("/health", c => c.json({ status: "ok" }));
app.route("/api", commandsRoute);
app.route("/api", chatRoute);
app.route("/api/builds", buildsRoute);

const port = Number(process.env["PORT"] ?? 3001);

serve({ fetch: app.fetch, port }, info => {
  console.log(`[agent] Listening on http://localhost:${info.port}`);
});

export { app };
