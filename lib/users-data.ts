// ─────────── Users ───────────
// The user directory is global: every operator account across all shipping
// lines is listed regardless of the active line (this is the super-admin
// view). Each user is tied to exactly one shipping line via `lineId`.

import { lines } from "@/lib/shipping-lines";

export type UserRole = "Admin" | "Operator";
export type UserStatus = "Active" | "Suspended";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Shipping line this user operates under. */
  lineId: string;
  status: UserStatus;
  /** Last sign-in timestamp; null for users who haven't accepted an invite. */
  lastActive: Date | null;
};

// Admin reads as the elevated role in brand orange; Operator is a quiet
// neutral chip. Same shape so the pair looks uniform and on-brand.
export const roleTone: Record<UserRole, string> = {
  Admin:    "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  Operator: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70",
};

export const userStatusTone: Record<UserStatus, string> = {
  Active:    "bg-emerald-100 text-emerald-800",
  Suspended: "bg-slate-100 text-slate-500",
};

// Deterministic mock directory — a spread of roles/statuses across the lines.
const FIRST = ["Ada", "Marco", "Liza", "Ramon", "Carla", "Diego", "Mae", "Paolo", "Trisha", "Ben", "Nina", "Gio", "Rhea", "Jun", "Ella", "Karl", "Mika", "Tonio"];
const LAST = ["Reyes", "Santos", "Cruz", "Dela Cruz", "Mendoza", "Villanueva", "Aquino", "Navarro", "Castillo", "Ramos", "Bautista", "Flores"];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function buildUsers(): User[] {
  const out: User[] = [];
  let n = 0;
  lines.forEach((line) => {
    // 3–6 users per line, derived deterministically from the line id.
    const seed = hashStr(line.id);
    const count = 3 + (seed % 4);
    for (let i = 0; i < count; i++) {
      const r = hashStr(`${line.id}-${i}`);
      const first = FIRST[r % FIRST.length];
      const last = LAST[((r >>> 5) % LAST.length + LAST.length) % LAST.length];
      const name = `${first} ${last}`;
      const role: UserRole = r % 4 === 0 ? "Admin" : "Operator";
      const status: UserStatus = r % 9 === 0 ? "Suspended" : "Active";
      const minutesAgo = (r % 20000); // up to ~14 days
      out.push({
        id: `usr-${line.id}-${i}`,
        name,
        email: `${first.toLowerCase()}.${last.replace(/\s+/g, "").toLowerCase()}@${line.id}.ph`,
        role,
        lineId: line.id,
        status,
        lastActive: new Date(Date.now() - minutesAgo * 60_000),
      });
      n++;
    }
  });
  void n;
  return out;
}

export function lineName(lineId: string): string {
  return lines.find((l) => l.id === lineId)?.name ?? lineId;
}
