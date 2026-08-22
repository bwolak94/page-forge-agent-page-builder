/**
 * Large document fixture for token budget tests.
 *
 * Builds a ~300-node document programmatically:
 *   1 Page
 *   └── 10 Sections
 *       └── each Section has 3 Grids
 *           └── each Grid has 9 Cards  (27 Cards per Section)
 *   Total: 1 + 10 + 10×3 + 10×3×9 = 1 + 10 + 30 + 270 = 311 nodes
 */

import { nodeId, type Document, type DocNode, type NodeId } from "@pageforge/ir";
import { SCHEMA_VERSION, DEFAULT_THEME, DEFAULT_BREAKPOINTS } from "@pageforge/ir";

function id(raw: string): NodeId {
  return nodeId(raw);
}

export function makeLargeDocument(): Document {
  const nodes: Record<NodeId, DocNode> = {};

  const rootId = id("root");
  const sectionIds: NodeId[] = [];

  // Create 10 sections
  for (let s = 0; s < 10; s++) {
    const sectionId = id(`section-${s}`);
    const gridIds: NodeId[] = [];

    // Each section has 3 grids
    for (let g = 0; g < 3; g++) {
      const gridId = id(`grid-${s}-${g}`);
      const cardIds: NodeId[] = [];

      // Each grid has 9 cards
      for (let c = 0; c < 9; c++) {
        const cardId = id(`card-${s}-${g}-${c}`);
        nodes[cardId] = {
          id: cardId,
          type: "Card",
          props: {
            title: `Card ${s}-${g}-${c}`,
            description: "A sample card component",
            highlighted: c === 0,
          },
          slots: {},
        };
        cardIds.push(cardId);
      }

      nodes[gridId] = {
        id: gridId,
        type: "Grid",
        props: { cols: 3 },
        slots: { children: cardIds },
      };
      gridIds.push(gridId);
    }

    nodes[sectionId] = {
      id: sectionId,
      type: "Section",
      props: { name: `Section ${s}` },
      slots: { children: gridIds },
    };
    sectionIds.push(sectionId);
  }

  // Root Page node
  nodes[rootId] = {
    id: rootId,
    type: "Page",
    props: { title: "Large Test Document" },
    slots: { children: sectionIds },
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    root: rootId,
    nodes,
    theme: DEFAULT_THEME,
    breakpoints: [...DEFAULT_BREAKPOINTS],
  };
}
