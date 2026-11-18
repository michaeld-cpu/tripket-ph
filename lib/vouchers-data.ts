// ─────────── Vouchers (v1) ───────────
// Promo vouchers. v1 covers the common creation scenario only:
// a public code, a fixed ₱ or % discount, a validity window and a use/budget
// cap. Everything else in the Voucher spec (audience, eligible trips, partner
// codes, entitlements, approval, funding exceptions) lands in a later version
// — the `eligibility` field is stored now so v2 can fill it without a data
// migration.
//
// Stored globally (not per shipping line): vouchers are Tripket-funded and
// apply across every participating line.

import { loadStore, saveStore } from "@/lib/persisted-store";

/** Persisted lifecycle state. The *displayed* status is derived from this
 *  plus the dates — see `voucherStatus`. */
export type VoucherState = "draft" | "published" | "disabled" | "ended";
export type VoucherStatus = "Draft" | "Scheduled" | "Active" | "Disabled" | "Ended";
export type VoucherPlatform = "app" | "web";
export type DiscountType = "fixed" | "percent";

export type VoucherHistoryAction =
  | "created" | "updated" | "published" | "disabled" | "enabled" | "ended" | "duplicated";

export type VoucherHistoryEntry = {
  at: string; // ISO timestamp
  actor: string;
  action: VoucherHistoryAction;
  detail?: string;
};

export type Voucher = {
  id: string;
  name: string;
  /** Customer-facing code, uppercase A–Z / 0–9 / dash. Unique. */
  code: string;
  description: string;
  discountType: DiscountType;
  /** ₱ amount for fixed, percentage (1–100) for percent. */
  amount: number;
  /** Required ₱ ceiling for percent discounts; null for fixed. */
  maxDiscount: number | null;
  /** YYYY-MM-DD local. */
  startDate: string;
  /** HH:MM local, 24h. */
  startTime: string;
  /** YYYY-MM-DD local. null = no end date (runs until disabled or exhausted). */
  endDate: string | null;
  /** HH:MM local, 24h. Only meaningful with an end date. */
  endTime: string;
  /** Operators (shipping lines) whose trips accept the code. "all" = every line. */
  operators: "all" | string[];
  /** Where the code can be applied. */
  platforms: VoucherPlatform[];
  /** true = guests and signed-in customers; false = signed-in customers only. */
  openToAll: boolean;
  /** Minimum booking amount (₱) before the discount applies. null = none. */
  minSpend: number | null;
  /** Total successful uses across all customers. null = no count cap. */
  usageLimit: number | null;
  /** Total ₱ discount budget. null = no budget cap. At least one cap is set. */
  budgetLimit: number | null;
  /** Max successful claims per customer. null = unlimited. */
  perCustomerLimit: number | null;
  /** Placeholder for the v2 rule engine. v1 is always everyone / all trips. */
  eligibility: { audience: "everyone"; trips: "all" };
  /** v1 policy: always Tripket-funded. */
  funding: "Tripket";
  state: VoucherState;
  /** Usage counters — written by checkout in the real system, mocked here. */
  stats: { redeemed: number; discountGranted: number };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  history: VoucherHistoryEntry[];
};

// ─────────── Status ───────────

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function at(iso: string, time: string, endOfMinute = false) {
  const d = parseISODate(iso);
  const [h, m] = (time || "00:00").split(":").map(Number);
  d.setHours(h || 0, m || 0, endOfMinute ? 59 : 0, endOfMinute ? 999 : 0);
  return d;
}
export function startsAt(v: Pick<Voucher, "startDate" | "startTime">): Date { return at(v.startDate, v.startTime); }
export function endsAt(v: Pick<Voucher, "endDate" | "endTime">): Date | null { return v.endDate ? at(v.endDate, v.endTime, true) : null; }

export function voucherStatus(v: Voucher, now = new Date()): VoucherStatus {
  if (v.state === "draft") return "Draft";
  if (v.state === "ended") return "Ended";
  const end = endsAt(v);
  if (end && now > end) return "Ended";
  if (isExhausted(v)) return "Ended";
  if (v.state === "disabled") return "Disabled";
  if (now < startsAt(v)) return "Scheduled";
  return "Active";
}

/** True once the use count or budget is fully consumed. */
export function isExhausted(v: Voucher): boolean {
  const used = v.stats.redeemed;
  if (v.usageLimit != null && used >= v.usageLimit) return true;
  if (v.budgetLimit != null && v.stats.discountGranted >= v.budgetLimit) return true;
  return false;
}

