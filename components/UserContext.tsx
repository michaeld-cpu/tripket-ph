"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

// Two seeded credential records. Until a real backend lands, sign-in is
// verified against these hard-coded email+password pairs.
type Credential = { user: CurrentUser; password: string };
const CREDENTIALS: Credential[] = [
  { user: ADMIN_USER, password: "admin123" },
  { user: OPERATOR_USER, password: "operator123" },
];

const STORAGE_KEY = "tripket.auth";

export type SignInResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; error: "unknown_email" | "wrong_password" };

type Ctx = {
  user: CurrentUser | null;
  isAuthed: boolean;
  /** Verify email + password against the seeded credentials. */
  signIn: (email: string, password: string) => SignInResult;
  signOut: () => void;
};

const UserContext = createContext<Ctx | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore session from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as CurrentUser);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const signIn = (email: string, password: string): SignInResult => {
    const cred = CREDENTIALS.find((c) => c.user.email.toLowerCase() === email.trim().toLowerCase());
    if (!cred) return { ok: false, error: "unknown_email" };
    if (cred.password !== password) return { ok: false, error: "wrong_password" };
    setUser(cred.user);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cred.user)); } catch { /* ignore */ }
    return { ok: true, user: cred.user };
  };

  const signOut = () => {
    setUser(null);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  // Avoid a hydration flash: render nothing until we've checked storage.
  if (!hydrated) return null;

  return (
    <UserContext.Provider value={{ user, isAuthed: !!user, signIn, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useCurrentUser must be used inside UserProvider");
  return ctx;
}

