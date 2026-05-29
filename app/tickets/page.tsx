"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { LogoTile } from "@/components/ShippingLineSwitcher";
import type { Line } from "@/lib/shipping-lines";
import { TableSkeleton } from "@/components/Skeleton";
import FiltersDialog, { FiltersButton, type FilterFieldDef } from "@/components/FiltersDialog";
import EmptyState from "@/components/EmptyState";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import ActivityLog from "@/components/ActivityLog";
import DateRangePicker, { type DateRange } from "@/components/DateRangePicker";
import { useToast } from "@/components/ToastContext";
import {
  deriveBookings,
  statusLabel,
  ticketStatusTone,
  type Booking,
  type FareClass,
  type Ticket,
  type TicketStatus,
  type PaxType,
  PAX_TYPE_LABELS,
  deriveTicketActivity,
} from "@/lib/bookings-data";
import { loadScopedVoyages } from "@/lib/line-scope";

// ─────────── Flat ticket row shape ───────────
// Each ticket gets flattened into a row that carries enough of its parent
// booking's identity (ref, route, vessel, departure) to stand on its own
// in the table. Mutations on a row should mirror back into the booking.
type TicketRow = Ticket & {
  bookingRef: string;
  ticketholder: string;
  routeOriginCode: string;
  routeDestinationCode: string;
  routeOriginCity: string;
  routeDestinationCity: string;
  vesselName: string;
  departureDate: Date;
  bookingDate: Date;
};

function flattenTickets(bookings: Booking[]): TicketRow[] {
  const rows: TicketRow[] = [];
  bookings.forEach((b) => {
    b.tickets.forEach((t) => {
      rows.push({
        ...t,
        bookingRef: b.ref,
        ticketholder: b.ticketholder,
        routeOriginCode: b.routeOriginCode,
        routeDestinationCode: b.routeDestinationCode,
        routeOriginCity: b.routeOriginCity,
        routeDestinationCity: b.routeDestinationCity,
        vesselName: b.vesselName,
        departureDate: b.departureDate,
        bookingDate: b.bookingDate,
      });
    });
  });
  // Newest bookings first (matches the bookings table sort).
  return rows.sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());
}

const PAGE_SIZE = 15;

function fmtDepartureDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

function fmtDepartureTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Ticket-level display label — keeps statuses in sync with bookings's
// approved-vs-confirmed wording. Tickets statuses are simpler so just pass
// the value through.
const ticketStatusLabel: Record<TicketStatus, string> = {
  Pending:   "Pending",
  Issued:    "Issued",
  Cancelled: "Cancelled",
  Refunded:  "Refunded",
};

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300">
      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TicketsPage() {
  const { active, locked } = useShippingLine();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [vesselFilter, setVesselFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [classFilter, setClassFilter] = useState<"all" | FareClass>("all");
  // Passenger-type filter — discount categories drawn from vessel creation
  // (Senior / PWD / Student / Infant) plus Regular.
  const [paxTypeFilter, setPaxTypeFilter] = useState<"all" | PaxType>("all");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Row whose "Mark Paid" was triggered from the row menu — opens the
  // ticket-number prompt before committing the Paid status.
  const [paidTarget, setPaidTarget] = useState<TicketRow | null>(null);

  // Copy-to-clipboard state for ticket IDs.
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      showToast(`Ticket ${id} copied`);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  // Booking-date range filter.
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const defaultDateRange = useMemo<DateRange>(() => ({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  }), [today]);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const isDefaultDateRange = (r: DateRange) =>
    r.start.getTime() === defaultDateRange.start.getTime() &&
    r.end.getTime() === defaultDateRange.end.getTime();
  const ticketActiveCount =
    (routeFilter !== "all" ? 1 : 0) +
    (vesselFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (classFilter !== "all" ? 1 : 0) +
    (paxTypeFilter !== "all" ? 1 : 0) +
    (isDefaultDateRange(dateRange) ? 0 : 1);

  // Hydrate the same way the bookings page does — re-derive from
  // `tripket.voyages` localStorage on mount so the two pages stay in sync.
  useEffect(() => {
    try {
      const voyages = loadScopedVoyages(active.id, locked);
      const t = setTimeout(() => setBookings(deriveBookings(voyages)), 180);
      return () => clearTimeout(t);
    } catch {
      setBookings([]);
    }
  }, [active.id, locked]);

  // ?booking=TKT-#### deep link from the bookings row popover. Pre-loads the
  // booking ref into the search query so the table filters to just that
  // booking's tickets. Runs once on mount; user can clear/edit afterwards.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingRef = params.get("booking");
    if (bookingRef) setQuery(bookingRef);
  }, []);

  useEffect(() => { setPage(1); }, [query, routeFilter, vesselFilter, statusFilter, classFilter, paxTypeFilter, dateRange]);

  const rows = useMemo(() => bookings ? flattenTickets(bookings) : [], [bookings]);
  const openTicket = useMemo(
    () => rows.find((r) => r.id === openTicketId) ?? null,
    [rows, openTicketId]
  );

  // Esc to close the ticket detail dialog.
  useEffect(() => {
    if (!openTicketId) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpenTicketId(null); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openTicketId]);

  const routeOptions = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => seen.add(`${r.routeOriginCode}→${r.routeDestinationCode}`));
    return [{ value: "all", label: "All routes" }, ...Array.from(seen).sort().map((r) => ({ value: r, label: r.replace("→", " → ") }))];
  }, [rows]);
  const vesselOptions = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => seen.add(r.vesselName));
    return [{ value: "all", label: "All vessels" }, ...Array.from(seen).sort().map((v) => ({ value: v, label: v }))];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (routeFilter !== "all" && `${r.routeOriginCode}→${r.routeDestinationCode}` !== routeFilter) return false;
      if (vesselFilter !== "all" && r.vesselName !== vesselFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (classFilter !== "all" && r.fareClass !== classFilter) return false;
      if (paxTypeFilter !== "all" && r.paxType !== paxTypeFilter) return false;
      if (r.bookingDate < dateRange.start || r.bookingDate > dateRange.end) return false;
      if (q) {
        const hay = `${r.id} ${r.bookingRef} ${r.name} ${r.routeOriginCode} ${r.routeDestinationCode} ${r.vesselName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, routeFilter, vesselFilter, statusFilter, classFilter, paxTypeFilter, dateRange]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isEmpty = bookings !== null && rows.length === 0;

  // Status mutations operate on the booking's ticket list so the bookings
  // page stays in sync (since both pages derive from the same in-memory
  // bookings array — and from `tripket.voyages` on next reload).
  const mutateTicket = (ticketId: string, patch: Partial<Ticket>) => {
    setBookings((prev) =>
      prev
        ? prev.map((b) =>
            b.tickets.some((t) => t.id === ticketId)
              ? { ...b, tickets: b.tickets.map((t) => (t.id === ticketId ? { ...t, ...patch } : t)) }
              : b
          )
        : prev
    );
  };

  return (
    <div>
      <PageHeader title="Tickets" subtitle={active.name} showDateFilter={false} />

      {!bookings ? (
        <TableSkeleton rows={8} />
      ) : isEmpty ? (
        <EmptyState
          kind="inbox"
          title="No tickets yet"
          body="Tickets appear here once bookings are created. Each passenger gets their own ticket under a booking."
        />
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">All tickets</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span> of {rows.length} tickets
              </p>
            </div>

            <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2">
              <div className="flex w-72 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-brand-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ticket, passenger, or booking…"
                  className="w-full min-w-0 flex-1 bg-transparent placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <FiltersButton onClick={() => setFiltersOpen(true)} activeCount={ticketActiveCount} />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto" style={{ scrollbarGutter: "stable" }}>
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Ticket number</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Status</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Passenger <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Booking ref</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Route</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Departure <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Class</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Amount</th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50 px-6 py-3 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">
                      No tickets match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((r, i) => {
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                      onClick={() => setOpenTicketId(r.id)}
                      className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50/60"
                    >
                      <td className="relative whitespace-nowrap px-6 py-4 align-middle">
                        <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                        {r.ticketNumber ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{r.ticketNumber}</span>
                            {copiedId === r.ticketNumber ? (
                              <span aria-label="Copied" className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                  <path d="M5 12l5 5 9-11" />
                                </svg>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCopyId(r.ticketNumber!); }}
                                aria-label={`Copy ${r.ticketNumber}`}
                                className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                  <rect x="9" y="9" width="11" height="11" rx="2" />
                                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300" title="Assigned when the ticket is marked paid">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 align-middle">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${ticketStatusTone[r.status]}`}>
                          {ticketStatusLabel[r.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 align-middle">
                        <span className="text-[13.5px] font-semibold tracking-tight text-slate-900">{r.name}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 align-middle">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{r.bookingRef}</span>
                          {copiedId === r.bookingRef ? (
                            <span aria-label="Copied" className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                <path d="M5 12l5 5 9-11" />
                              </svg>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCopyId(r.bookingRef); }}
                              aria-label={`Copy ${r.bookingRef}`}
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
                        <div className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-[13px] font-medium tracking-tight text-slate-900">
                          <span>{r.routeOriginCity}</span>
                          <span className="font-mono text-[10.5px] tabular-nums text-slate-400">({r.routeOriginCode})</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-slate-300">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                          <span>{r.routeDestinationCity}</span>
                          <span className="font-mono text-[10.5px] tabular-nums text-slate-400">({r.routeDestinationCode})</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 align-middle text-[13px] font-semibold tracking-tight text-slate-900">
                        {fmtDepartureDate(r.departureDate)}
                        <span className="ml-1.5 font-mono font-medium tabular-nums text-slate-600">{fmtDepartureTime(r.departureDate)}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 align-middle">
                        <span className="text-[12.5px] font-medium tracking-tight text-slate-700">{r.fareClass}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 align-middle">
                        {r.comped ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700 ring-1 ring-sky-100" title="Free seat — covered by the vehicle fare">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                              <path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z" />
                              <path d="M5 14V8a1 1 0 0 1 1-1h7l5 4" />
                            </svg>
                            Comped
                          </span>
                        ) : (
                          <span className="font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">₱{r.fare.toLocaleString()}</span>
                        )}
                      </td>
                      <td
                        className="sticky right-0 z-10 whitespace-nowrap bg-white px-6 py-4 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] transition-colors duration-150 group-hover:bg-slate-50 has-[[role=menu]]:z-30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowMenu
                          ariaLabel={`Actions for ${r.id}`}
                          items={[
                            // View routes back to the parent booking on the bookings page.
                            {
                              label: "View booking",
                              onClick: () => { window.location.href = `/bookings?ref=${r.bookingRef}`; },
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              ),
                            },
                            // Mark Pending — for tickets awaiting payment/approval.
                            {
                              label: "Mark Pending",
                              disabled: r.status === "Cancelled" || r.status === "Refunded" || r.status === "Pending",
                              onClick: () => { mutateTicket(r.id, { status: "Pending" }); showToast(`Ticket ${r.id} marked Pending`); },
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M12 7v5l3 2" />
                                </svg>
                              ),
                            },
                            // Mark Paid — terminal Cancelled/Refunded tickets stay locked.
                            {
                              label: "Mark Issued",
                              disabled: r.status === "Cancelled" || r.status === "Refunded" || r.status === "Issued",
                              onClick: () => setPaidTarget(r),
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <path d="M5 12l5 5 9-11" />
                                </svg>
                              ),
                            },
                            {
                              label: "Refund",
                              disabled: r.status === "Cancelled" || r.status === "Refunded",
                              onClick: () => { mutateTicket(r.id, { status: "Refunded" }); showToast(`Ticket ${r.id} refunded`); },
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                                  <path d="M3 4v5h5" />
                                </svg>
                              ),
                            },
                            // Cancel — terminal action.
                            {
                              label: "Cancel ticket",
                              danger: true,
                              disabled: r.status === "Cancelled" || r.status === "Refunded",
                              onClick: () => { mutateTicket(r.id, { status: "Cancelled" }); showToast(`Ticket ${r.id} cancelled`); },
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
            noun="tickets"
          />
        </section>
      )}

      <TicketDetailDialog
        ticket={openTicket}
        line={active}
        onClose={() => setOpenTicketId(null)}
        copiedId={copiedId}
        onCopyId={handleCopyId}
        onMutate={(patch: Partial<Ticket>) => {
          if (!openTicket) return;
          mutateTicket(openTicket.id, patch);
        }}
        onGoToBooking={() => {
          if (!openTicket) return;
          window.location.href = `/bookings?ref=${openTicket.bookingRef}`;
        }}
      />

      <MarkPaidDialog
        open={!!paidTarget}
        existingNumber={paidTarget?.ticketNumber}
        onClose={() => setPaidTarget(null)}
        onConfirm={(ticketNumber) => {
          if (!paidTarget) return;
          mutateTicket(paidTarget.id, { status: "Issued", ticketNumber });
          showToast(`Ticket ${ticketNumber} marked Issued`);
          setPaidTarget(null);
        }}
      />

      <FiltersDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        activeCount={ticketActiveCount}
        fields={[
          { kind: "select", key: "route",  label: "Route",  value: routeFilter,  options: routeOptions,  onChange: setRouteFilter,  defaultValue: "all" },
          { kind: "select", key: "vessel", label: "Vessel", value: vesselFilter, options: vesselOptions, onChange: setVesselFilter, defaultValue: "all" },
          { kind: "select", key: "status", label: "Status", value: statusFilter, onChange: (v) => setStatusFilter(v as "all" | TicketStatus), defaultValue: "all",
            options: [
              { value: "all", label: "All status" },
              { value: "Pending", label: "Pending" },
              { value: "Issued", label: "Issued" },
              { value: "Cancelled", label: "Cancelled" },
              { value: "Refunded", label: "Refunded" },
            ] },
          { kind: "select", key: "class", label: "Fare class", value: classFilter, onChange: (v) => setClassFilter(v as "all" | FareClass), defaultValue: "all",
            options: [
              { value: "all", label: "All classes" },
              { value: "Economy", label: "Economy" },
              { value: "Tourist", label: "Tourist" },
              { value: "Business", label: "Business" },
            ] },
          { kind: "select", key: "pax", label: "Passenger type", value: paxTypeFilter, onChange: (v) => setPaxTypeFilter(v as "all" | PaxType), defaultValue: "all",
            options: [
              { value: "all", label: "All passenger types" },
              ...(Object.keys(PAX_TYPE_LABELS) as PaxType[]).map((k) => ({ value: k, label: PAX_TYPE_LABELS[k] })),
            ] },
          { kind: "dateRange", key: "date", label: "Booking date", value: dateRange, onChange: setDateRange, defaultValue: defaultDateRange },
        ]}
      />
    </div>
  );
}