export const statusTone: Record<VoucherStatus, string> = {
  Draft:     "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Active:    "bg-emerald-100 text-emerald-800",
  Disabled:  "bg-amber-50 text-amber-700",
  Ended:     "bg-slate-100 text-slate-500",
};

export const statusDescription: Record<VoucherStatus, string> = {
  Draft:     "Not live · only visible to admins",
  Scheduled: "Published · goes live on the start date",
  Active:    "Live · customers can apply the code at checkout",
  Disabled:  "Turned off · customers can't apply the code until it's enabled",
  Ended:     "No longer redeemable · kept for reporting",
};

export const historyLabel: Record<VoucherHistoryAction, string> = {
  created: "Created",
  updated: "Updated",
  published: "Published",
  disabled: "Disabled",
  enabled: "Enabled",
  ended: "Ended",
  duplicated: "Duplicated",
};

// ─────────── Formatting ───────────

export function peso(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
}

export function discountLabel(v: Pick<Voucher, "discountType" | "amount" | "maxDiscount">): string {
  if (v.discountType === "fixed") return `${peso(v.amount)} off`;
  return v.maxDiscount != null ? `${v.amount}% off · up to ${peso(v.maxDiscount)}` : `${v.amount}% off`;
}

export function fmtDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "9:00 AM" from "09:00". */
export function fmtTime(hhmm: string): string {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / 86_400_000);
}

/**
 * Worst-case spend if every allowed use takes the full discount. Fixed
 * discounts multiply out; percentage discounts use the ₱ cap. A budget cap
 * bounds either. Returns null when exposure can't be bounded (shouldn't
 * happen once validation passes).
 */
export function maxExposure(
  v: Pick<Voucher, "discountType" | "amount" | "maxDiscount" | "usageLimit" | "budgetLimit">,
): number | null {
  const perUse = v.discountType === "fixed" ? v.amount : v.maxDiscount;
  const byCount = v.usageLimit != null && perUse != null ? v.usageLimit * perUse : null;
  if (byCount != null && v.budgetLimit != null) return Math.min(byCount, v.budgetLimit);
  return byCount ?? v.budgetLimit ?? null;
}

export const PLATFORM_LABEL: Record<VoucherPlatform, string> = { app: "Tripket app", web: "Tripket website" };

export function platformsLabel(p: VoucherPlatform[]): string {
  if (p.length === 2) return "App and website";
  return p.length ? PLATFORM_LABEL[p[0]] : "—";
}

export function operatorsLabel(ops: Voucher["operators"], names: Record<string, string>): string {
  if (ops === "all") return "All operators";
  if (ops.length === 1) return names[ops[0]] ?? ops[0];
  return `${ops.length} operators`;
}

export function audienceLabel(openToAll: boolean): string {
  return openToAll ? "Guests and signed-in" : "Signed-in only";
}

// ─────────── Code helpers ───────────

export const CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;

/** Suggest a code from the name + amount, e.g. "First Booking" + 50 → FIRST50. */
export function suggestCode(name: string, amount?: number): string {
  const word = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => w && !["THE", "A", "AN", "OF", "FOR", "AND"].includes(w))[0] ?? "";
  const suffix = amount && amount > 0 ? String(Math.round(amount)) : "";
  return (word.slice(0, 20 - suffix.length) + suffix).slice(0, 20);
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
}

// ─────────── Mock redemptions ───────────
// The real ledger comes from checkout. Here we derive a deterministic sample
// per voucher so the detail page has something believable to show.

export type Redemption = {
  id: string;
  bookingRef: string;
  customer: string;
  route: string;
  amount: number;
  at: Date;
};

const FIRST = ["Ada", "Marco", "Liza", "Ramon", "Carla", "Diego", "Mae", "Paolo", "Trisha", "Ben", "Nina", "Gio", "Rhea", "Jun", "Ella"];
const LAST = ["Reyes", "Santos", "Cruz", "Mendoza", "Villanueva", "Aquino", "Navarro", "Castillo", "Ramos", "Bautista", "Flores"];
const ROUTES = ["MNL → CEB", "BAT → CAL", "CEB → DGT", "MNL → ILO", "CEB → TAG", "BAT → ODG", "MNL → PPS"];

