"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import Select from "@/components/Select";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import DateRangePicker, { type DateRange } from "@/components/DateRangePicker";
import { useToast } from "@/components/ToastContext";

// ─────────── Booking shape ───────────
// Bookings are derived synthetically from the voyages an operator has created
// (stored in `tripket.voyages` localStorage). Each voyage seeds 1-3 mock
// bookings so the table has something to render before a real booking system
// is wired up.
type BookingStatus = "Confirmed" | "Pending" | "Cancelled";

type Booking = {
  ref: string;
  ticketholder: string;
  pax: number;
  vehicleClass?: string;
  routeOriginCode: string;
  routeDestinationCode: string;
  routeOriginCity: string;
  routeDestinationCity: string;
  vesselName: string;
  /** Departure shown as MM/DD HH:MM, e.g. "05/25 · 05:30". */
  departureDate: Date;
  amount: number;
  status: BookingStatus;
  bookingDate: Date;
};

// ─────────── Voyage shape (slice of what we need from localStorage) ───────────
// Mirrors the fields VoyagesPage writes. Defensive — fields may be missing on
// older payloads, so we tolerate optionals everywhere.
type StoredVoyage = {
  id: string;
  date: string;
  hour: number;
  minute: number;
  vesselName?: string;
  originCode?: string;
  destinationCode?: string;
  originCity?: string;
  destinationCity?: string;
  paxCapacity?: number;
  cheapestFare?: number;
  priciestFare?: number;
};

// ─────────── Deterministic pseudo-random helpers ───────────
// We want each voyage's bookings to look randomly-distributed but stay stable
// across re-renders so users don't see rows shuffle when filters change.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ["Maria", "Juan", "Ana", "Carlos", "Lorna", "Roberto", "Elena", "Mark", "Gloria", "Dennis", "Patricia", "Jose", "Andrea", "Rafael", "Camille", "Miguel", "Sofia", "Diego", "Bianca", "Noel"];
const LAST_NAMES = ["Santos", "dela Cruz", "Reyes", "Mendoza", "Garcia", "Flores", "Cruz", "Villanueva", "Tan", "Aquino", "Lim", "Bautista", "Castro", "Ramos", "Torres", "Diaz", "Navarro", "Pascual"];
const VEHICLE_LABELS = ["Motorcycle", "Car / SUV", "Pickup / AUV", "Light Truck"];

function deriveBookings(voyages: StoredVoyage[]): Booking[] {
  const bookings: Booking[] = [];
  let counter = 1;
  voyages.forEach((v) => {
    const seed = hashStr(v.id);
    const rand = rng(seed);
    // Skip voyages with missing core fields rather than emit garbage rows.
    if (!v.originCode || !v.destinationCode) return;
    const dep = new Date(v.date);
    if (isNaN(dep.getTime())) return;
    dep.setHours(v.hour, v.minute, 0, 0);
    const baseFare = v.cheapestFare || 1200;

    // 1-3 bookings per voyage.
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const pax = 1 + Math.floor(rand() * 4);
      const hasVehicle = rand() < 0.35;
      const vehicleClass = hasVehicle ? VEHICLE_LABELS[Math.floor(rand() * VEHICLE_LABELS.length)] : undefined;
      const statusRoll = rand();
      const status: BookingStatus = statusRoll < 0.65 ? "Confirmed" : statusRoll < 0.9 ? "Pending" : "Cancelled";
      const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      // Booking date sits 1-14 days before departure.
      const bookedDaysBefore = 1 + Math.floor(rand() * 14);
      const bookingDate = new Date(dep);
      bookingDate.setDate(bookingDate.getDate() - bookedDaysBefore);
      bookingDate.setHours(0, 0, 0, 0);

      bookings.push({
        ref: `TKT-${String(counter).padStart(4, "0")}`,
        ticketholder: `${first} ${last}`,
        pax,
        vehicleClass,
        routeOriginCode: v.originCode,
        routeDestinationCode: v.destinationCode,
        routeOriginCity: v.originCity ?? v.originCode,
        routeDestinationCity: v.destinationCity ?? v.destinationCode,
        vesselName: v.vesselName ?? "Unknown vessel",
        departureDate: dep,
        amount: pax * baseFare + (hasVehicle ? 500 + Math.floor(rand() * 2000) : 0),
        status,
        bookingDate,
      });
      counter++;
    }
  });
  // Newest bookings first.
  return bookings.sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());
}

