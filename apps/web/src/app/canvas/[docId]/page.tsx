/**
 * Canvas frame route — loaded as the iframe src by CanvasHost.
 *
 * Renders the IrRenderer + BoundsPublisher inside the iframe.
 * The parent sends "doc.replace" after the frame posts "ready".
 */

import { FrameEntry } from "@/components/canvas-frame/frame-entry.js";

export default function CanvasFramePage() {
  return <FrameEntry />;
}
