import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IrRenderer } from "../components/canvas-frame/IrRenderer.js";
import { REGISTRY } from "@pageforge/registry";
import { makeDocument, nodeId, EMPTY_DOCUMENT } from "@pageforge/ir";
import type { DocNode, NodeId } from "@pageforge/ir";

function headingNode(id: string, text: string): DocNode {
  return {
    id: nodeId(id),
    type: "Heading",
    props: { level: 2, text, align: "left", color: "var(--pf-color-text)" },
    slots: {},
  };
}

describe("IrRenderer", () => {
  it("renders a Heading node with its text", () => {
    const node = headingNode("h1", "Hello");
    const doc = makeDocument([node]);
    render(<IrRenderer doc={doc} nodeId={doc.root} registry={REGISTRY} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("wraps the component in a div with data-node-id", () => {
    const node = headingNode("h1", "Test");
    const doc = makeDocument([node]);
    const { container } = render(<IrRenderer doc={doc} nodeId={doc.root} registry={REGISTRY} />);
    expect(container.querySelector("[data-node-id]")).toBeTruthy();
    expect(container.querySelector("[data-node-id]")?.getAttribute("data-node-id")).toBe("h1");
  });

  it("renders null for unknown nodeId", () => {
    const { container } = render(
      <IrRenderer doc={EMPTY_DOCUMENT} nodeId={"nonexistent" as NodeId} registry={REGISTRY} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a placeholder for unknown component type", () => {
    const node: DocNode = {
      id: nodeId("x1"),
      type: "UnknownWidget",
      props: {},
      slots: {},
    };
    const doc = makeDocument([node]);
    const { container } = render(<IrRenderer doc={doc} nodeId={doc.root} registry={REGISTRY} />);
    expect(container.textContent).toContain("[UnknownWidget]");
  });

  it("recursively renders children in slots", () => {
    const child = headingNode("h1", "Child Heading");
    const parent: DocNode = {
      id: nodeId("s1"),
      type: "Section",
      props: {
        padding: "md",
        background: "var(--pf-color-background)",
        fullWidth: false,
        minHeight: "auto",
      },
      slots: { children: [nodeId("h1")] },
    };
    const doc = makeDocument([parent, child]);
    render(<IrRenderer doc={doc} nodeId={doc.root} registry={REGISTRY} />);
    expect(screen.getByText("Child Heading")).toBeInTheDocument();
  });

  it("renders the root Page node from EMPTY_DOCUMENT", () => {
    const { container } = render(
      <IrRenderer doc={EMPTY_DOCUMENT} nodeId={EMPTY_DOCUMENT.root} registry={REGISTRY} />,
    );
    expect(container.querySelector("[data-node-type='Page']")).toBeTruthy();
  });
});
