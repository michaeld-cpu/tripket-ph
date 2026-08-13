// ─────────── Users ───────────
// The user directory is global: every operator account across all shipping
// lines is listed regardless of the active line (this is the super-admin
// view). Each user is tied to exactly one shipping line via `lineId`.

import { lines } from "@/lib/shipping-lines";

export type UserRole = "Superadmin" | "Admin" | "Operator";
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
// Display label per role — keeps the stored "Superadmin" value (so filters and
// persisted users still match) while surfacing "Super Admin" to the operator.
export const roleLabel: Record<UserRole, string> = {
  Superadmin: "Super Admin",
  Admin: "Admin",
  Operator: "Operator",
};

export const roleTone: Record<UserRole, string> = {
  // Same green as a Confirmed booking, so "elevated / cleared" reads the same
  // way across the app.
  Superadmin: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/70",
  Admin:      "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  Operator:   "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70",
};

export const userStatusTone: Record<UserStatus, string> = {
  Active:    "bg-emerald-100 text-emerald-800",
  Suspended: "bg-slate-100 text-slate-500",
};

// Display label per status. Value and label now agree — the UI says
// "Suspended" because that's what the record is.
export const userStatusLabel: Record<UserStatus, string> = {
  Active:    "Active",
  Suspended: "Suspended",
};

// Deterministic mock directory — a spread of roles/statuses across the lines.
const FIRST = ["Ada", "Marco", "Liza", "Ramon", "Carla", "Diego", "Mae", "Paolo", "Trisha", "Ben", "Nina", "Gio", "Rhea", "Jun", "Ella", "Karl", "Mika", "Tonio"];
const LAST = ["Reyes", "Santos", "Cruz", "Dela Cruz", "Mendoza", "Villanueva", "Aquino", "Navarro", "Castillo", "Ramos", "Bautista", "Flores"];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Two fixed platform Super Admins. Unlike the per-line staff below, these are
// governance accounts that always exist — stable ids so they're never
// duplicated when the seed is merged into an existing directory.
export const PLATFORM_SUPERADMINS: User[] = [
  {
    id: "usr-superadmin-1",
    name: "Super Admin",
    email: "super_admin@tripket.com",
    role: "Superadmin",
    lineId: lines[0]?.id ?? "",
    status: "Active",
    lastActive: new Date(),
  },
  {
    id: "usr-superadmin-2",
    name: "Platform Owner",
    email: "platform_owner@tripket.com",
    role: "Superadmin",
    lineId: lines[0]?.id ?? "",
    status: "Active",
    lastActive: new Date(),
  },
];

export function buildUsers(): User[] {
  const out: User[] = [...PLATFORM_SUPERADMINS];
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
      // ~1/8 Superadmin, ~1/8 Admin, rest Operator — gives the Users tab
      // (Admin + Superadmin) a believable role mix to filter on.
      const role: UserRole = r % 8 === 0 ? "Superadmin" : r % 4 === 0 ? "Admin" : "Operator";
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
