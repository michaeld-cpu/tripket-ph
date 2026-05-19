"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { Line, lines } from "@/lib/shipping-lines";

type Ctx = {
  active: Line;
  setActiveId: (id: string) => void;
  lines: Line[];
};

const ShippingLineContext = createContext<Ctx | null>(null);

export function ShippingLineProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState(lines[0].id);
  const active = lines.find(l => l.id === activeId) ?? lines[0];
  return (
    <ShippingLineContext.Provider value={{ active, setActiveId, lines }}>
      {children}
    </ShippingLineContext.Provider>
  );
}

export function useShippingLine() {
  const ctx = useContext(ShippingLineContext);
  if (!ctx) throw new Error("useShippingLine must be used inside ShippingLineProvider");
  return ctx;
}
