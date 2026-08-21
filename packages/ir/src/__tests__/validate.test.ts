import { describe, it, expect } from "vitest";
import { produce } from "immer";
import {
  validateDocument,
  checkAcyclicity,
  checkReferentialIntegrity,
  checkReachability,
  checkRootNotInSlot,
} from "../validate.js";
import { EMPTY_DOCUMENT, ROOT_ID } from "../constants.js";
import { nodeId } from "../types.js";
import type { Document, NodeId } from "../types.js";
import { makeDocument } from "../normalize.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const N1 = nodeId("n1");
const N2 = nodeId("n2");
const N3 = nodeId("n3");

/** A document with root → n1 → n2 (linear chain). */
function linearDoc(): Document {
  return makeDocument([
    { id: ROOT_ID, type: "Page", props: {}, slots: { children: [N1] } },
    { id: N1, type: "Section", props: {}, slots: { children: [N2] } },
    { id: N2, type: "Heading", props: {}, slots: {} },
  ]);
}

// ---------------------------------------------------------------------------
// validateDocument (composed)
// ---------------------------------------------------------------------------

describe("validateDocument", () => {
  it("passes for EMPTY_DOCUMENT", () => {
    expect(validateDocument(EMPTY_DOCUMENT).isOk()).toBe(true);
  });

  it("passes for a linear chain", () => {
    expect(validateDocument(linearDoc()).isOk()).toBe(true);
  });

  it("returns Err for any invariant violation", () => {
    // Inject a dangling ref — fastest way to produce an invalid doc
    const bad = produce(linearDoc(), draft => {
      draft.nodes[N1]!.slots["children"] = [nodeId("ghost") as NodeId];
    });
    expect(validateDocument(bad).isErr()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1. checkAcyclicity
// ---------------------------------------------------------------------------

describe("checkAcyclicity", () => {
  it("passes on a valid document", () => {
    expect(checkAcyclicity(EMPTY_DOCUMENT).isOk()).toBe(true);
    expect(checkAcyclicity(linearDoc()).isOk()).toBe(true);
  });

  it("fails when a node references an ancestor (cycle)", () => {
    const cyclic = produce(linearDoc(), draft => {
      // n2 → n1 (back-edge)
      draft.nodes[N2]!.slots["children"] = [N1];
    });
    const result = checkAcyclicity(cyclic);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("CYCLIC");
  });

  it("fails when a node references itself", () => {
    const selfRef = produce(linearDoc(), draft => {
      draft.nodes[N2]!.slots["children"] = [N2];
    });
    const result = checkAcyclicity(selfRef);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("CYCLIC");
  });
});

// ---------------------------------------------------------------------------
// 2. checkReferentialIntegrity
// ---------------------------------------------------------------------------

describe("checkReferentialIntegrity", () => {
  it("passes on a valid document", () => {
    expect(checkReferentialIntegrity(EMPTY_DOCUMENT).isOk()).toBe(true);
    expect(checkReferentialIntegrity(linearDoc()).isOk()).toBe(true);
  });

  it("fails when a slot references a node that does not exist", () => {
    const dangling = produce(linearDoc(), draft => {
      draft.nodes[ROOT_ID]!.slots["children"] = [nodeId("ghost") as NodeId];
    });
    const result = checkReferentialIntegrity(dangling);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("DANGLING_REF");
  });

  it("includes the offending parent node id in the error", () => {
    const dangling = produce(linearDoc(), draft => {
      draft.nodes[N1]!.slots["children"] = [nodeId("missing") as NodeId];
    });
    const err = checkReferentialIntegrity(dangling)._unsafeUnwrapErr();
    expect(err.nodeId).toBe(N1);
  });
});

// ---------------------------------------------------------------------------
// 3. checkReachability
// ---------------------------------------------------------------------------

describe("checkReachability", () => {
  it("passes on a valid document", () => {
    expect(checkReachability(EMPTY_DOCUMENT).isOk()).toBe(true);
    expect(checkReachability(linearDoc()).isOk()).toBe(true);
  });

  it("fails when there is an orphan node not reachable from root", () => {
    // Add n3 directly to nodes but don't wire it into any slot
    const orphaned = produce(linearDoc(), draft => {
      draft.nodes[N3] = { id: N3, type: "Button", props: {}, slots: {} };
    });
    const result = checkReachability(orphaned);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("ORPHAN");
    expect(result._unsafeUnwrapErr().nodeId).toBe(N3);
  });
});

// ---------------------------------------------------------------------------
// 4. checkRootNotInSlot
// ---------------------------------------------------------------------------

describe("checkRootNotInSlot", () => {
  it("passes on a valid document", () => {
    expect(checkRootNotInSlot(EMPTY_DOCUMENT).isOk()).toBe(true);
    expect(checkRootNotInSlot(linearDoc()).isOk()).toBe(true);
  });

  it("fails when root appears as a child of another node", () => {
    const rootAsChild = produce(linearDoc(), draft => {
      draft.nodes[N2]!.slots["children"] = [ROOT_ID];
    });
    const result = checkRootNotInSlot(rootAsChild);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("ROOT_IN_SLOT");
  });
});
