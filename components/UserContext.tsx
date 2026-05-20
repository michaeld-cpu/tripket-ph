"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "admin" | "operator";

export type CurrentUser = {
  name: string;
  email: string;
  role: Role;
  /** Required when role === "operator" — scopes the entire UI to this line. */
  shippingLineId?: string;
};

const ADMIN_USER: CurrentUser = {
  name: "Admin User",
  email: "admin@tripket.ph",
  role: "admin",
};

const OPERATOR_USER: CurrentUser = {
  name: "2GO Operator",
  email: "ops@2go.com.ph",
  role: "operator",
  shippingLineId: "2go",
};

type Ctx = {
  user: CurrentUser;
  /** Dev-only role switcher — flips between admin and the seeded operator account. Remove once real auth lands. */
  setRole: (role: Role) => void;
};

const UserContext = createContext<Ctx | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(ADMIN_USER);
  const setRole = (role: Role) => setUser(role === "admin" ? ADMIN_USER : OPERATOR_USER);
  return <UserContext.Provider value={{ user, setRole }}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useCurrentUser must be used inside UserProvider");
  return ctx;
}
