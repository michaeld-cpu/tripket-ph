"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import Select from "@/components/Select";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import DateRangePicker, { type DateRange } from "@/components/DateRangePicker";
import { useToast } from "@/components/ToastContext";
import { LogoTile } from "@/components/ShippingLineSwitcher";
import type { Line } from "@/lib/shipping-lines";
import {
  deriveBookings,
  deriveActivity,
  makeActivity,
  statusLabel,
  statusTone,
  ticketStatusTone,
  type Booking,
  type BookingStatus,
  type FareClass,
  type Ticket,
} from "@/lib/bookings-data";
import { loadScopedVoyages } from "@/lib/line-scope";
import ActivityLog from "@/components/ActivityLog";
import Modal from "@/components/Modal";


const PAGE_SIZE = 10;

function fmtDepartureDate(d: Date): string {
  // "May 18, 2026" — single-row pairing with the time inline.
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDepartureTime(d: Date): string {
  // "01:00 PM" — zero-padded 12-hour clock so widths stay consistent.
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
// "ETD 45 minutes" / "ETD 3h 20m" / "Departed 12m ago" — humanizes the gap
// between now and the voyage's departure. Past-tense flips wording so the
// caption still reads cleanly after the boat has left.
function fmtEtd(d: Date): string {
  const diffMin = Math.round((d.getTime() - Date.now()) / 60_000);
  const past = diffMin < 0;
  const mins = Math.abs(diffMin);
  let body: string;
  if (mins < 60) body = `${mins} minute${mins === 1 ? "" : "s"}`;
  else if (mins < 60 * 24) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    body = m === 0 ? `${h}h` : `${h}h ${m}m`;
  } else {
    const days = Math.floor(mins / (60 * 24));
    body = `${days} day${days === 1 ? "" : "s"}`;
  }
  return past ? `Departed ${body} ago` : `ETD ${body}`;
}

function fmtDate(d: Date): string {
  // "May 7, 2026" — matches the natural-language style of the departure cell.
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}


function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300">
      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BookingsPage() {
  const { active, locked } = useShippingLine();
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
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null);
  // Booking being approved via the batch ticket-number dialog.
  const [approveTarget, setApproveTarget] = useState<Booking | null>(null);
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
  const handleCopyTicket = async (ticketId: string) => {
    try {
      await navigator.clipboard.writeText(ticketId)
      setCopiedTicket(ticketId);
      showToast(`Ticket number ${ticketId} copied`);
      setTimeout(() => setCopiedTicket((prev) => (prev === ticketId ? null : prev)), 1500);
    } catch {
      showToast("Failed to copy", "error");
    }
  };
  
  const openBooking = useMemo(
    () => (bookings ?? []).find((b) => b.ref === openRef) ?? null,
    [bookings, openRef]
  );

  // Esc to close dialog.
  useEffect(() => {
    if (!openRef) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpenRef(null); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openRef]);

  // Live admin actions are attributed to the signed-in operator.
  const ACTOR = "Ada Reyes";
  const logTo = (b: Booking, entry: ReturnType<typeof makeActivity>): Booking => ({
    ...b,
    activity: [entry, ...(b.activity ?? deriveActivity(b))],
  });

  const handleCancel = (ref: string) => {
    setBookings((prev) => prev ? prev.map((x) => x.ref === ref
      ? logTo({ ...x, status: "Cancelled", paymentStatus: "Refunded" }, makeActivity("cancelled", "Booking cancelled", ACTOR))
      : x) : prev);
    showToast(`Booking ${ref} cancelled`);
  };
  // Approve opens the batch dialog so the admin can assign each pending
  // ticket its own ticket number before confirming.
  const handleApprove = (ref: string) => {
    const b = bookings?.find((x) => x.ref === ref) ?? null;
    if (b) setApproveTarget(b);
  };
  // Commit a batch decision: each pending ticket is set to Paid (with a ticket
  // number), Cancelled, or Refunded. The booking is Confirmed if any ticket is
  // Paid; otherwise Cancelled (none settled).
  const commitApproval = (
    ref: string,
    decisions: Record<string, { status: "Paid" | "Cancelled" | "Refunded"; number?: string }>
  ) => {
    setBookings((prev) =>
      prev
        ? prev.map((x) => {
            if (x.ref !== ref) return x;
            const entries: ReturnType<typeof makeActivity>[] = [];
            const tickets = x.tickets.map((t) => {
              const d = decisions[t.id];
              if (t.status !== "Pending" || !d) return t;
              if (d.status === "Paid") {
                entries.push(makeActivity("ticket_paid", "Ticket marked paid", ACTOR, `Ticket no. ${d.number} · ${t.name}`));
                return { ...t, status: "Paid" as const, ticketNumber: d.number };
              }
              entries.push(makeActivity(d.status === "Refunded" ? "refunded" : "cancelled", `Ticket ${d.status.toLowerCase()}`, ACTOR, t.name));
              return { ...t, status: d.status };
            });
            const hasPaid = tickets.some((t) => t.status === "Paid");
            // Booking-level entry summarising the decision, on top of the
            // per-ticket entries (newest-first order).
            entries.push(makeActivity(hasPaid ? "approved" : "cancelled", hasPaid ? "Booking approved" : "Booking cancelled", ACTOR));
            return {
              ...x,
              tickets,
              status: hasPaid ? "Confirmed" : "Cancelled",
              paymentStatus: hasPaid ? "Paid" : x.paymentStatus,
              activity: [...entries.reverse(), ...(x.activity ?? deriveActivity(x))],
            };
          })
        : prev
    );
    showToast(`Booking ${ref} updated`);
  };
  const handleRefund = (ref: string) => {
    setBookings((prev) => prev ? prev.map((x) => x.ref === ref
      ? logTo({ ...x, paymentStatus: "Refunded" }, makeActivity("refunded", "Payment refunded", ACTOR, `₱${x.amount.toLocaleString()} returned`))
      : x) : prev);
    showToast(`Booking ${ref} refunded`);
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
      // Operators only ever derive bookings from their own line's voyages.
      const voyages = loadScopedVoyages(active.id, locked);
      // Fake the loading shimmer briefly so the page matches the routes/vessels feel.
      // Seed each booking's activity from its derived history so the rail has a
      // starting trail; live admin actions append to it from here on.
      const t = setTimeout(
        () => setBookings(deriveBookings(voyages).map((b) => ({ ...b, activity: deriveActivity(b) }))),
        180
      );
      return () => clearTimeout(t);
    } catch {
      setBookings([]);
    }
  }, [active.id, locked]);

  useEffect(() => { setPage(1); }, [query, routeFilter, vesselFilter, statusFilter, dateRange]);

  // ?ref=TKT-#### deep link — opens the matching booking dialog once data
  // hydrates. Used by the Tickets page's "View booking" action to jump
  // straight from a ticket row into its parent booking detail.
  useEffect(() => {
    if (!bookings) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && bookings.some((b) => b.ref === ref)) setOpenRef(ref);
  }, [bookings]);

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
                  { value: "Confirmed", label: "Approved" },
                  { value: "Pending", label: "Pending" },
                  { value: "Cancelled", label: "Cancelled" },
                  { value: "Refunded", label: "Refunded" },
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
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Booking ref</th>
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
                    onClick={() => setOpenRef(b.ref)}
                    className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50/60"
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
                            onClick={(e) => { e.stopPropagation(); handleCopyRef(b.ref); }}
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
                        {statusLabel[b.status]}
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
                      // `:has([role=menu])` lifts the cell above its siblings
                      // while the kebab popover is open, so the floating menu
                      // is never clipped by later sticky cells in the table.
                      className="sticky right-0 z-10 whitespace-nowrap bg-white px-6 py-4 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] transition-colors duration-150 group-hover:bg-slate-50 has-[[role=menu]]:z-30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenu
                        ariaLabel={`Actions for ${b.ref}`}
                        items={[
                          // View tickets — routes to the Tickets page with this
                          // booking's ref pre-loaded as the search query so the
                          // table filters to just that booking's passenger tickets.
                          {
                            label: "View tickets",
                            onClick: () => { window.location.href = `/tickets?booking=${b.ref}`; },
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
                                <path d="M14 6v12" strokeDasharray="2 2" />
                              </svg>
                            ),
                          },
                          // Approve — only meaningful on Pending bookings.
                          {
                            label: "Approve",
                            disabled: b.status !== "Pending",
                            onClick: () => handleApprove(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M5 12l5 5 9-11" />
                              </svg>
                            ),
                          },
                          // Refund — disabled once the booking is in a terminal state.
                          {
                            label: "Refund",
                            disabled: b.status === "Cancelled" || b.status === "Refunded",
                            onClick: () => handleRefund(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M3 12a9 9 0 1 0 3-6.7" />
                                <path d="M3 4v5h5" />
                              </svg>
                            ),
                          },
                          // Cancel — terminal states have nothing left to cancel.
                          {
                            label: "Cancel booking",
                            danger: true,
                            disabled: b.status === "Cancelled" || b.status === "Refunded",
                            onClick: () => handleCancel(b.ref),
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

      <BookingDetailDialog
        booking={openBooking}
        line={active}
        onClose={() => setOpenRef(null)}
        onCancel={(ref) => { handleCancel(ref); }}
        onApprove={(ref) => { handleApprove(ref); }}
        onRefund={(ref) => { handleRefund(ref); }}
        copiedTicket={copiedTicket}
        onCopyTicket={handleCopyTicket}
        copiedRef={copiedRef}
        onCopyRef={handleCopyRef}
      />

      <ApproveBookingDialog
        booking={approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={(decisions) => {
          if (!approveTarget) return;
          commitApproval(approveTarget.ref, decisions);
          setApproveTarget(null);
          setOpenRef(null);
        }}
      />
    </div>
  );
}

// ─────────── ApproveBookingDialog ───────────
// Review a pending booking ticket-by-ticket. Each pending ticket can be
// approved (with its own distinct ticket number → Paid) or declined
// (→ Cancelled), so passengers in the same booking can be settled
// independently. The booking confirms if any ticket is approved, else cancels.
function ApproveBookingDialog({
  booking,
  onClose,
  onConfirm,
}: {
  booking: Booking | null;
  onClose: () => void;
  onConfirm: (decisions: Record<string, { status: TicketDecision; number?: string }>) => void;
}) {
  const pending = useMemo(
    () => (booking ? booking.tickets.filter((t) => t.status === "Pending") : []),
    [booking]
  );
  // Per-ticket target status. Defaults to Paid; admin can flip any to
  // Cancelled or Refunded.
  const [decisions, setDecisions] = useState<Record<string, TicketDecision>>({});
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!booking) return;
    setNumbers({});
    setDecisions(Object.fromEntries(pending.map((t) => [t.id, "Paid" as TicketDecision])));
  }, [booking]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusOf = (id: string): TicketDecision => decisions[id] ?? "Paid";
  const paidCount = pending.filter((t) => statusOf(t.id) === "Paid").length;
  // Only Paid tickets need a number entered.
  const ready = pending.length > 0 && pending.every((t) =>
    statusOf(t.id) !== "Paid" || (numbers[t.id] ?? "").trim().length > 0
  );
  const alreadyPaid = booking ? booking.tickets.length - pending.length : 0;

  const commit = () => {
    if (!ready) return;
    const payload: Record<string, { status: TicketDecision; number?: string }> = {};
    pending.forEach((t) => {
      const s = statusOf(t.id);
      payload[t.id] = s === "Paid" ? { status: "Paid", number: numbers[t.id].trim() } : { status: s };
    });
    onConfirm(payload);
  };

  const ctaLabel = paidCount > 0
    ? `Confirm · ${paidCount} paid${pending.length - paidCount > 0 ? ` · ${pending.length - paidCount} other` : ""}`
    : "Confirm";
  const noPaid = pending.length > 0 && paidCount === 0;

  return (
    <Modal open={!!booking} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex max-h-[80vh] flex-col">
        <div className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                <path d="M5 12l5 5 9-11" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">Review booking</h2>
              <p className="text-[12px] text-slate-500">
                <span className="font-mono font-medium tabular-nums text-slate-700">{booking?.ref}</span>
                {" · "}Set each passenger&apos;s ticket status.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {pending.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-500">All tickets in this booking are already settled.</p>
          ) : (
            <ul className="space-y-2.5">
              {pending.map((t, i) => {
                const s = statusOf(t.id);
                const settled = s !== "Paid"; // cancelled/refunded → dim, no number
                return (
                  <li key={t.id} className={"rounded-xl border px-3.5 py-2.5 transition-colors " + (settled ? "border-slate-200 bg-slate-50/60" : "border-slate-200 bg-white")}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 font-mono text-[11px] font-semibold tabular-nums text-slate-500">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={"truncate text-[13px] font-semibold tracking-tight " + (settled ? "text-slate-400 line-through" : "text-slate-900")}>{t.name}</div>
                        <div className="text-[11px] text-slate-400">{t.fareClass}</div>
                      </div>
                      {/* Per-ticket status toggle: Paid · Cancelled · Refunded */}
                      <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5">
                        {(["Paid", "Cancelled", "Refunded"] as TicketDecision[]).map((opt) => {
                          const on = s === opt;
                          const onTone = opt === "Paid" ? "text-emerald-700" : opt === "Refunded" ? "text-sky-700" : "text-rose-600";
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setDecisions((p) => ({ ...p, [t.id]: opt }))}
                              className={"rounded-md px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none " + (on ? `bg-white ${onTone} shadow-[0_1px_2px_rgba(15,23,42,0.08)]` : "text-slate-500 hover:text-slate-700")}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {s === "Paid" && (
                      <input
                        type="text"
                        value={numbers[t.id] ?? ""}
                        onChange={(e) => setNumbers((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        placeholder="Ticket number"
                        aria-label={`Ticket number for ${t.name}`}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[12.5px] tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {alreadyPaid > 0 && (
            <p className="mt-3 text-[11.5px] text-slate-400">
              {alreadyPaid} ticket{alreadyPaid === 1 ? "" : "s"} already settled — unaffected.
            </p>
          )}
          {noPaid && pending.length > 0 && (
            <p className="mt-3 text-[11.5px] text-rose-500">No tickets marked paid — the booking will be cancelled.</p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={!ready}
            className={
              "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 focus:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-60 " +
              (noPaid ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-400" : "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-400")
            }
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Per-ticket target status the admin can set in the review dialog.
type TicketDecision = "Paid" | "Cancelled" | "Refunded";

// ─────────── Booking detail dialog ───────────
// Four sections matching the project's visual language:
//  1. Header — booking ref + ticketholder + status + close
//  2. Route summary card — origin → destination, departure, vessel
//  3. Contact + payment grid — two columns of metadata
//  4. Per-pax ticket list — one card per ticket with copyable TKT-####-X id
function BookingDetailDialog({
  booking,
  line,
  onClose,
  onCancel,
  onApprove,
  onRefund,
  copiedTicket,
  onCopyTicket,
  copiedRef,
  onCopyRef,
}: {
  booking: Booking | null;
  line: Line;
  onClose: () => void;
  onCancel: (ref: string) => void;
  onApprove: (ref: string) => void;
  onRefund: (ref: string) => void;
  copiedTicket: string | null;
  onCopyTicket: (id: string) => void;
  copiedRef: string | null;
  onCopyRef: (ref: string) => void;
}) {
  return (
    <AnimatePresence>
      {booking && (
        <motion.div
          key="booking-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70"
          >
          {/* Left column — booking content (header · scroll body · footer). */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{booking.ref}</span>
                  {copiedRef === booking.ref ? (
                    <span className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <path d="M5 12l5 5 9-11" />
                      </svg>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCopyRef(booking.ref)}
                      aria-label={`Copy ${booking.ref}`}
                      className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <rect x="9" y="9" width="11" height="11" rx="2" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                      </svg>
                    </button>
                  )}
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[booking.status]}`}>
                    {statusLabel[booking.status]}
                  </span>
                </div>
                <h2 className="mt-1.5 truncate text-[17px] font-semibold tracking-tight text-slate-900">{booking.ticketholder}</h2>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Booked {fmtDate(booking.bookingDate)} · {booking.pax} {booking.pax === 1 ? "passenger" : "passengers"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {/* Body — scrollable region holding the route card, meta grid, and tickets */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Route summary card — matches the voyage dialog's anatomy:
                  port-code headlines flanking a dashed arrow + shipping line
                  avatar in the middle, with a quiet meta row underneath. */}
              <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center justify-center gap-4">
                    {/* Origin */}
                    <div className="min-w-0 flex-1 text-center">
                      <div className="truncate font-mono text-[22px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">
                        {booking.routeOriginCode}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{booking.routeOriginCity}</div>
                    </div>

                    <DialogDashedArrow />

                    {/* Avatar + line name */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="shrink-0">
                        <LogoTile line={line} size={32} />
                      </span>
                      <span className="max-w-[120px] truncate text-[10px] font-medium text-slate-500">{line.name}</span>
                    </div>

                    <DialogDashedArrow />

                    {/* Destination */}
                    <div className="min-w-0 flex-1 text-center">
                      <div className="truncate font-mono text-[22px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">
                        {booking.routeDestinationCode}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{booking.routeDestinationCity}</div>
                    </div>
                  </div>
                  {/* ETD countdown — humanized gap between now and departure. */}
                  <p className="mt-3 text-center text-[11px] font-medium tracking-tight text-slate-500">
                    ( {fmtEtd(booking.departureDate)} )
                  </p>
                </div>

                {/* Meta row — vessel + departure + vehicle, divided like
                    aircraft boarding-pass spec lines. */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Departure</div>
                    <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">
                      {fmtDepartureDate(booking.departureDate)}
                    </div>
                    <div className="mt-0.5 font-mono text-[11.5px] font-medium tabular-nums text-slate-600">
                      {fmtDepartureTime(booking.departureDate)}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Vessel</div>
                    <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{booking.vesselName}</div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Vehicle</div>
                    <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">
                      {booking.vehicleClass ?? <span className="font-normal text-slate-300">—</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact + payment grid */}
              {/* Booking-level contact captured at checkout. */}
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200/70">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Contact</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Mobile</dt>
                    <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-900">{booking.contactMobile}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Email</dt>
                    <dd className="mt-0.5 truncate font-medium text-slate-900">{booking.contactEmail}</dd>
                  </div>
                </dl>
              </div>

              {/* Passenger roster — tabular layout (# · Passenger · Class ·
                  Rate) inspired by the ferry ticket spec. Each row expands to
                  reveal the per-pax Ticket ID (the load-bearing identifier),
                  valid-ID type/number, and demographic meta. */}
              <PassengerTable
                tickets={booking.tickets}
                copiedTicket={copiedTicket}
                onCopyTicket={onCopyTicket}
              />

              {/* Vehicle Information — only present when the booking includes
                  a vehicle slot. Shows class, plate, driver, and the comped
                  companions tied to the vehicle fee. */}
              {booking.vehicle && <VehicleInformation booking={booking} />}

              {/* Dedicated Payment Information section — itemized breakdown
                  of tickets, vehicle charge, and booking fee, totalled at
                  the bottom. Method + status sit at the top as meta. */}
              <PaymentInformation booking={booking} />
            </div>

            {/* Footer — actions scoped to the booking's current status:
                  Pending   → Approve (primary) + ⋯ menu (Cancel / Refund)
                  Approved → Cancel (ghost rose)
                  Cancelled → no destructive actions */}
            <DialogFooter
              booking={booking}
              onClose={onClose}
              onCancel={onCancel}
              onApprove={onApprove}
              onRefund={onRefund}
            />
          </div>

          {/* Right rail — activity / audit log, bottom-anchored. */}
          <div className="hidden w-[300px] shrink-0 border-l border-slate-100 sm:flex">
            <ActivityLog entries={booking.activity ?? deriveActivity(booking)} />
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────── DialogFooter ───────────
// Status-aware footer for the booking detail dialog.
//   - Pending bookings need explicit approval → Approve (primary) + ⋯ menu
//     with Cancel + Refund so the destructive actions don't crowd the row.
//   - Approved bookings only expose Cancel (ghost rose), since approval
//     already happened.
//   - Cancelled bookings show no destructive actions (terminal state).
// Edit is always present.
function DialogFooter({
  booking,
  onClose,
  onCancel,
  onApprove,
  onRefund,
}: {
  booking: Booking;
  onClose: () => void;
  onCancel: (ref: string) => void;
  onApprove: (ref: string) => void;
  onRefund: (ref: string) => void;
}) {
  // Single status picker collapses Approve/Cancel/Refund into a ClickUp-style
  // dropdown (matching the tickets dialog). Each selection fires the matching
  // mutation and closes the dialog so the user gets feedback in the table.
  const onChangeStatus = (next: BookingStatus) => {
    if (next === "Confirmed") onApprove(booking.ref);
    else if (next === "Cancelled") onCancel(booking.ref);
    else if (next === "Refunded") onRefund(booking.ref);
    // Pending is the initial state; transitioning back isn't a normal flow.
    onClose();
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100"
      >
        Close
      </button>

      <div className="flex items-center gap-2">
        <BookingStatusPicker current={booking.status} onChange={onChangeStatus} />
      </div>
    </div>
  );
}

// ─────────── BookingStatusPicker ───────────
// Mirror of the tickets-page StatusPicker, scoped to booking lifecycle.
// Brand-orange primary button reads "STATUS · APPROVED ▾" and opens a
// popover with every valid transition. Terminal Cancelled/Refunded states
// disable every option so the picker can still be opened to inspect state.
function BookingStatusPicker({
  current,
  onChange,
}: {
  current: BookingStatus;
  onChange: (next: BookingStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isTerminal = current === "Cancelled" || current === "Refunded";
  const canPick = (s: BookingStatus): boolean => {
    if (s === current) return false;
    if (isTerminal) return false;
    // Pending → cannot move back to Pending from Confirmed.
    if (s === "Pending") return false;
    return true;
  };

  const options: { value: BookingStatus; label: string }[] = [
    { value: "Confirmed", label: "Approve" },
    { value: "Refunded",  label: "Refund" },
    { value: "Cancelled", label: "Cancel booking" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-brand-600"
      >
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/80">Status</span>
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-white">{statusLabel[current]}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 text-white/80 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.7 }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute bottom-full right-0 z-30 mb-2 w-60 overflow-hidden rounded-xl bg-white p-1 shadow-[0_18px_44px_-16px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70"
          >
            <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Update status
            </div>
            {options.map((o) => {
              const disabled = !canPick(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => { if (!disabled) { onChange(o.value); setOpen(false); } }}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors duration-100 ${
                    disabled
                      ? "cursor-not-allowed text-slate-300"
                      : o.value === "Cancelled"
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate font-medium">{o.label}</span>
                  <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${statusTone[o.value]} ${disabled ? "opacity-50" : ""}`}>
                    {statusLabel[o.value]}
                  </span>
                  <span className="flex justify-end" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────── PassengerTable ───────────
// Tabular passenger roster for the booking dialog. Rows are clickable to
// expand a detail strip revealing the per-pax Ticket ID + valid-ID details.
function PassengerTable({
  tickets,
  copiedTicket,
  onCopyTicket,
}: {
  tickets: Ticket[];
  copiedTicket: string | null;
  onCopyTicket: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Preview state shared across all rows — clicking an ID photo pill opens
  // the lightbox without per-row local state.
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      <div className="grid grid-cols-[28px_minmax(0,5fr)_44px_38px_64px_80px_20px] items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
        <span className="text-center">#</span>
        <span>Passenger</span>
        <span>Sex</span>
        <span>Age</span>
        <span>Class</span>
        <span>Status</span>
        <span />
      </div>
      <ul className="divide-y divide-slate-100">
        {tickets.map((t, idx) => {
          const expanded = openId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpenId((prev) => (prev === t.id ? null : t.id))}
                aria-label={expanded ? "Collapse passenger details" : "Expand passenger details"}
                aria-expanded={expanded}
                className="grid w-full grid-cols-[28px_minmax(0,5fr)_44px_38px_64px_80px_20px] items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-50/80"
              >
                <span className="text-center font-mono text-[11.5px] tabular-nums text-slate-400">{idx + 1}</span>
                <div className="min-w-0">
                  <span className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{t.name}</span>
                </div>
                <span className="text-[12px] font-medium tracking-tight text-slate-700">{t.sex}</span>
                <span className="font-mono text-[12px] tabular-nums text-slate-700">{t.age}</span>
                <span className="text-[12px] font-medium tracking-tight text-slate-700">{t.fareClass}</span>
                <span className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${ticketStatusTone[t.status]}`}>
                  {t.status}
                </span>
                <span className={`grid h-6 w-6 place-items-center justify-self-end text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="row-expand"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden bg-slate-50/60"
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-dashed border-slate-200 px-4 py-3 text-[12px]">
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Ticket number</div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {t.ticketNumber ? (
                            <>
                              <span className="font-mono text-[13px] font-bold tabular-nums tracking-[0.04em] text-slate-900">{t.ticketNumber}</span>
                              {copiedTicket === t.ticketNumber ? (
                                <span className="grid h-4 w-4 place-items-center rounded text-emerald-600">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                    <path d="M5 12l5 5 9-11" />
                                  </svg>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onCopyTicket(t.ticketNumber!)}
                                  aria-label={`Copy ${t.ticketNumber}`}
                                  className="grid h-4 w-4 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-200 hover:text-slate-700 active:scale-90"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                    <rect x="9" y="9" width="11" height="11" rx="2" />
                                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                                  </svg>
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="font-mono text-[13px] font-bold tabular-nums tracking-[0.04em] text-slate-300" title="Assigned when the ticket is marked paid">—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">ID</div>
                        <div className="mt-0.5 text-[12.5px] font-semibold tracking-tight text-slate-900">{t.documentType}</div>
                        <div className="mt-0.5 font-mono text-[11.5px] font-medium tabular-nums text-slate-500">{t.documentRef}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Nationality</div>
                        <div className="mt-0.5 text-[12px] text-slate-700">{t.nationality}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                          Phone <span className="text-slate-400 normal-case tracking-normal">(Optional)</span>
                        </div>
                        <div className="mt-0.5 font-mono text-[12px] font-medium tabular-nums text-slate-700">{t.phone ?? "—"}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                          Email <span className="text-slate-400 normal-case tracking-normal">(Optional)</span>
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-slate-700">{t.email ?? "—"}</div>
                      </div>

                      {/* ID photo requirements — front + back. Both are
                          captured at booking; each pill opens a preview. */}
                      <div className="col-span-2">
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Valid ID Photos</div>
                        <ul className="mt-1.5 space-y-1.5 text-[12px]">
                          <RequirementRow
                            label={`${t.documentType} — Front`}
                            required
                            uploaded={!!t.idFrontUrl}
                            previewUrl={t.idFrontUrl}
                            onPreview={() => setPreview({ title: `${t.documentType} · Front`, url: t.idFrontUrl })}
                          />
                          <RequirementRow
                            label={`${t.documentType} — Back`}
                            required
                            uploaded={!!t.idBackUrl}
                            previewUrl={t.idBackUrl}
                            onPreview={() => setPreview({ title: `${t.documentType} · Back`, url: t.idBackUrl })}
                          />
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      <DocumentPreviewDialog doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

// ─────────── VehicleInformation ───────────
// Vehicle details + the companion roster bundled under the vehicle fee.
// Mirrors the visual vocabulary of the Payment Information section: header
// strip, divided meta row, then a small list of comped companions.
function VehicleInformation({ booking }: { booking: Booking }) {
  const v = booking.vehicle;
  // Preview dialog state — which document the operator clicked to enlarge.
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  if (!v) return null;
  const compedCount = booking.tickets.filter((t) => t.comped).length;
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Vehicle Information</h3>
        {v.includedSeats > 0 && (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
            Includes {v.includedSeats} free seat{v.includedSeats === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Identity strip — Type · Plate · Included seats. */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Type</div>
          <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{v.class}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Plate No.</div>
          <div className="mt-1 truncate font-mono text-[12.5px] font-bold tabular-nums tracking-[0.04em] text-slate-900">{v.plateNumber}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Free seats</div>
          <div className="mt-1 font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
            {compedCount} <span className="text-slate-400">/ {v.includedSeats}</span>
          </div>
        </div>
      </div>

      {/* Vehicle spec strip — Make/Model · Year · Operator label. */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Make / Model</div>
          <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{v.make} {v.model}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Year</div>
          <div className="mt-1 font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">{v.year}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Label</div>
          <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{v.label}</div>
        </div>
      </div>

      {/* Requirements — ORCR is required, photo is optional. Each row's
          status pill is clickable when an upload is on file; clicking opens
          the preview dialog. */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Requirements</div>
        <ul className="mt-2 space-y-1.5 text-[12.5px]">
          <RequirementRow
            label="Official Receipt (OR)"
            required
            uploaded={!!v.orUrl}
            previewUrl={v.orUrl}
            onPreview={() => v.orUrl && setPreview({ title: "Official Receipt (OR)", url: v.orUrl })}
          />
          <RequirementRow
            label="Certificate of Registration (CR)"
            required
            uploaded={!!v.crUrl}
            previewUrl={v.crUrl}
            onPreview={() => v.crUrl && setPreview({ title: "Certificate of Registration (CR)", url: v.crUrl })}
          />
          <RequirementRow
            label="Vehicle Photo"
            required={false}
            uploaded={!!v.photoUrl}
            previewUrl={v.photoUrl}
            onPreview={() => v.photoUrl && setPreview({ title: "Vehicle Photo", url: v.photoUrl })}
          />
        </ul>
      </div>


      <DocumentPreviewDialog
        doc={preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

// Single requirement line — label on the left, status pill on the right.
// Pill is a button when the doc is uploaded (clickable preview); otherwise
// a quiet "Missing" pill that doesn't expose any interaction.
function RequirementRow({
  label, required, uploaded, previewUrl, onPreview,
}: {
  label: string;
  required: boolean;
  uploaded: boolean;
  /** When provided, a thumbnail of this image renders inline so the
   *  attached document is unmistakably visible (not just a label). */
  previewUrl?: string;
  onPreview: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {uploaded && previewUrl ? (
          // Thumbnail doubles as the click target — the affordance is the
          // image itself, not just a pill.
          <button
            type="button"
            onClick={onPreview}
            aria-label={`Preview ${label}`}
            className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-md ring-1 ring-slate-200 transition-transform duration-150 active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-slate-900/0 text-white opacity-0 transition-[background-color,opacity] duration-150 group-hover:bg-slate-900/35 group-hover:opacity-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
          </button>
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-50 text-slate-300 ring-1 ring-dashed ring-slate-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 17 5-5 4 4 3-3 4 4" />
            </svg>
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate font-medium tracking-tight text-slate-900">{label}</div>
          {required && (
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">Required</div>
          )}
        </div>
      </div>
      {uploaded ? (
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 transition-colors duration-150 hover:bg-emerald-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M5 12l5 5 9-11" />
          </svg>
          Uploaded
        </button>
      ) : (
        <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
          required ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
        }`}>
          {required ? "Missing" : "Not provided"}
        </span>
      )}
    </li>
  );
}

// Lightbox-style document preview. Backdrop click + Esc close.
function DocumentPreviewDialog({
  doc, onClose,
}: {
  doc: { title: string; url: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!doc) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [doc, onClose]);
  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          key="doc-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[60vh] max-w-[60vw]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.url}
              alt={doc.title}
              className="block max-h-[60vh] max-w-[60vw] rounded-lg object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.4)] transition-[background-color,transform] duration-150 hover:bg-slate-100 active:scale-90"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────── PaymentInformation ───────────
// Itemized payment breakdown for the booking dialog. Shows method + status
// as meta, then a line for each ticket (grouped by fare class), an optional
// vehicle fee, a flat booking fee, and a totals strip at the bottom.
function PaymentInformation({ booking }: { booking: Booking }) {
  // Group tickets by fare class so the line items collapse when multiple
  // passengers share the same rate (e.g. "Economy × 3").
  const grouped = useMemo(() => {
    const acc = new Map<string, { fareClass: FareClass; fare: number; count: number; subtotal: number }>();
    // Comped (driver/companion) tickets are surfaced in the Vehicle section
    // and rolled up into the vehicle fee — skip them here so they don't
    // render as ₱0 line items.
    booking.tickets.filter((t) => !t.comped).forEach((t) => {
      const key = `${t.fareClass}-${t.fare}`;
      const existing = acc.get(key);
      if (existing) {
        existing.count += 1;
        existing.subtotal += t.fare;
      } else {
        acc.set(key, { fareClass: t.fareClass, fare: t.fare, count: 1, subtotal: t.fare });
      }
    });
    return Array.from(acc.values());
  }, [booking.tickets]);
  const compedCount = booking.tickets.filter((t) => t.comped).length;

  const passengerSubtotal = grouped.reduce((s, g) => s + g.subtotal, 0);
  // Whatever the booking total didn't cover via tickets/booking-fee gets
  // attributed to the vehicle line — keeps the breakdown reconciled with
  // the original amount the table column shows.
  const bookingFee = 40; // flat per-booking convenience fee
  const vehicleCharge = Math.max(0, booking.amount - passengerSubtotal - bookingFee);

  const statusTone =
    booking.paymentStatus === "Paid"
      ? "bg-emerald-100 text-emerald-800"
      : booking.paymentStatus === "Pending"
      ? "bg-brand-50 text-brand-700"
      : "bg-slate-100 text-slate-500";

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      {/* Section header + payment status pill */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Payment Information
        </h3>
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone}`}>
          {booking.paymentStatus}
        </span>
      </div>

      {/* Method strip */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Method</div>
          <div className="mt-1 text-[12.5px] font-semibold tracking-tight text-slate-900">{booking.paymentMethod}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Booked on</div>
          <div className="mt-1 text-[12.5px] font-semibold tracking-tight text-slate-900">{fmtDate(booking.bookingDate)}</div>
        </div>
      </div>

      {/* Itemized lines */}
      <dl className="divide-y divide-slate-100 px-4 py-1">
        {grouped.map((g) => (
          <div key={`${g.fareClass}-${g.fare}`} className="flex items-baseline justify-between py-2.5 text-[12.5px]">
            <dt className="min-w-0 flex-1">
              <span className="font-medium tracking-tight text-slate-900">{g.fareClass} ticket</span>
              {g.count > 1 && (
                <span className="ml-1.5 text-slate-500">× {g.count}</span>
              )}
              <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
                ₱{g.fare.toLocaleString()} each
              </div>
            </dt>
            <dd className="shrink-0 pl-3 font-mono text-[13px] font-semibold tabular-nums text-slate-900">
              ₱{g.subtotal.toLocaleString()}
            </dd>
          </div>
        ))}

        {vehicleCharge > 0 && (
          <div className="flex items-baseline justify-between py-2.5 text-[12.5px]">
            <dt className="min-w-0 flex-1">
              <span className="font-medium tracking-tight text-slate-900">Vehicle</span>
              {booking.vehicleClass && (
                <span className="ml-1.5 text-slate-500">{booking.vehicleClass}</span>
              )}
              {compedCount > 0 && (
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Includes {compedCount} comped {compedCount === 1 ? "seat" : "seats"} (driver + companion)
                </div>
              )}
            </dt>
            <dd className="shrink-0 pl-3 font-mono text-[13px] font-semibold tabular-nums text-slate-900">
              ₱{vehicleCharge.toLocaleString()}
            </dd>
          </div>
        )}

        <div className="flex items-baseline justify-between py-2.5 text-[12.5px]">
          <dt className="min-w-0 flex-1">
            <span className="font-medium tracking-tight text-slate-900">Booking fee</span>
            <div className="mt-0.5 text-[11px] text-slate-400">Convenience fee</div>
          </dt>
          <dd className="shrink-0 pl-3 font-mono text-[13px] font-semibold tabular-nums text-slate-900">
            ₱{bookingFee.toLocaleString()}
          </dd>
        </div>
      </dl>

      {/* Totals strip */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-500">Total</span>
          <span className="font-mono text-[16px] font-bold tabular-nums tracking-tight text-slate-900">
            ₱{booking.amount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Dashed connector flanking the shipping-line avatar in the route card.
function DialogDashedArrow() {
  return (
    <svg viewBox="0 0 48 12" className="h-3 w-10 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 6 H38" strokeDasharray="3 3" />
      <path d="M38 2 L44 6 L38 10" />
    </svg>
  );
}
