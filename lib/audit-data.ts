// ─────────── Audit log ───────────
// Platform-wide accountability trail: every consequential action across all
// shipping lines, by whom, when, on what. Distinct from the per-record
// activity rail (which is scoped to a single booking/ticket). Global scope —
// the super-admin sees actions from every operator.

import { lines } from "@/lib/shipping-lines";

export type AuditArea = "Bookings" | "Tickets" | "Routes" | "Vessels" | "Schedules" | "Users";
export type AuditAction =
  | "created" | "updated" | "approved" | "cancelled" | "refunded"
  | "paid" | "disabled" | "enabled" | "deleted";

export type AuditEntry = {
  id: string;
  at: Date;
  actor: string;        // staff name
  lineId: string;       // operator the actor belongs to
  area: AuditArea;
  action: AuditAction;
  target: string;       // the entity touched (ref / id / name)
  /** Optional human detail, e.g. "₱4,500 returned". */
  detail?: string;
};

export const actionTone: Record<AuditAction, string> = {
  created:     "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  updated:     "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70",
  approved:    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  paid:        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  enabled:     "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  cancelled:   "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  refunded:    "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  disabled:    "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  deleted:     "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};

export const areaTone: Record<AuditArea, string> = {
  Bookings:  "bg-brand-50 text-brand-700",
  Tickets:   "bg-amber-50 text-amber-700",
  Routes:    "bg-sky-50 text-sky-700",
  Vessels:   "bg-violet-50 text-violet-700",
  Schedules: "bg-emerald-50 text-emerald-700",
  Users:     "bg-slate-100 text-slate-600",
};

// Staff actions are attributed generically to "Someone"; "System" stays last
// for system-generated entries (the picker excludes the final element).
const STAFF = ["Someone", "System"];

// Plausible (area → action → target) tuples for believable entries.
const TEMPLATES: { area: AuditArea; action: AuditAction; target: () => string; detail?: string }[] = [
  { area: "Bookings", action: "approved",  target: () => `BK-${rid(4)}` },
  { area: "Bookings", action: "cancelled", target: () => `BK-${rid(4)}`, detail: "Cancelled by operator" },
  { area: "Bookings", action: "refunded",  target: () => `BK-${rid(4)}`, detail: "Payment returned to wallet" },
  { area: "Tickets",  action: "paid",      target: () => `TKT-${rid(4)}-A`, detail: "Ticket number assigned" },
  { area: "Tickets",  action: "cancelled", target: () => `TKT-${rid(4)}-B` },
  { area: "Routes",   action: "created",   target: () => `RT-${rid(4)}` },
  { area: "Routes",   action: "updated",   target: () => `RT-${rid(4)}`, detail: "Crossing duration changed" },
  { area: "Routes",   action: "deleted",   target: () => `RT-${rid(4)}` },
  { area: "Vessels",  action: "created",   target: () => vesselName() },
  { area: "Vessels",  action: "updated",   target: () => vesselName(), detail: "Capacity updated" },
  { area: "Schedules",action: "created",   target: () => `Schedule ${pick(["A", "B", "C"])}`, detail: "Recurring weekly · 30 days" },
  { area: "Users",    action: "created",   target: () => personName() },
  { area: "Users",    action: "disabled",  target: () => personName() },
  { area: "Users",    action: "enabled",   target: () => personName() },
];

const VESSEL_NAMES = ["MV Filipinas Cebu", "MV Reina del Cielo", "MV Visayan Star", "FC Sinulog", "MV Santa Maria"];
function vesselName() { return pick(VESSEL_NAMES); }
function personName() { return `${pick(["Ramon", "Carla", "Diego", "Mae", "Paolo", "Trisha", "Nina", "Gio"])} ${pick(["Reyes", "Santos", "Cruz", "Mendoza", "Flores", "Navarro"])}`; }

// Deterministic-ish PRNG seeded per build call.
let _s = 123456789;
function rnd() { _s ^= _s << 13; _s ^= _s >>> 17; _s ^= _s << 5; return ((_s >>> 0) % 100000) / 100000; }
function pick<T>(arr: T[]): T { return arr[Math.floor(rnd() * arr.length)]; }
function rid(n: number) { return String(Math.floor(rnd() * 9000) + 1000).slice(0, n).padStart(n, "0"); }

// Generate `count` entries spread across the last `days` days, newest first.
export function buildAuditLog(count = 120, days = 14): AuditEntry[] {
  _s = 987654321; // reset seed for stable output
  const out: AuditEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const tpl = TEMPLATES[Math.floor(rnd() * TEMPLATES.length)];
    const line = lines[Math.floor(rnd() * lines.length)];
    // Weight recent days heavier so "Today" has plenty to audit.
    const ageMin = Math.floor(Math.pow(rnd(), 2) * days * 24 * 60);
    const actor = tpl.area === "Users" && rnd() < 0.4 ? "System" : STAFF[Math.floor(rnd() * (STAFF.length - 1))];
    out.push({
      id: `audit-${i}`,
      at: new Date(now - ageMin * 60_000),
      actor,
      lineId: line.id,
      area: tpl.area,
      action: tpl.action,
      target: tpl.target(),
      detail: tpl.detail,
    });
  }
  return out.sort((a, b) => b.at.getTime() - a.at.getTime());
}