// statusLabel is exported by the bookings page but tickets currently uses
// its own ticketStatusLabel map for clarity. Keep the import alive so the
// dependency stays explicit if we widen the surface later.
void statusLabel;

// ─────────── TicketDetailDialog ───────────
// Passenger-focused detail for a single ticket. Different from the booking
// dialog in that it's scoped to one passenger — no roster, no per-pax
// payment breakdown. Footer surfaces the ticket-level mutations + a "Go to
// booking" jump back into the parent BookingDetailDialog.
function TicketDetailDialog({
  ticket,
  line,
  onClose,
  copiedId,
  onCopyId,
  onMutate,
  onGoToBooking,
}: {
  ticket: TicketRow | null;
  line: Line;
  onClose: () => void;
  copiedId: string | null;
  onCopyId: (id: string) => void;
  onMutate: (patch: Partial<Ticket>) => void;
  onGoToBooking: () => void;
}) {
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const ticketActivity = useMemo(
    () => (ticket ? deriveTicketActivity(ticket, ticket.bookingRef, ticket.bookingDate) : []),
    [ticket]
  );
  return (
    <AnimatePresence>
      {ticket && (
        <motion.div
          key="ticket-dialog"
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
            className="flex max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70"
          >
          {/* Left column — ticket content (header · scroll body · footer). */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header — Ticket number (copyable), status pill, passenger name + booking ref */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {ticket.ticketNumber ? (
                    <>
                      <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{ticket.ticketNumber}</span>
                      {copiedId === ticket.ticketNumber ? (
                        <span className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <path d="M5 12l5 5 9-11" />
                          </svg>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCopyId(ticket.ticketNumber!)}
                          aria-label={`Copy ${ticket.ticketNumber}`}
                          className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                          </svg>
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-400" title="Assigned when the ticket is marked paid">No ticket number yet</span>
                  )}
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${ticketStatusTone[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </div>
                <h2 className="mt-1.5 truncate text-[17px] font-semibold tracking-tight text-slate-900">{ticket.name}</h2>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Under booking <span className="font-mono font-medium tabular-nums text-slate-700">{ticket.bookingRef}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-[background-color,color,transform] duration-150 hover:bg-slate-100 hover:text-slate-700 active:scale-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Route summary — simpler than the booking dialog since this
                  is one ticket; just the route headlines + departure. */}
              <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="min-w-0 flex-1 text-center">
                      <div className="truncate font-mono text-[20px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">{ticket.routeOriginCode}</div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{ticket.routeOriginCity}</div>
                    </div>
                    <svg viewBox="0 0 48 12" className="h-3 w-10 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2 6 H38" strokeDasharray="3 3" />
                      <path d="M38 2 L44 6 L38 10" />
                    </svg>
                    {/* Shipping line avatar + caption between the city codes,
                        matching the booking dialog's route-card anatomy. */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="shrink-0">
                        <LogoTile line={line} size={32} />
                      </span>
                      <span className="max-w-[120px] truncate text-[10px] font-medium text-slate-500">{line.name}</span>
                    </div>
                    <svg viewBox="0 0 48 12" className="h-3 w-10 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2 6 H38" strokeDasharray="3 3" />
                      <path d="M38 2 L44 6 L38 10" />
                    </svg>
                    <div className="min-w-0 flex-1 text-center">
                      <div className="truncate font-mono text-[20px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">{ticket.routeDestinationCode}</div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{ticket.routeDestinationCity}</div>
                    </div>
                  </div>
                  {/* ETD caption — only shown for active (Paid) tickets so
                      cancelled/void/refunded entries don't read like they're
                      still scheduled. fmtEtd flips wording to "Departed …
                      ago" once departure is in the past. */}
                  {(ticket.status === "Issued" || ticket.status === "Pending") && (
                    <p className="mt-3 text-center text-[11px] font-medium tracking-tight text-slate-500">
                      ( {fmtEtd(ticket.departureDate)} )
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Departure</div>
                    <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{fmtDepartureDate(ticket.departureDate)}</div>
                    <div className="mt-0.5 font-mono text-[11.5px] font-medium tabular-nums text-slate-600">{fmtDepartureTime(ticket.departureDate)}</div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Vessel</div>
                    <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{ticket.vesselName}</div>
                  </div>
                </div>
              </div>

              {/* Passenger details — sex/age/nationality + contact + valid-ID
                  type. Mirrors what the booking dialog's expanded passenger
                  row exposes, but in a non-collapsed card. */}
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200/70">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Passenger</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Gender</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{ticket.sex}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Age</dt>
                    <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-900">{ticket.age}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Nationality</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{ticket.nationality}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] text-slate-500">ID</dt>
                    <dd className="mt-0.5 text-[12.5px] font-semibold tracking-tight text-slate-900">{ticket.documentType}</dd>
                    <dd className="mt-0.5 font-mono text-[11.5px] font-medium tabular-nums text-slate-500">{ticket.documentRef}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Phone <span className="text-slate-400">(Optional)</span></dt>
                    <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-900">{ticket.phone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Email <span className="text-slate-400">(Optional)</span></dt>
                    <dd className="mt-0.5 truncate font-medium text-slate-900">{ticket.email ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              {/* Valid ID photos — same affordance as the booking dialog:
                  thumbnail + status pill, clickable to enlarge. */}
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200/70">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Valid ID Photos</div>
                <ul className="mt-2 space-y-1.5 text-[12.5px]">
                  <TicketRequirementRow
                    label={`${ticket.documentType} — Front`}
                    required
                    uploaded={!!ticket.idFrontUrl}
                    previewUrl={ticket.idFrontUrl}
                    onPreview={() => setPreview({ title: `${ticket.documentType} · Front`, url: ticket.idFrontUrl })}
                  />
                  <TicketRequirementRow
                    label={`${ticket.documentType} — Back`}
                    required
                    uploaded={!!ticket.idBackUrl}
                    previewUrl={ticket.idBackUrl}
                    onPreview={() => setPreview({ title: `${ticket.documentType} · Back`, url: ticket.idBackUrl })}
                  />
                </ul>
              </div>

              {/* Payment Information — mirrors the booking dialog's section,
                  scoped to this single ticket. */}
              <TicketPaymentInformation ticket={ticket} />
            </div>

            {/* Footer — status-aware ticket mutations + jump back to booking. */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onGoToBooking}
                  className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                >
                  Go to booking
                </button>
                {/* Single status-picker collapses all four mutations into a
                    ClickUp-style chevron menu, keeping the footer compact. */}
                <StatusPicker
                  current={ticket.status}
                  existingNumber={ticket.ticketNumber}
                  onChange={(patch) => { onMutate(patch); onClose(); }}
                />
              </div>
            </div>
          </div>

          {/* Right rail — activity / audit log, bottom-anchored. */}
          <div className="hidden w-[280px] shrink-0 border-l border-slate-100 sm:flex">
            <ActivityLog entries={ticketActivity} />
          </div>
          </motion.div>

          <DocumentPreviewDialog doc={preview} onClose={() => setPreview(null)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────── TicketPaymentInformation ───────────
// Per-ticket payment breakdown mirroring the booking dialog's section: header
// + status pill, a method/issued strip, the fare line (or a comped marker),
// and a total strip. Scoped to this single passenger.
function TicketPaymentInformation({ ticket }: { ticket: TicketRow }) {
  const payTone =
    ticket.status === "Issued" ? "bg-emerald-100 text-emerald-800"
    : ticket.status === "Refunded" ? "bg-sky-50 text-sky-700"
    : ticket.status === "Cancelled" ? "bg-slate-100 text-slate-500"
    : "bg-brand-50 text-brand-700";
  const payLabel =
    ticket.status === "Issued" ? "Issued"
    : ticket.status === "Refunded" ? "Refunded"
    : ticket.status === "Cancelled" ? "Unpaid"
    : "Pending";

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Payment Information</h3>
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${payTone}`}>
          {payLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Method</div>
          <div className="mt-1 text-[12.5px] font-semibold tracking-tight text-slate-900">
            {ticket.comped ? "Vehicle fare" : "Tripket Wallet"}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Booked on</div>
          <div className="mt-1 text-[12.5px] font-semibold tracking-tight text-slate-900">{fmtDepartureDate(ticket.bookingDate)}</div>
        </div>
      </div>

      <dl className="divide-y divide-slate-100 px-4 py-1">
        <div className="flex items-baseline justify-between py-2.5 text-[12.5px]">
          <dt className="min-w-0 flex-1">
            <span className="font-medium tracking-tight text-slate-900">{ticket.fareClass} ticket</span>
            {ticket.comped && (
              <div className="mt-0.5 text-[11px] text-slate-400">Comped — covered by the vehicle fare</div>
            )}
          </dt>
          <dd className="shrink-0 pl-3">
            {ticket.comped ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700 ring-1 ring-sky-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                  <path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z" />
                  <path d="M5 14V8a1 1 0 0 1 1-1h7l5 4" />
                </svg>
                Comped
              </span>
            ) : (
              <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">₱{ticket.fare.toLocaleString()}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-500">Total</span>
          <span className="font-mono text-[16px] font-bold tabular-nums tracking-tight text-slate-900">
            ₱{(ticket.comped ? 0 : ticket.fare).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────── StatusPicker ───────────
// ClickUp-style status selector. The trigger shows the current status as a
// coloured pill with a chevron; clicking opens a small popover listing every
// status. Selecting one fires onChange (which usually also closes the dialog
// in the caller). Statuses that aren't valid transitions from the current
// one are rendered disabled so the surface stays consistent across tickets.
function StatusPicker({
  current,
  existingNumber,
  onChange,
}: {
  current: TicketStatus;
  existingNumber?: string;
  onChange: (patch: Partial<Ticket>) => void;
}) {
  const [open, setOpen] = useState(false);
  // When the admin picks "Issued", we intercept to collect the ticket number
  // before committing the status change.
  const [askPaid, setAskPaid] = useState(false);
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

  // Terminal states block every transition.
  const isTerminal = current === "Cancelled" || current === "Refunded";
  const canPick = (s: TicketStatus): boolean => {
    if (s === current) return false;
    if (isTerminal) return false;
    return true;
  };

  const options: { value: TicketStatus; label: string }[] = [
    { value: "Pending",   label: "Mark Pending" },
    { value: "Issued",      label: "Mark Issued" },
    { value: "Refunded",  label: "Refund" },
    { value: "Cancelled", label: "Cancel ticket" },
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
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-white">Update status</span>
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
            className="absolute bottom-full right-0 z-30 mb-2 w-56 overflow-hidden rounded-xl bg-white p-1 shadow-[0_18px_44px_-16px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70"
          >
            <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Update status
            </div>
            {options
              .filter((o) => o.value !== current)
              .map((o) => {
                const disabled = !canPick(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="menuitem"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setOpen(false);
                      // Paid requires an admin-entered ticket number — prompt for it
                      // instead of committing the status outright.
                      if (o.value === "Issued") { setAskPaid(true); return; }
                      onChange({ status: o.value });
                    }}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors duration-100 ${
                      disabled
                        ? "cursor-not-allowed text-slate-300"
                        : o.value === "Cancelled"
                          ? "text-rose-600 hover:bg-rose-50"
                          : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate font-medium">{o.label}</span>
                    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${ticketStatusTone[o.value]} ${disabled ? "opacity-50" : ""}`}>
                      {o.value}
                    </span>
                  </button>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>

      <MarkPaidDialog
        open={askPaid}
        existingNumber={existingNumber}
        onClose={() => setAskPaid(false)}
        onConfirm={(ticketNumber) => { onChange({ status: "Issued", ticketNumber }); setAskPaid(false); }}
      />
    </div>
  );
}

// ─────────── MarkPaidDialog ───────────
// Captures the real-world ticket number when an admin marks a ticket Paid.
// The status only flips once a number is entered.
function MarkPaidDialog({
  open,
  existingNumber,
  onClose,
  onConfirm,
}: {
  open: boolean;
  existingNumber?: string;
  onClose: () => void;
  onConfirm: (ticketNumber: string) => void;
}) {
  const [num, setNum] = useState("");
  useEffect(() => { if (open) setNum(existingNumber ?? ""); }, [open, existingNumber]);
  const trimmed = num.trim();

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-start gap-3.5">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M5 12l5 5 9-11" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">Mark as issued</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Enter the ticket number assigned when the ticket is issued. This is recorded on the ticket.
            </p>
            <div className="mt-4">
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Ticket number</label>
              <input
                type="text"
                value={num}
                onChange={(e) => setNum(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && trimmed) { e.preventDefault(); onConfirm(trimmed); } }}
                autoFocus
                placeholder="e.g. T1234567"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[13px] tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => trimmed && onConfirm(trimmed)}
          disabled={!trimmed}
          className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-emerald-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm issuance
        </button>
      </div>
    </Modal>
  );
}

// Requirement row (thumbnail + status pill) — duplicated from the bookings
// page since the components weren't extracted into a shared module yet.
function TicketRequirementRow({
  label, required, uploaded, previewUrl, onPreview,
}: {
  label: string;
  required: boolean;
  uploaded: boolean;
  previewUrl?: string;
  onPreview: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {uploaded && previewUrl ? (
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

// Lightbox-style document preview — same shape as the booking-page version.
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
