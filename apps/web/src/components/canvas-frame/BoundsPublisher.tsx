"use client";

/**
 * BoundsPublisher — Observer pattern: watches [data-node-id] elements
 * via ResizeObserver + MutationObserver and publishes NodeBounds to the parent.
 *
 * Updates are throttled to one rAF per layout flush to prevent jank.
 */

import { useEffect } from "react";
import type { NodeBounds } from "@pageforge/contracts";
import type { NodeId } from "@pageforge/ir";

export function BoundsPublisher() {
  useEffect(() => {
    let rafId: number | undefined;

    function publishBounds() {
      const elements = document.querySelectorAll<HTMLElement>("[data-node-id]");
      const bounds: NodeBounds[] = Array.from(elements).map(el => ({
        id: (el.dataset["nodeId"] ?? "") as NodeId,
        rect: el.getBoundingClientRect(),
        visible: true,
      }));
      window.parent.postMessage({ type: "node.bounds", bounds }, "*");
    }

    function schedulePublish() {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(publishBounds);
    }

    const resizeObserver = new ResizeObserver(schedulePublish);

    function observeAll() {
      document.querySelectorAll("[data-node-id]").forEach(el => resizeObserver.observe(el));
    }

    const mutationObserver = new MutationObserver(() => {
      observeAll();
      schedulePublish();
    });

    mutationObserver.observe(document.body, { subtree: true, childList: true });
    observeAll();
    schedulePublish();

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
