import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLayerTree } from "../components/layer-panel/useLayerTree.js";
import { useEditorStore } from "../stores/editorStore.js";
import { EMPTY_DOCUMENT, makeDocument, nodeId } from "@pageforge/ir";
import type { DocNode } from "@pageforge/ir";

beforeEach(() => {
  useEditorStore.setState({ doc: EMPTY_DOCUMENT });
});

describe("useLayerTree", () => {
  it("returns the root node for EMPTY_DOCUMENT", () => {
    const { result } = renderHook(() => useLayerTree());
    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.id).toBe("root");
    expect(result.current[0]?.type).toBe("Page");
    expect(result.current[0]?.depth).toBe(0);
  });

  it("flattens DFS with correct depth for children", () => {
    const section: DocNode = {
      id: nodeId("s1"),
      type: "Section",
      props: { padding: "md", background: "white", fullWidth: false, minHeight: "auto" },
      slots: { children: [] },
    };
    const page: DocNode = {
      id: nodeId("root"),
      type: "Page",
      props: { title: "Test", lang: "en" },
      slots: { children: [nodeId("s1")] },
    };

    useEditorStore.setState({ doc: makeDocument([page, section]) });

    const { result } = renderHook(() => useLayerTree());

    expect(result.current).toHaveLength(2);
    expect(result.current[0]?.id).toBe("root");
    expect(result.current[0]?.depth).toBe(0);
    expect(result.current[1]?.id).toBe("s1");
    expect(result.current[1]?.depth).toBe(1);
  });

  it("uses meta.name when available", () => {
    const page: DocNode = {
      id: nodeId("root"),
      type: "Page",
      props: {},
      slots: { children: [] },
      meta: { name: "My Landing Page" },
    };

    useEditorStore.setState({ doc: makeDocument([page]) });

    const { result } = renderHook(() => useLayerTree());
    expect(result.current[0]?.name).toBe("My Landing Page");
  });

  it("falls back to type as name when meta.name is absent", () => {
    const { result } = renderHook(() => useLayerTree());
    expect(result.current[0]?.name).toBe("Page");
  });

  it("reflects locked and hidden flags", () => {
    const page: DocNode = {
      id: nodeId("root"),
      type: "Page",
      props: {},
      slots: { children: [] },
      meta: { locked: true, hidden: true },
    };

    useEditorStore.setState({ doc: makeDocument([page]) });

    const { result } = renderHook(() => useLayerTree());
    expect(result.current[0]?.locked).toBe(true);
    expect(result.current[0]?.hidden).toBe(true);
  });

  it("handles 3 levels of nesting with correct depths", () => {
    const heading: DocNode = {
      id: nodeId("h1"),
      type: "Heading",
      props: { level: 1, text: "Title", align: "left", color: "black" },
      slots: {},
    };
    const section: DocNode = {
      id: nodeId("s1"),
      type: "Section",
      props: { padding: "md", background: "white", fullWidth: false, minHeight: "auto" },
      slots: { children: [nodeId("h1")] },
    };
    const page: DocNode = {
      id: nodeId("root"),
      type: "Page",
      props: { title: "Test", lang: "en" },
      slots: { children: [nodeId("s1")] },
    };

    useEditorStore.setState({ doc: makeDocument([page, section, heading]) });

    const { result } = renderHook(() => useLayerTree());

    expect(result.current).toHaveLength(3);
    expect(result.current[2]?.id).toBe("h1");
    expect(result.current[2]?.depth).toBe(2);
  });
});
