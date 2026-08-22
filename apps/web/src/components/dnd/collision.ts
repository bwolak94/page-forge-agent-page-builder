/**
 * closestInsertionPoint — custom dnd-kit collision detection.
 *
 * Filters to only dropzone containers (data.type === "dropzone") then finds
 * the one whose rect center is closest to the pointer.
 * Prefers thin insertion strips over large parent containers at equal distance.
 */

import type { CollisionDetection, Collision, ClientRect } from "@dnd-kit/core";

function distanceToCenter(
  rect: ClientRect,
  point: { x: number; y: number },
): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
}

export const closestInsertionPoint: CollisionDetection = ({
  droppableContainers,
  pointerCoordinates,
}) => {
  if (!pointerCoordinates) return [];

  const candidates = droppableContainers
    .filter(c => c.data.current?.["type"] === "dropzone" && c.rect.current !== null)
    .map(c => ({
      container: c,
      distance: distanceToCenter(c.rect.current!, pointerCoordinates),
    }))
    .sort((a, b) => a.distance - b.distance);

  if (candidates.length === 0) return [];

  const best = candidates[0]!;
  const collision: Collision = {
    id: best.container.id,
    data: { droppableContainer: best.container, value: best.distance },
  };

  return [collision];
};
