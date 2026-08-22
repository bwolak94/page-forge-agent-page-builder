/**
 * tree-summary.ts — compact XML-like document tree renderer.
 *
 * Produces a human-readable string summary of the document for injection into
 * the agent system prompt. Three reduction mechanisms keep the output bounded:
 *
 *   1. Depth limit         — nodes beyond maxDepth are collapsed to a single line.
 *   2. Focus expansion     — the subtree rooted at focusId (and its ancestors)
 *                            is rendered at focusDepth, overriding the limit.
 *   3. Sibling compression — consecutive children of the same type with count
 *                            >= siblingThreshold are compressed to one exemplar
 *                            + "… +N similar" annotation.
 *
 * Example output:
 *   <Page id=root>
 *     <Nav id=n1 items=4 />
 *     <Hero id=h1 headline="Build pages" />
 *     <Section id=s2 name="Pricing">
 *       <Grid id=g1 cols=3>
 *         <PricingCard id=p1 title="Starter" />
 *         … +2 similar (p2, p3)
 *       </Grid>
 *     </Section>
 *     <Section id=s3 …/> [12 nodes collapsed]
 *   </Page>
 */

import type { Document, DocNode, NodeId, JsonValue } from "@pageforge/ir";
import { ancestors } from "@pageforge/ir";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface TreeSummaryConfig {
  /** Fully expand this node's subtree, overriding depth limit. */
  focusId?: NodeId;
  /** Maximum depth to render. Nodes deeper than this are collapsed. */
  maxDepth: number;
  /** Depth budget for the focus subtree (usually maxDepth + 2). */
  focusDepth: number;
  /**
   * Minimum consecutive run of identical component types required to trigger
   * sibling compression. Set to Infinity to disable.
   */
  siblingThreshold: number;
  /** Hard cap on the number of nodes rendered. Prevents runaway output. */
  maxNodes: number;
}

export const DEFAULT_CONFIG: TreeSummaryConfig = {
  maxDepth: 4,
  focusDepth: 6,
  siblingThreshold: 4,
  maxNodes: 80,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a compact XML-like summary of the document tree.
 *
 * @param doc    — the document to summarise
 * @param config — partial override of DEFAULT_CONFIG
 * @returns multi-line string suitable for LLM system prompt injection
 */
export function renderTreeSummary(
  doc: Document,
  config: Partial<TreeSummaryConfig> = {},
): string {
  const cfg: TreeSummaryConfig = { ...DEFAULT_CONFIG, ...config };

  // Build ancestor set for focus path highlighting (O(depth) lookup)
  const focusAncestors: Set<NodeId> = cfg.focusId
    ? new Set(ancestors(doc, cfg.focusId))
    : new Set();

  let nodeCount = 0;

  function renderNode(id: NodeId, depth: number, inFocusPath: boolean): string {
    if (nodeCount >= cfg.maxNodes) return "";

    const node = doc.nodes[id];
    if (!node) return "";

    nodeCount++;

    const onFocusPath = inFocusPath || focusAncestors.has(id) || id === cfg.focusId;
    const effectiveMaxDepth = onFocusPath ? cfg.focusDepth : cfg.maxDepth;

    const indent = "  ".repeat(depth);
    const propsStr = formatTopProps(node.props, 4);

    const allChildren = Object.values(node.slots).flat();

    // Depth-limit: collapse node to self-closing with count annotation
    if (depth >= effectiveMaxDepth || allChildren.length === 0) {
      const collapse =
        allChildren.length > 0 ? ` [${countSubtree(doc, id) - 1} nodes collapsed]` : "";
      if (propsStr) {
        return `${indent}<${node.type} id=${id} ${propsStr}${collapse} />`;
      }
      return `${indent}<${node.type} id=${id}${collapse} />`;
    }

    const childLines = renderSlots(node, depth, onFocusPath);
    const filtered = childLines.filter(Boolean);

    if (filtered.length === 0) {
      if (propsStr) return `${indent}<${node.type} id=${id} ${propsStr} />`;
      return `${indent}<${node.type} id=${id} />`;
    }

    const open = propsStr
      ? `${indent}<${node.type} id=${id} ${propsStr}>`
      : `${indent}<${node.type} id=${id}>`;

    return [open, ...filtered, `${indent}</${node.type}>`].join("\n");
  }

  function renderSlots(node: DocNode, depth: number, inFocusPath: boolean): string[] {
    const lines: string[] = [];

    for (const childIds of Object.values(node.slots)) {
      if (childIds.length === 0) continue;

      const groups = groupSiblings(childIds, doc, cfg.siblingThreshold);

      for (const group of groups) {
        const first = group[0]!;
        if (group.length === 1) {
          lines.push(renderNode(first, depth + 1, inFocusPath));
        } else {
          // Compressed group: show first exemplar + annotation
          lines.push(renderNode(first, depth + 1, inFocusPath));
          const rest = group.slice(1);
          const indentChild = "  ".repeat(depth + 1);
          lines.push(`${indentChild}… +${rest.length} similar (${rest.join(", ")})`);
        }
      }
    }

    return lines;
  }

  return renderNode(doc.root, 0, false);
}

// ---------------------------------------------------------------------------
// Sibling compression
// ---------------------------------------------------------------------------

/**
 * Group consecutive node IDs by component type.
 * Groups with length >= threshold are returned as a single group (compressed).
 * Smaller groups are returned as individual single-element groups.
 */
function groupSiblings(ids: NodeId[], doc: Document, threshold: number): NodeId[][] {
  if (ids.length === 0) return [];

  const result: NodeId[][] = [];
  let currentGroup: NodeId[] = [ids[0]!];
  let currentType = doc.nodes[ids[0]!]?.type;

  for (let i = 1; i < ids.length; i++) {
    const id = ids[i]!;
    const nodeType = doc.nodes[id]?.type;

    if (nodeType === currentType) {
      currentGroup.push(id);
    } else {
      flushGroup(currentGroup, threshold, result);
      currentGroup = [id];
      currentType = nodeType;
    }
  }

  flushGroup(currentGroup, threshold, result);
  return result;
}

function flushGroup(group: NodeId[], threshold: number, result: NodeId[][]): void {
  if (group.length >= threshold) {
    result.push(group);
  } else {
    for (const id of group) result.push([id]);
  }
}

// ---------------------------------------------------------------------------
// Prop formatting
// ---------------------------------------------------------------------------

/**
 * Format the top `max` scalar props as inline XML attributes.
 * Only string, number, and boolean values are included (omit arrays/objects).
 */
function formatTopProps(props: Record<string, JsonValue>, max: number): string {
  return Object.entries(props)
    .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .slice(0, max)
    .map(([k, v]) => {
      const strVal = String(v);
      // Truncate long string values to keep the summary concise
      const display = strVal.length > 40 ? strVal.slice(0, 37) + "…" : strVal;
      return typeof v === "string" ? `${k}="${display}"` : `${k}=${display}`;
    })
    .join(" ");
}

// ---------------------------------------------------------------------------
// Subtree size helper (for collapse annotation)
// ---------------------------------------------------------------------------

function countSubtree(doc: Document, id: NodeId): number {
  let count = 1;
  const node = doc.nodes[id];
  if (!node) return count;
  for (const childIds of Object.values(node.slots)) {
    for (const childId of childIds) {
      count += countSubtree(doc, childId);
    }
  }
  return count;
}