function seeded(seedStr: string) {
  let s = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { s ^= seedStr.charCodeAt(i); s = Math.imul(s, 16777619); }
  s = s >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

export function sampleRedemptions(v: Voucher, limit = 12): Redemption[] {
  const total = v.stats.redeemed;
  const n = Math.min(limit, total);
  if (n === 0) return [];
  const rnd = seeded(v.id);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const end = endsAt(v);
  const endAnchor = Math.min(Date.now(), end ? end.getTime() : Date.now());
  const out: Redemption[] = [];
  for (let i = 0; i < n; i++) {
    const spend = 600 + Math.floor(rnd() * 30) * 100;
    const amount =
      v.discountType === "fixed"
        ? v.amount
        : Math.min(Math.round((spend * v.amount) / 100), v.maxDiscount ?? Infinity);
    out.push({
      id: `${v.id}-r${i}`,
      bookingRef: `BK-${String(Math.floor(rnd() * 90000) + 10000)}`,
      customer: `${pick(FIRST)} ${pick(LAST)}`,
      route: pick(ROUTES),
      amount,
      at: new Date(endAnchor - (i * 3 + Math.floor(rnd() * 3)) * 3_600_000 - Math.floor(rnd() * 3_600_000)),
    });
  }
  return out;
}

// ─────────── Seed ───────────

function offset(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function stamp(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

type Defaulted = "perCustomerLimit" | "eligibility" | "funding" | "createdBy" | "updatedAt" | "history" | "description"
  | "startTime" | "endTime" | "operators" | "platforms" | "openToAll" | "minSpend";
type SeedInput = Omit<Voucher, Defaulted> & Partial<Pick<Voucher, Defaulted>> & {
  description?: string;
  history?: VoucherHistoryEntry[];
};

function seed(v: SeedInput): Voucher {
  const history: VoucherHistoryEntry[] = v.history ?? [
    { at: v.createdAt, actor: "Admin User", action: "created" },
    ...(v.state !== "draft" ? [{ at: v.createdAt, actor: "Admin User", action: "published" as const }] : []),
  ];
  return {
    description: "",
    perCustomerLimit: 1,
    startTime: "00:00",
    endTime: "23:59",
    operators: "all",
    platforms: ["app", "web"],
    openToAll: true,
    minSpend: null,
    eligibility: { audience: "everyone", trips: "all" },
    funding: "Tripket",
    createdBy: "Admin User",
    updatedAt: history[history.length - 1].at,
    ...v,
    history,
  };
}

export function seedVouchers(): Voucher[] {
  return [
    seed({
      id: "vch-new50", name: "First Booking", code: "NEW50",
      description: "Welcome offer promoted on the app landing page and Meta ads.",
      discountType: "fixed", amount: 50, maxDiscount: null,
      startDate: offset(-10), endDate: offset(20), usageLimit: 300, budgetLimit: null,
      state: "published", stats: { redeemed: 182, discountGranted: 9100 },
      createdAt: stamp(12),
    }),
    seed({
      id: "vch-offpeak", name: "Off-peak Sailings", code: "OFFPEAK",
      discountType: "percent", amount: 10, maxDiscount: 100,
      startDate: offset(-5), endDate: offset(25), usageLimit: null, budgetLimit: 20000,
      state: "published", stats: { redeemed: 96, discountGranted: 8640 },
      createdAt: stamp(6),
    }),
    seed({
      id: "vch-holiday15", name: "Holiday Sale", code: "HOLIDAY15",
      description: "December peak-season campaign.",
      discountType: "percent", amount: 15, maxDiscount: 150,
      startDate: offset(15), endDate: offset(45), usageLimit: 1000, budgetLimit: 75000, minSpend: 1000, perCustomerLimit: 2,
      state: "published", stats: { redeemed: 0, discountGranted: 0 },
      createdAt: stamp(2),
    }),
    seed({
      id: "vch-routeintro", name: "Route Launch", code: "ROUTEINTRO",
      discountType: "fixed", amount: 30, maxDiscount: null,
      startDate: offset(-8), endDate: offset(6), usageLimit: 200, budgetLimit: null,
      operators: ["montenegro"], minSpend: 500,
      state: "disabled", stats: { redeemed: 41, discountGranted: 1230 },
      createdAt: stamp(9),
      history: [
        { at: stamp(9), actor: "Admin User", action: "created" },
        { at: stamp(9), actor: "Admin User", action: "published" },
        { at: stamp(1, 15), actor: "Admin User", action: "disabled", detail: "Holding until operator confirms the new schedule" },
      ],
    }),
    seed({
      id: "vch-summer25", name: "Summer Getaway", code: "SUMMER25",
      discountType: "fixed", amount: 25, maxDiscount: null,
      startDate: offset(-120), endDate: offset(-60), usageLimit: 500, budgetLimit: null,
      state: "published", stats: { redeemed: 412, discountGranted: 10300 },
      createdAt: stamp(125),
    }),
    seed({
      id: "vch-appwelcome", name: "App Launch", code: "APPWELCOME",
      description: "Pending final launch date from marketing.",
      discountType: "fixed", amount: 50, maxDiscount: null,
      startDate: offset(30), startTime: "09:00", endDate: null, usageLimit: 1000, budgetLimit: null,
      platforms: ["app"], openToAll: false, perCustomerLimit: 1,
      state: "draft", stats: { redeemed: 0, discountGranted: 0 },
      createdAt: stamp(0, 9),
    }),
  ];
}

// ─────────── Persistence ───────────

const NS = "vouchers";
const SCOPE = "global";

/** Fill fields added after v1 shipped, so older saved vouchers still load. */
function normalize(raw: Voucher): Voucher {
  const v = raw as Voucher & { state: string };
  return {
    ...v,
    startTime: v.startTime ?? "00:00",
    endTime: v.endTime ?? "23:59",
    endDate: v.endDate ?? null,
    operators: v.operators ?? "all",
    platforms: v.platforms ?? ["app", "web"],
    openToAll: v.openToAll ?? true,
    minSpend: v.minSpend ?? null,
    perCustomerLimit: v.perCustomerLimit === undefined ? 1 : v.perCustomerLimit,
    state: ((v.state as string) === "paused" ? "disabled" : v.state) as VoucherState,
    history: v.history.map((h) => {
      const a = h.action as string;
      return { ...h, action: (a === "paused" ? "disabled" : a === "resumed" ? "enabled" : a) as VoucherHistoryAction };
    }),
  };
}

export function loadVouchers(): Voucher[] {
  const stored = loadStore<Voucher[]>(NS, SCOPE);
  if (stored && Array.isArray(stored)) return stored.map(normalize);
  const seeded = seedVouchers();
  saveStore(NS, SCOPE, seeded);
  return seeded;
}

export function saveVouchers(list: Voucher[]) {
  saveStore(NS, SCOPE, list);
}

export function withHistory(
  v: Voucher,
  actor: string,
  action: VoucherHistoryAction,
  patch: Partial<Voucher> = {},
  detail?: string,
): Voucher {
  const at = new Date().toISOString();
  return { ...v, ...patch, updatedAt: at, history: [...v.history, { at, actor, action, detail }] };
}

/** Fresh id + code for a duplicate; the copy always starts as a draft. */
export function duplicateVoucher(v: Voucher, actor: string, existingCodes: string[]): Voucher {
  const base = normalizeCode(v.code).slice(0, 17);
  let code = `${base}-2`;
  for (let i = 2; existingCodes.includes(code); i++) code = `${base}-${i}`;
  const at = new Date().toISOString();
  const today = toISODate(new Date());
  let endDate: string | null = null;
  if (v.endDate) {
    const span = Math.max(1, daysBetween(v.startDate, v.endDate));
    const end = parseISODate(today); end.setDate(end.getDate() + span);
    endDate = toISODate(end);
  }
  return {
    ...v,
    id: `vch-${Date.now().toString(36)}`,
    name: `${v.name} (copy)`,
    code,
    startDate: today,
    endDate,
    state: "draft",
    stats: { redeemed: 0, discountGranted: 0 },
    createdBy: actor,
    createdAt: at,
    updatedAt: at,
    history: [{ at, actor, action: "duplicated", detail: `From ${v.code}` }],
  };
}

// ─────────── Lifecycle actions ───────────

export type VoucherAction = "publish" | "disable" | "enable" | "end";

/** Apply a lifecycle action, recording who did it and why. */
export function applyVoucherAction(v: Voucher, action: VoucherAction, actor: string, reason?: string): Voucher {
  const detail = reason || undefined;
  switch (action) {
    case "publish": return withHistory(v, actor, "published", { state: "published" }, detail);
    case "disable": return withHistory(v, actor, "disabled", { state: "disabled" }, detail);
    case "enable":  return withHistory(v, actor, "enabled", { state: "published" }, detail);
    case "end":     return withHistory(v, actor, "ended", { state: "ended" }, detail);
  }
}

export const actionToast: Record<VoucherAction, string> = {
  publish: "published",
  disable: "disabled",
  enable: "enabled",
  end: "ended",
};
