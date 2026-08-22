"use client";

/**
 * IrRendererContext — React context providing doc and registry to the canvas frame.
 *
 * Allows deeply nested frame components to access the live document without
 * prop drilling. IrRenderer also accepts props directly for testability.
 */

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Document } from "@pageforge/ir";
import type { Registry } from "@pageforge/registry";

export interface IrRendererContextValue {
  doc: Document;
  registry: Registry;
}

const IrRendererContext = createContext<IrRendererContextValue | null>(null);

export function IrRendererProvider({
  doc,
  registry,
  children,
}: IrRendererContextValue & { children: ReactNode }) {
  return (
    <IrRendererContext.Provider value={{ doc, registry }}>{children}</IrRendererContext.Provider>
  );
}

export function useIrRendererContext(): IrRendererContextValue {
  const ctx = useContext(IrRendererContext);
  if (!ctx) {
    throw new Error("useIrRendererContext must be used within IrRendererProvider");
  }
  return ctx;
}
