/**
 * tools.ts — Vercel AI SDK tool definitions for the agent.
 *
 * Tool parameters reuse Command.argsSchema wherever possible (DRY).
 * Adding a new command = add one entry here; loop unchanged (OCP).
 *
 * Tools are split into:
 * - Read-only (queryTree, inspectNode, listComponents, preview)
 * - Mutating (insertNode, updateProps, moveNode, wrapNode, deleteNode, applyTheme)
 */

import { tool } from "ai";
import { z } from "zod";
import {
  insertNodeSchema,
  updatePropsSchema,
  moveNodeSchema,
  wrapNodeSchema,
  deleteNodeSchema,
  applyThemeSchema,
} from "@pageforge/commands";

export const TOOL_DEFINITIONS = {
  // -------------------------------------------------------------------------
  // Read-only
  // -------------------------------------------------------------------------

  queryTree: tool({
    description:
      "Get a compact JSON summary of the document tree. " +
      "Call this before inserting or moving nodes to understand the current structure.",
    parameters: z.object({
      focusId: z
        .string()
        .optional()
        .describe("Fully expand this node and its subtree"),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(4)
        .describe("Maximum depth to recurse"),
      maxNodes: z
        .number()
        .int()
        .min(10)
        .max(200)
        .default(80)
        .describe("Maximum nodes to include"),
    }),
  }),

  inspectNode: tool({
    description:
      "Get full props, slots, and metadata of a specific node by ID. " +
      "Use after queryTree when you need detailed info about one node.",
    parameters: z.object({
      id: z.string().describe("Node ID to inspect"),
    }),
  }),

  listComponents: tool({
    description:
      "List available component types with their descriptions and prop schemas. " +
      "Already included in context — call only when filtering by category.",
    parameters: z.object({
      category: z
        .string()
        .optional()
        .describe("Filter by category: layout | typography | media | interactive | navigation"),
    }),
  }),

  // -------------------------------------------------------------------------
  // Mutating — schemas come directly from the command layer (DRY)
  // -------------------------------------------------------------------------

  insertNode: tool({
    description:
      "Insert a new component node into the document. " +
      "Requires a valid parentId, slot name, and component type from listComponents.",
    parameters: insertNodeSchema,
  }),

  updateProps: tool({
    description:
      "Update one or more props on an existing node. " +
      "Merges with current props — does not replace the entire props object.",
    parameters: updatePropsSchema,
  }),

  moveNode: tool({
    description:
      "Move an existing node to a different parent, slot, or position within the same slot.",
    parameters: moveNodeSchema,
  }),

  wrapNode: tool({
    description:
      "Wrap an existing node inside a new container component (e.g. wrap a Heading in a Section).",
    parameters: wrapNodeSchema,
  }),

  deleteNode: tool({
    description:
      "Delete a node and all its descendants. This is irreversible within this agent turn.",
    parameters: deleteNodeSchema,
  }),

  applyTheme: tool({
    description:
      "Change global design tokens: colors, spacing, radii, or typography scale. " +
      "Affects the entire page immediately.",
    parameters: applyThemeSchema,
  }),

  preview: tool({
    description:
      "Request a visual assessment of the current canvas state. " +
      "Use this to verify your changes look correct before declaring done.",
    parameters: z.object({}),
  }),
} as const;

export type ToolName = keyof typeof TOOL_DEFINITIONS;