const PAGE_SIZE = 10;

function fmtDepartureDate(d: Date): string {
  // "May 18, 2026" — single-row pairing with the time inline.
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDepartureTime(d: Date): string {
  // "01:00 PM" — zero-padded 12-hour clock so widths stay consistent.
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(d: Date): string {
  // "May 7, 2026" — matches the natural-language style of the departure cell.
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Unified status palette — uppercase labels, no dots, restrained tones.
// Confirmed = opaque emerald (settled / good); Pending = brand-orange
// (needs attention); Cancelled = struck slate.
const statusTone: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800",
  Pending:   "bg-brand-50 text-brand-700",
  Cancelled: "bg-slate-50 text-slate-400 line-through decoration-slate-300",
};

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300">
      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BookingsPage() {
  const { active } = useShippingLine();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [vesselFilter, setVesselFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [page, setPage] = useState(1);

  // ── Ref copy state (matches PendingAgingList on the dashboard) ──
  // Tracks the most-recently-copied ref so the button can flash a check mark
  // for 1.5s before reverting to the copy icon. Toast confirms the action.
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const { showToast } = useToast();
  const handleCopyRef = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedRef(ref);
      showToast(`Booking ref ${ref} copied`);
      setTimeout(() => setCopiedRef((prev) => (prev === ref ? null : prev)), 1500);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  // Booking-date range filter — drives the dashboard-style picker.
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  }));

  // Hydrate bookings from localStorage voyages on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("tripket.voyages");
      const voyages: StoredVoyage[] = raw ? JSON.parse(raw) : [];
      // Fake the loading shimmer briefly so the page matches the routes/vessels feel.
      const t = setTimeout(() => setBookings(deriveBookings(voyages)), 180);
      return () => clearTimeout(t);
    } catch {
      setBookings([]);
    }
  }, [active.id]);

  useEffect(() => { setPage(1); }, [query, routeFilter, vesselFilter, statusFilter, dateRange]);

  // Filter dropdown options derived from the data.
  const routeOptions = useMemo(() => {
    const seen = new Set<string>();
    (bookings ?? []).forEach((b) => seen.add(`${b.routeOriginCode}→${b.routeDestinationCode}`));
    return [{ value: "all", label: "All routes" }, ...Array.from(seen).sort().map((r) => ({ value: r, label: r.replace("→", " → ") }))];
  }, [bookings]);
  const vesselOptions = useMemo(() => {
    const seen = new Set<string>();
    (bookings ?? []).forEach((b) => seen.add(b.vesselName));
    return [{ value: "all", label: "All vessels" }, ...Array.from(seen).sort().map((v) => ({ value: v, label: v }))];
  }, [bookings]);

  const filtered = useMemo(() => {
    if (!bookings) return [];
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (routeFilter !== "all" && `${b.routeOriginCode}→${b.routeDestinationCode}` !== routeFilter) return false;
      if (vesselFilter !== "all" && b.vesselName !== vesselFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (b.bookingDate < dateRange.start || b.bookingDate > dateRange.end) return false;
      if (q) {
        const hay = `${b.ref} ${b.ticketholder} ${b.routeOriginCode} ${b.routeDestinationCode} ${b.vesselName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, query, routeFilter, vesselFilter, statusFilter, dateRange]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isEmpty = bookings !== null && bookings.length === 0;

  return (
    <div>
      <PageHeader title="Bookings" subtitle={active.name} showDateFilter={false} />

      {!bookings ? (
        <TableSkeleton rows={8} />
      ) : isEmpty ? (
        <section className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-white px-8 py-16 ring-1 ring-slate-200/70">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-slate-400">
            <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
            <path d="M10 6v12" strokeDasharray="2 2" />
          </svg>
          <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-slate-900">No bookings yet</h2>
          <p className="mt-1.5 max-w-sm text-center text-[12.5px] leading-relaxed text-slate-500">
            Bookings appear here once passengers reserve seats on your scheduled voyages. Create a voyage from the Voyages page to seed mock bookings.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Recent bookings</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span> of {bookings.length} bookings
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-brand-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or ref…"
                  className="w-52 bg-transparent placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <Select
                size="sm"
                value={routeFilter}
                onChange={setRouteFilter}
                ariaLabel="Filter by route"
                className="w-40"
                options={routeOptions}
              />
              <Select
                size="sm"
                value={vesselFilter}
                onChange={setVesselFilter}
                ariaLabel="Filter by vessel"
                className="w-40"
                options={vesselOptions}
              />
              <Select
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Filter by status"
                className="w-32"
                options={[
                  { value: "all", label: "All status" },
                  { value: "Confirmed", label: "Confirmed" },
                  { value: "Pending", label: "Pending" },
                  { value: "Cancelled", label: "Cancelled" },
                ]}
              />

              {/* Booking-date range — pinned to the end of the toolbar. */}
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>

          {/* Table — horizontally scrollable so columns can breathe past the
              viewport. `min-w-[1280px]` forces real spacing per column, no
              cramming. `scrollbar-gutter: stable` reserves the gutter so the
              table doesn't reflow when the bar appears/disappears. */}
          <div className="overflow-x-auto" style={{ scrollbarGutter: "stable" }}>
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="whitespace-nowrap px-6 py-3 text-center font-medium">#</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Ref</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Status</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Ticketholder <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Route</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Vessel</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Pax <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Vehicle</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Departure <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Amount <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Booking date <SortIcon /></button>
                  </th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50 px-6 py-3 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-sm text-slate-400">
                      No bookings match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((b, i) => {
                  const rowNo = (page - 1) * PAGE_SIZE + i + 1;
                  return (
                  <motion.tr
                    key={b.ref}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                    className="group transition-colors duration-150 hover:bg-slate-50/60"
                  >
                    <td className="relative whitespace-nowrap px-6 py-4 align-middle text-center font-mono text-[12px] tabular-nums text-slate-400">
                      <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                      {rowNo}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{b.ref}</span>
                        {copiedRef === b.ref ? (
                          <span aria-label="Copied" className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                              <path d="M5 12l5 5 9-11" />
                            </svg>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCopyRef(b.ref)}
                            aria-label={`Copy ${b.ref}`}
                            className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                              <rect x="9" y="9" width="11" height="11" rx="2" />
                              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[b.status]}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="text-[13.5px] font-semibold tracking-tight text-slate-900">{b.ticketholder}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-[13px] font-medium tracking-tight text-slate-900">
                        <span>{b.routeOriginCity}</span>
                        <span className="font-mono text-[10.5px] tabular-nums text-slate-400">({b.routeOriginCode})</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-slate-300">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                        <span>{b.routeDestinationCity}</span>
                        <span className="font-mono text-[10.5px] tabular-nums text-slate-400">({b.routeDestinationCode})</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className="truncate text-[13px] font-medium tracking-tight text-slate-900">{b.vesselName}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">{b.pax}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      {b.vehicleClass ? (
                        <span className="text-[12.5px] font-medium tracking-tight text-slate-700">{b.vehicleClass}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle whitespace-nowrap text-[13px] font-semibold tracking-tight text-slate-900">
                      {fmtDepartureDate(b.departureDate)}
                      <span className="ml-1.5 font-mono font-medium tabular-nums text-slate-600">{fmtDepartureTime(b.departureDate)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">₱{b.amount.toLocaleString()}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle text-[12.5px] font-medium tracking-tight text-slate-700">{fmtDate(b.bookingDate)}</td>
                    <td
                      className="sticky right-0 z-10 whitespace-nowrap bg-white px-6 py-4 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] transition-colors duration-150 group-hover:bg-slate-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenu
                        ariaLabel={`Actions for ${b.ref}`}
                        items={[
                          {
                            label: "View booking",
                            onClick: () => { console.log("view", b.ref); },
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            ),
                          },
                          {
                            label: "Cancel booking",
                            danger: true,
                            onClick: () => {
                              setBookings((prev) => prev ? prev.map((x) => x.ref === b.ref ? { ...x, status: "Cancelled" } : x) : prev);
                            },
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M6 6l12 12" />
                              </svg>
                            ),
                          },
                        ]}
                      />
                    </td>
                  </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            noun="bookings"
          />
        </section>
      )}
    </div>
  );
}
