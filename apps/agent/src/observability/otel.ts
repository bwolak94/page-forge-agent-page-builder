/**
 * otel.ts — OpenTelemetry SDK setup for the agent service.
 *
 * Instruments:
 *   - HTTP server (Hono via @opentelemetry/instrumentation-http)
 *   - DNS and net (auto-instrumented)
 *
 * Traces are exported to the OTLP endpoint configured via env vars.
 * In development, traces can be exported to the console.
 *
 * Call `initOtel()` ONCE before any other imports in the entrypoint.
 * Must be called before Hono and other instrumentable libraries load.
 *
 * Environment variables:
 *   OTEL_SERVICE_NAME         — service name (default: "pageforge-agent")
 *   OTEL_EXPORTER_OTLP_ENDPOINT — OTLP endpoint (default: http://localhost:4318)
 *   OTEL_ENABLED              — set to "false" to disable (default: "true")
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";

// ---------------------------------------------------------------------------
// Singleton SDK instance
// ---------------------------------------------------------------------------

let _sdk: NodeSDK | null = null;

/**
 * Initialize the OpenTelemetry SDK.
 * Safe to call multiple times — only initializes once.
 *
 * NodeSDK handles BatchSpanProcessor internally — we only configure the
 * exporter and instrumentations here to avoid sdk-trace-base version conflicts.
 */
export function initOtel(): void {
  if (_sdk) return;
  if (process.env["OTEL_ENABLED"] === "false") return;

  const serviceName = process.env["OTEL_SERVICE_NAME"] ?? "pageforge-agent";
  const endpoint =
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4318";

  _sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: process.env["GIT_SHA"] ?? "dev",
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    instrumentations: [new HttpInstrumentation()],
  });

  _sdk.start();

  process.on("SIGTERM", async () => {
    await _sdk?.shutdown();
  });
}
