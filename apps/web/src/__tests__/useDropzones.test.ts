import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDropzones, parseDragItem, parseZoneId } from "../components/dnd/useDropzones.js";
import { useEditorStore } from "../stores/editorStore.js";
import { EMPTY_DOCUMENT, makeDocument, nodeId } from "@pageforge/ir";
import type { DocNode, NodeId } from "@pageforge/ir";
import type { NodeBounds } from "@pageforge/contracts";

function makeBounds(id: string): NodeBounds {
  return {
    id: nodeId(id),
    rect: { top: 0, left: 0, width: 1280, height: 800 },
    visible: true,
  };
}

beforeEach(() => {
  useEditorStore.setState({
    doc: EMPTY_DOCUMENT,
    boundsMap: new Map(),
    iframeOffset: { top: 0, left: 0 },
  });
});

describe("useDropzones", () => {
  it("returns empty array when dragItem is null", () => {
    const { result } = renderHook(() => useDropzones(null));
    expect(result.current).toEqual([]);
  });

  it("returns empty array for Page type — root-only, no valid parent", () => {
    const { result } = renderHook(() =>
      useDropzones({ id: "new:Page", type: "new", componentType: "Page" }),
    );
    expect(result.current).toEqual([]);
  });

  it("returns no zones when boundsMap is empty (iframe not ready)", () => {
    const { result } = renderHook(() =>
      useDropzones({ id: "new:Section", type: "new", componentType: "Section" }),
    );
    expect(result.current).toEqual([]);
  });

  it("returns zones for Section when root Page has bounds", () => {
    useEditorStore.setState({
      boundsMap: new Map([[nodeId("root"), makeBounds("root")]]),
    });

    const { result } = renderHook(() =>
      useDropzones({ id: "new:Section", type: "new", componentType: "Section" }),
    );

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0]?.parentId).toBe("root");
    expect(result.current[0]?.slot).toBe("children");
  });

  it("zone id has format 'parentId:slotName:index'", () => {
    useEditorStore.setState({
      boundsMap: new Map([[nodeId("root"), makeBounds("root")]]),
    });

    const { result } = renderHook(() =>
      useDropzones({ id: "new:Section", type: "new", componentType: "Section" }),
    );

    expect(result.current[0]?.id).toMatch(/^root:children:\d+$/);
  });

  it("excludes the dragged node itself as a drop target", () => {
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
    const doc = makeDocument([page, section]);

    useEditorStore.setState({
      doc,
      boundsMap: new Map([
        [nodeId("root"), makeBounds("root")],
        [nodeId("s1"), makeBounds("s1")],
      ]),
    });

    const { result } = renderHook(() =>
      useDropzones({ id: "existing:s1", type: "existing", nodeId: nodeId("s1") }),
    );

    const zoneParentIds = result.current.map(z => z.parentId);
    expect(zoneParentIds).not.toContain("s1");
  });

  it("returns no zones for unknown component type", () => {
    useEditorStore.setState({
      boundsMap: new Map([[nodeId("root"), makeBounds("root")]]),
    });

    const { result } = renderHook(() =>
      useDropzones({ id: "new:UnknownWidget", type: "new", componentType: "UnknownWidget" }),
    );

    expect(result.current).toEqual([]);
  });
});

describe("parseDragItem", () => {
  it("parses existing node drag", () => {
    const item = parseDragItem("existing:abc123");
    expect(item?.type).toBe("existing");
    expect(item?.nodeId).toBe("abc123");
  });

  it("parses new component drag", () => {
    const item = parseDragItem("new:Heading");
    expect(item?.type).toBe("new");
    expect(item?.componentType).toBe("Heading");
  });

  it("returns null for unknown format", () => {
    expect(parseDragItem("garbage")).toBeNull();
    expect(parseDragItem("")).toBeNull();
  });
});

describe("parseZoneId", () => {
  it("parses a valid zone id", () => {
    const zone = parseZoneId("root:children:2");
    expect(zone?.parentId).toBe("root");
    expect(zone?.slot).toBe("children");
    expect(zone?.index).toBe(2);
  });

  it("returns null for null input", () => {
    expect(parseZoneId(null)).toBeNull();
  });

  it("returns null for malformed id", () => {
    expect(parseZoneId("bad")).toBeNull();
    expect(parseZoneId("a:b:c:d")).toBeNull();
  });
});
