"use client";

/**
 * useDocumentHistory — fetch the event log for a document.
 *
 * Returns a list of event summaries ordered by seq ascending.
 * Polls every `pollIntervalMs` milliseconds to pick up new events
 * as the agent makes changes.
 */

import { useState, useEffect, useCallback } from "react";

const AGENT_API = process.env["NEXT_PUBLIC_AGENT_API_URL"] ?? "http://localhost:3001";

export interface EventSummary {
  seq: number;
  actor: "user" | "agent";
  kind: string;
  createdAt: string;
}

export function useDocumentHistory(docId: string, pollIntervalMs = 5_000) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_API}/api/documents/${docId}/history?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { events: EventSummary[] };
      setEvents(data.events);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    void fetchHistory();
    const id = setInterval(() => { void fetchHistory(); }, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchHistory, pollIntervalMs]);

  return { events, loading, error, refetch: fetchHistory };
}

export async function fetchSnapshotAtSeq(
  docId: string,
  atSeq: number,
): Promise<{ doc: unknown; version: number }> {
  const res = await fetch(
    `${AGENT_API}/api/documents/${docId}/snapshot?atSeq=${atSeq}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ doc: unknown; version: number }>;
}
