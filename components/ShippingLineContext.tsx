"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { Line, lines } from "@/lib/shipping-lines";
import { useCurrentUser } from "./UserContext";

type Ctx = {
  active: Line;
  setActiveId: (id: string) => void;
  lines: Line[];
  /** Operators can't change their line — switcher / setter become no-ops. */
  locked: boolean;
};

const ShippingLineContext = createContext<Ctx | null>(null);

export function ShippingLineProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const [activeId, setActiveId] = useState(lines[0].id);

  // Operators see only their assigned line; admin uses the local switcher state.
  const effectiveId =
    user.role === "operator" && user.shippingLineId ? user.shippingLineId : activeId;
  const active = lines.find(l => l.id === effectiveId) ?? lines[0];
  const locked = user.role === "operator";

  return (
    <ShippingLineContext.Provider
      value={{
        active,
        setActiveId: locked ? () => {} : setActiveId,
        lines,
        locked,
      }}
    >
      {children}
    </ShippingLineContext.Provider>
  );
}

export function useShippingLine() {
  const ctx = useContext(ShippingLineContext);
  if (!ctx) throw new Error("useShippingLine must be used inside ShippingLineProvider");
  return ctx;
}
