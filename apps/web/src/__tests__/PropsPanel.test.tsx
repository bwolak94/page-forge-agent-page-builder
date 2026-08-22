/**
 * PropsPanel integration test.
 *
 * Verifies that a mock ComponentDef produces a working inspector panel with
 * zero UI code beyond adding it to the registry mock.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { z } from "zod";
import { nodeId } from "@pageforge/ir";
import { PropsPanel } from "../components/inspector/PropsPanel.js";
import { useEditorStore } from "../stores/editorStore.js";
import { FIXTURE_DOCUMENT } from "../lib/fixtureDocument.js";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Initialise store with the fixture document
  act(() => {
    useEditorStore.getState().setDoc(FIXTURE_DOCUMENT);
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PropsPanel", () => {
  it("renders text input for string props on a known node", () => {
    // hero1 is a Hero node with 'headline' and 'subheadline' string props
    render(<PropsPanel nodeId={nodeId("hero1")} />);
    // zodToFields maps ZodString → TextField → <input>
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("renders a switch for boolean props (Button.disabled)", () => {
    // btn-hero is a Button with disabled: boolean
    render(<PropsPanel nodeId={nodeId("btn-hero")} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("renders a combobox for enum props (Hero.layout)", () => {
    render(<PropsPanel nodeId={nodeId("hero1")} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows unknown-component message for unregistered node type", () => {
    act(() => {
      useEditorStore.getState().setDoc({
        ...FIXTURE_DOCUMENT,
        nodes: {
          ...FIXTURE_DOCUMENT.nodes,
          [nodeId("unknown1")]: {
            id: nodeId("unknown1"),
            type: "UnknownWidget",
            props: {},
            slots: {},
          },
        },
      });
    });
    render(<PropsPanel nodeId={nodeId("unknown1")} />);
    expect(screen.getByText(/unknown component type/i)).toBeInTheDocument();
  });
});
