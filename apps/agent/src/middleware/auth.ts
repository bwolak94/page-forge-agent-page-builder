/**
 * authMiddleware — session guard for Hono routes.
 *
 * For T08 this is a minimal stub that reads a Bearer token from the
 * Authorization header and sets a session object on the context.
 * Real JWT verification (Keycloak JWKS) will be wired in T11.
 */

import type { MiddlewareHandler } from "hono";

export interface Session {
  userId: string;
  actor: "user" | "agent";
}

declare module "hono" {
  interface ContextVariableMap {
    session: Session;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const auth = c.req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Stub: in production, verify JWT signature + exp + aud via Keycloak JWKS.
  // For now, accept any non-empty token and extract userId from it directly.
  c.set("session", { userId: token, actor: "user" });

  await next();
};
