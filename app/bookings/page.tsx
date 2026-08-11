"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import { type DateRange } from "@/components/DateRangePicker";
import FiltersDialog, { FiltersButton } from "@/components/FiltersDialog";
import EmptyState from "@/components/EmptyState";
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
  ticketStatusLabel,
  PAX_TYPE_LABELS,
  paxFareBreakdown,
  canEditBooking,
  updatePassenger,
  updateVehicle,
  formatExpiry,
  isExpired,
  type Booking,
  type BookingStatus,
  type FareClass,
  type Ticket,
  type PassengerPatch,
  type VehiclePatch,
} from "@/lib/bookings-data";
import { loadScopedVoyages } from "@/lib/line-scope";
import { reviveBookings, mergeSeededBookings } from "@/lib/bookings-data";
import { loadStore, saveStore } from "@/lib/persisted-store";
import ActivityLog from "@/components/ActivityLog";
import Modal from "@/components/Modal";
import EditEntityDialog, { type EditEntityInit } from "@/components/EditEntityDialog";


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
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [vesselFilter, setVesselFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Ref copy state (matches PendingAgingList on the dashboard) ──
  // Tracks the most-recently-copied ref so the button can flash a check mark
  // for 1.5s before reverting to the copy icon. Toast confirms the action.
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null);
  // Booking being approved via the batch ticket-number dialog.
  const [approveTarget, setApproveTarget] = useState<Booking | null>(null);
  // Booking ref awaiting a refund confirmation (with required remarks).
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  // Cancelling queues money for return, so it confirms first.
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  // Entity being edited via the shared EditEntityDialog, tagged with its
  // parent booking ref so the save handler knows where to write.
  const [editTarget, setEditTarget] = useState<{ ref: string; init: EditEntityInit } | null>(null);
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
  const ACTOR = "Someone";
  const logTo = (b: Booking, entry: ReturnType<typeof makeActivity>): Booking => ({
    ...b,
    activity: [entry, ...(b.activity ?? deriveActivity(b))],
  });

  // Cancelling a booking flags it — and every non-terminal ticket under it —
  // as "For Refund" (internal "To Refund") so the money is queued for return.
  // Already-refunded tickets stay put; the payout runs separately from here.
  const handleCancel = (ref: string) => {
    updateBookings((prev) => prev.map((x) => {
      if (x.ref !== ref) return x;
      const tickets = x.tickets.map((t) =>
        t.status === "Cancelled" || t.status === "Refunded"
          ? t
          : { ...t, status: "To Refund" as const });
      return logTo(
        { ...x, status: "To Refund", tickets },
        makeActivity("to_refund", "Booking cancelled — marked for refund", ACTOR, `₱${x.amount.toLocaleString()} eligible for return`),
      );
    }));
    showToast(`Booking ${ref} cancelled — marked For Refund`);
  };
  // Approve opens the batch dialog so the admin can assign each pending
  // ticket its own ticket number before confirming.
  const handleApprove = (ref: string) => {
    const b = bookings?.find((x) => x.ref === ref) ?? null;
    if (b) setApproveTarget(b);
  };
  // Commit an approval: record the booking reference, issue every pending
  // ticket with its number/note, and (when present) stamp the vehicle ticket
  // number. The booking becomes Confirmed and payment settles.
  const commitApproval = (
    ref: string,
    result: {
      bookingRefNo: string;
      vehicleTicketNo?: string;
      tickets: Record<string, { status: "Issued"; number?: string; note?: string }>;
    }
  ) => {
    const { bookingRefNo, vehicleTicketNo, tickets: decisions } = result;
    updateBookings((prev) =>
      prev.map((x) => {
            if (x.ref !== ref) return x;
            const entries: ReturnType<typeof makeActivity>[] = [];
            const tickets = x.tickets.map((t) => {
              const d = decisions[t.id];
              if (!d) return t;
              entries.push(makeActivity("ticket_paid", "Ticket issued", ACTOR, `Ticket no. ${d.number} · ${t.name}`));
              if (d.note) entries.push(makeActivity("note", "Note added", ACTOR, `${t.name} · ${d.note}`));
              return { ...t, status: "Issued" as const, ticketNumber: d.number, note: d.note };
            });
            const vehicle = x.vehicle && vehicleTicketNo
              ? { ...x.vehicle, ticketNumber: vehicleTicketNo }
              : x.vehicle;
            // Approving an under-review booking confirms it and settles payment.
            entries.push(makeActivity("approved", "Booking approved", ACTOR, `Booking ref. ${bookingRefNo}`));
            return {
              ...x,
              bookingRefNo,
              vehicle,
              tickets,
              status: "Confirmed",
              paymentStatus: "Issued",
              activity: [...entries.reverse(), ...(x.activity ?? deriveActivity(x))],
            };
          })
    );
    showToast(`Booking ${ref} approved`);
  };
  // Refunding a booking cascades to its tickets — every non-cancelled ticket
  // tied to the booking is refunded too (a cancelled/void seat isn't). Keeps
  // the passenger tickets consistent with the booking's terminal state.
  const handleRefund = (ref: string, remarks: string) => {
    const note = remarks.trim();
    updateBookings((prev) => prev.map((x) => {
      if (x.ref !== ref) return x;
      const tickets = x.tickets.map((t) =>
        t.status === "Cancelled" ? t : { ...t, status: "Refunded" as const });
      return logTo(
        { ...x, status: "Refunded", paymentStatus: "Refunded", tickets },
        makeActivity(
          "refunded",
          "Payment refunded",
          ACTOR,
          `₱${x.amount.toLocaleString()} returned — ${note}`,
        ),
      );
    }));
    showToast(`Booking ${ref} refunded`);
  };

  // Mark an unpaid (Pending) booking as paid → it moves to Under Review
  // (Submitted), awaiting operator approval. Clears the payment-hold expiry and
  // issues its tickets (numbers are still assigned later at approval).
  const handleMarkPaid = (ref: string) => {
    updateBookings((prev) => prev.map((x) => {
      if (x.ref !== ref || x.status !== "Pending") return x;
      const tickets = x.tickets.map((t) =>
        t.status === "Pending" ? { ...t, status: "Issued" as const } : t);
      return logTo(
        { ...x, status: "Submitted", paymentStatus: "Submitted", paymentExpiresAt: undefined, tickets },
        makeActivity("paid", "Payment received", ACTOR, `₱${x.amount.toLocaleString()} paid`),
      );
    }));
    showToast(`Booking ${ref} marked as paid`);
  };

  // Persist a passenger / vehicle edit through the shared helpers (which also
  // append an "edited" activity entry), then close the editor.
  const handleSavePassenger = (ref: string, ticketId: string, patch: PassengerPatch) => {
    updateBookings((prev) => updatePassenger(prev, ref, ticketId, patch, ACTOR));
    setEditTarget(null);
    showToast("Passenger details updated");
  };
  const handleSaveVehicle = (ref: string, patch: VehiclePatch) => {
    updateBookings((prev) => updateVehicle(prev, ref, patch, ACTOR));
    setEditTarget(null);
    showToast("Vehicle details updated");
  };

  // Booking-date range filter — drives the dashboard-style picker.
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  // Page-stable wall clock for expiry math (memoized once per mount).
  const now = useMemo(() => new Date(), []);
  const defaultDateRange = useMemo<DateRange>(() => ({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  }), [today]);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const isDefaultDateRange = (r: DateRange) =>
    r.start.getTime() === defaultDateRange.start.getTime() &&
    r.end.getTime() === defaultDateRange.end.getTime();
  const bookingActiveCount =
    (originFilter !== "all" ? 1 : 0) +
    (destinationFilter !== "all" ? 1 : 0) +
    (vesselFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (isDefaultDateRange(dateRange) ? 0 : 1);

  // Hydrate bookings. Prefer the persisted store (so admin mutations like
  // cancel / approve / refund survive a refresh); fall through to deriving
  // from the live voyages mock and persist that seed. A bad store falls
  // through too — a stale shape shouldn't brick the page.
  useEffect(() => {
    try {
      const persisted = loadStore<unknown>("bookings", active.id);
      if (persisted) {
        const revived = reviveBookings(persisted);
        if (revived.length > 0) {
          // Merge in any newly-added seed bookings (e.g. new sample refs) so
          // they surface without discarding the operator's live edits.
          const voyages = loadScopedVoyages(active.id, locked);
          const seeded = deriveBookings(voyages).map((b) => ({ ...b, activity: deriveActivity(b) }));
          const merged = mergeSeededBookings(revived, seeded);
          if (merged.length !== revived.length) saveStore("bookings", active.id, merged);
          setBookings(merged);
          return;
        }
      }
    } catch { /* fall through to derive from voyages */ }
    try {
      const voyages = loadScopedVoyages(active.id, locked);
      const t = setTimeout(() => {
        const seeded = deriveBookings(voyages).map((b) => ({ ...b, activity: deriveActivity(b) }));
        setBookings(seeded);
        saveStore("bookings", active.id, seeded);
      }, 180);
      return () => clearTimeout(t);
    } catch {
      setBookings([]);
    }
  }, [active.id, locked]);

  // Wrap setBookings so every admin mutation persists.
  const updateBookings = (next: (prev: Booking[]) => Booking[]) => {
    setBookings(prev => {
      const value = next(prev ?? []);
      saveStore("bookings", active.id, value);
      return value;
    });
  };

  useEffect(() => { setPage(1); }, [query, originFilter, destinationFilter, vesselFilter, statusFilter, dateRange]);

  // ?ref=TKT-#### deep link — opens the matching booking dialog once data
  // hydrates. `?action=approve` (used by the dashboard's pending list)
  // skips the detail dialog and goes straight to the batch approval flow,
  // so the operator lands on the issuance form, not a detail page they'd
  // have to dismiss afterward.
  useEffect(() => {
    if (!bookings) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const match = bookings.find((b) => b.ref === ref);
    if (!match) return;
    if (params.get("action") === "approve" && match.status === "Submitted") {
      setApproveTarget(match);
    } else {
      setOpenRef(ref);
    }
  }, [bookings]);

  // Filter dropdown options derived from the data.
  // Origin / destination options — keyed by port code (stable) but labelled with
  // the city, so the list reads like the Routes page filter.
  const originOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (bookings ?? []).forEach((b) => seen.set(b.routeOriginCode, b.routeOriginCity || b.routeOriginCode));
    return [
      { value: "all", label: "All origins" },
      ...Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [bookings]);
  const destinationOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (bookings ?? []).forEach((b) => seen.set(b.routeDestinationCode, b.routeDestinationCity || b.routeDestinationCode));
    return [
      { value: "all", label: "All destinations" },
      ...Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
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
      if (originFilter !== "all" && b.routeOriginCode !== originFilter) return false;
      if (destinationFilter !== "all" && b.routeDestinationCode !== destinationFilter) return false;
      if (vesselFilter !== "all" && b.vesselName !== vesselFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (q) {
        const hay = `${b.ref} ${b.ticketholder} ${b.routeOriginCode} ${b.routeDestinationCode} ${b.vesselName}`.toLowerCase();
        if (!hay.includes(q)) return false;
        // An explicit text search targets a specific booking, so it isn't
        // constrained by the date-range picker — otherwise an exact ref match
        // outside the current window silently returns nothing.
        return true;
      }
      if (b.bookingDate < dateRange.start || b.bookingDate > dateRange.end) return false;
      return true;
    });
  }, [bookings, query, originFilter, destinationFilter, vesselFilter, statusFilter, dateRange]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isEmpty = bookings !== null && bookings.length === 0;

  return (
    <div>
      <PageHeader title="Bookings" showDateFilter={false} />

      {!bookings ? (
        <TableSkeleton rows={8} />
      ) : isEmpty ? (
        <EmptyState
          kind="inbox"
          title="No bookings yet"
          body="Bookings appear here once passengers reserve seats on your scheduled voyages. Create a voyage from the Voyages page to seed mock bookings."
        />
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

              <FiltersButton onClick={() => setFiltersOpen(true)} activeCount={bookingActiveCount} />
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
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Departure <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Amount <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Booking date <SortIcon /></button>
                  </th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50/70 px-6 py-3 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-sm text-slate-400">
                      No bookings match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((b, i) => {
                  return (
                  <motion.tr
                    key={b.ref}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                    onClick={() => setOpenRef(b.ref)}
                    className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50/60"
                  >
                    <td className="relative whitespace-nowrap px-6 py-4 align-middle">
                      <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
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
                      {/* A lapsed Pending booking reads as its own terminal
                          state: one gray "Expired" chip, no countdown — the
                          remaining time is meaningless once it's zero. */}
                      {b.status === "Pending" && isExpired(b.paymentExpiresAt, now) ? (
                        <span className="inline-flex items-center whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          Expired
                        </span>
                      ) : (
                        <>
                          <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[b.status]}`}>
                            {statusLabel[b.status]}
                          </span>
                          {b.status === "Pending" && b.paymentExpiresAt && (
                            <div className="mt-1 flex items-center gap-1 text-[10.5px] font-medium text-slate-400">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                              {formatExpiry(b.paymentExpiresAt, now)}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="text-[13.5px] font-semibold tracking-tight text-slate-900">{b.ticketholder}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <div className="text-[13px] font-bold tracking-tight text-slate-900">{b.routeOriginCode}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">({b.routeOriginCity})</div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-300">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight text-slate-900">{b.routeDestinationCode}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">({b.routeDestinationCity})</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className="truncate text-[13px] font-medium tracking-tight text-slate-900">{b.vesselName}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">{b.pax}</span>
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
                      className="sticky right-0 z-10 whitespace-nowrap bg-white/70 px-6 py-4 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors duration-150 group-hover:bg-slate-50/70 has-[[role=menu]]:z-30"
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
                          // Mark as Paid — only for unpaid Pending bookings.
                          // Moves them into Under Review (Submitted).
                          {
                            label: "Mark as Paid",
                            disabled: b.status !== "Pending",
                            onClick: () => handleMarkPaid(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                              </svg>
                            ),
                          },
                          // Approve — only meaningful on Submitted bookings
                          // (paid, awaiting approval).
                          {
                            label: "Approve",
                            disabled: b.status !== "Submitted",
                            onClick: () => handleApprove(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M5 12l5 5 9-11" />
                              </svg>
                            ),
                          },
                          // Refund — only after the booking has been marked To Refund.
                          {
                            label: "Refund",
                            disabled: b.status !== "To Refund",
                            onClick: () => setRefundTarget(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M3 12a9 9 0 1 0 3-6.7" />
                                <path d="M3 4v5h5" />
                              </svg>
                            ),
                          },
                          // Cancel — flags the booking (and its tickets) For Refund.
                          // Locked once already For Refund or refunded.
                          {
                            label: "Cancel booking",
                            danger: true,
                            disabled: b.status === "To Refund" || b.status === "Refunded",
                            onClick: () => setCancelTarget(b.ref),
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
        onRefund={(ref) => { setOpenRef(null); setRefundTarget(ref); }}
        onMarkPaid={(ref) => { handleMarkPaid(ref); }}
        onEdit={(init) => { if (openBooking) setEditTarget({ ref: openBooking.ref, init }); }}
        copiedTicket={copiedTicket}
        onCopyTicket={handleCopyTicket}
        copiedRef={copiedRef}
        onCopyRef={handleCopyRef}
      />

      <ApproveBookingDialog
        booking={approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={(result) => {
          if (!approveTarget) return;
          commitApproval(approveTarget.ref, result);
          setApproveTarget(null);
          setOpenRef(null);
        }}
      />

      <RefundConfirmDialog
        bookingRef={refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={(remarks) => {
          if (!refundTarget) return;
          handleRefund(refundTarget, remarks);
          setRefundTarget(null);
        }}
      />

      <CancelConfirmDialog
        bookingRef={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (!cancelTarget) return;
          handleCancel(cancelTarget);
          setCancelTarget(null);
        }}
      />

      <EditEntityDialog
        open={!!editTarget}
        init={editTarget?.init ?? null}
        locked={editTarget ? !canEditBooking(
          (bookings ?? []).find((b) => b.ref === editTarget.ref)?.status ?? "Submitted"
        ) : false}
        lockedReason="This booking has settled and can no longer be edited."
        onClose={() => setEditTarget(null)}
        onSavePassenger={(patch) => {
          if (editTarget?.init.kind === "passenger") handleSavePassenger(editTarget.ref, editTarget.init.ticket.id, patch);
        }}
        onSaveVehicle={(patch) => {
          if (editTarget) handleSaveVehicle(editTarget.ref, patch);
        }}
      />

      <FiltersDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        activeCount={bookingActiveCount}
        fields={[
          { kind: "select", key: "origin", label: "Origin", value: originFilter, options: originOptions, onChange: setOriginFilter, defaultValue: "all" },
          { kind: "select", key: "destination", label: "Destination", value: destinationFilter, options: destinationOptions, onChange: setDestinationFilter, defaultValue: "all" },
          { kind: "select", key: "vessel", label: "Vessel", value: vesselFilter, options: vesselOptions, onChange: setVesselFilter, defaultValue: "all" },
          { kind: "select", key: "status", label: "Status", value: statusFilter, onChange: (v) => setStatusFilter(v as "all" | BookingStatus), defaultValue: "all",
            options: [
              { value: "all", label: "All status" },
              { value: "Pending", label: "Pending" },
              { value: "Confirmed", label: "Confirmed" },
              { value: "Submitted", label: "Under Review" },
              { value: "To Refund", label: "For Refund" },
              { value: "Refunded", label: "Refunded" },
            ] },
          { kind: "dateRange", key: "date", label: "Booking date", value: dateRange, onChange: setDateRange, defaultValue: defaultDateRange },
        ]}
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
  onConfirm: (result: {
    bookingRefNo: string;
    vehicleTicketNo?: string;
    tickets: Record<string, { status: "Issued"; number?: string; note?: string }>;
  }) => void;
}) {
  // The booking is Under Review (Submitted); its tickets awaiting approval are
  // any that aren't already terminal (cancelled/refunded). Approving issues
  // each one. A ticket that's already Issued still needs its number confirmed
  // here, but pre-fills below.
  const pending = useMemo(
    () => (booking ? booking.tickets.filter((t) => t.status !== "Cancelled" && t.status !== "Refunded") : []),
    [booking]
  );
  const hasVehicle = !!booking?.vehicle;
  // Approving issues every pending ticket — there's no per-ticket status
  // choice here (tickets are already paid). One booking reference number for
  // the whole booking, one number per passenger ticket, plus a vehicle ticket
  // number when the booking carries a vehicle. Notes stay per-passenger.
  const [bookingRefNo, setBookingRefNo] = useState("");
  const [vehicleTicketNo, setVehicleTicketNo] = useState("");
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!booking) return;
    // Pre-fill anything already captured.
    setBookingRefNo(booking.bookingRefNo ?? "");
    setVehicleTicketNo(booking.vehicle?.ticketNumber ?? "");
    setNumbers(Object.fromEntries(pending.map((t) => [t.id, t.ticketNumber ?? ""])));
    setNotes(Object.fromEntries(pending.map((t) => [t.id, t.note ?? ""])));
  }, [booking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Approval needs: the booking reference, every passenger ticket number, and
  // the vehicle ticket number when the booking has a vehicle.
  const ready =
    bookingRefNo.trim().length > 0 &&
    pending.length > 0 &&
    pending.every((t) => (numbers[t.id] ?? "").trim().length > 0) &&
    (!hasVehicle || vehicleTicketNo.trim().length > 0);
  const alreadyPaid = booking ? booking.tickets.length - pending.length : 0;

  const commit = () => {
    if (!ready) return;
    const tickets: Record<string, { status: "Issued"; number?: string; note?: string }> = {};
    pending.forEach((t) => {
      const note = (notes[t.id] ?? "").trim();
      tickets[t.id] = { status: "Issued", number: numbers[t.id].trim(), note: note || undefined };
    });
    onConfirm({
      bookingRefNo: bookingRefNo.trim(),
      vehicleTicketNo: hasVehicle ? vehicleTicketNo.trim() : undefined,
      tickets,
    });
  };

  const ctaLabel = pending.length > 0 ? `Confirm · ${pending.length} issued` : "Confirm";

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
              <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">Approve booking</h2>
              <p className="text-[12px] text-slate-500">
                <span className="font-mono font-medium tabular-nums text-slate-700">{booking?.ref}</span>
                {" · "}Enter each passenger&apos;s ticket number to issue.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {pending.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-500">All tickets in this booking are already settled.</p>
          ) : (
            <>
              {/* Single booking reference for the whole booking. */}
              <div className="mb-4">
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Booking reference #</label>
                <input
                  type="text"
                  value={bookingRefNo}
                  onChange={(e) => setBookingRefNo(e.target.value)}
                  placeholder="e.g. BREF001"
                  aria-label="Booking reference number"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[13px] tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Vehicle ticket number — sits right after the booking reference,
                  before the passenger tickets. Only when there's a vehicle. */}
              {hasVehicle && (
                <div className="mb-4">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    Vehicle ticket #
                    <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">
                      {booking?.vehicle?.label ?? booking?.vehicle?.class}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={vehicleTicketNo}
                    onChange={(e) => setVehicleTicketNo(e.target.value)}
                    placeholder="e.g. VTKT001"
                    aria-label="Vehicle ticket number"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[13px] tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              )}

              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Passenger tickets</div>
              <ul className="space-y-2.5">
              {pending.map((t, i) => (
                <li key={t.id} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 font-mono text-[11px] font-semibold tabular-nums text-slate-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.fareClass}</div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={numbers[t.id] ?? ""}
                      onChange={(e) => setNumbers((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      placeholder="Ticket number"
                      aria-label={`Ticket number for ${t.name}`}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[12.5px] tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <textarea
                      value={notes[t.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      rows={2}
                      placeholder="Note (optional)"
                      aria-label={`Note for ${t.name}`}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] leading-relaxed text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </li>
              ))}
              </ul>
            </>
          )}
          {alreadyPaid > 0 && (
            <p className="mt-3 text-[11.5px] text-slate-400">
              {alreadyPaid} ticket{alreadyPaid === 1 ? "" : "s"} already settled — unaffected.
            </p>
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
            className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-emerald-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────── CancelConfirmDialog ───────────
// Cancelling cascades to every non-terminal ticket in the booking and queues
// the amount for return, so the copy states that consequence instead of asking
// "are you sure". It deliberately avoids naming seats or counts — a booking on
// an already-departed voyage releases nothing, so any such claim would be wrong
// for that case. The dismiss button says "Keep booking" so it can't be misread
// as the destructive action sitting next to it.
function CancelConfirmDialog({
  bookingRef,
  onClose,
  onConfirm,
}: {
  bookingRef: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={!!bookingRef} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <circle cx="12" cy="12" r="9" />
              <path d="M6 6l12 12" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
              Cancel booking &lsquo;{bookingRef}&rsquo;?
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
              This marks the booking For Refund. The payout is processed separately.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Cancel booking
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────── Refund confirm dialog ───────────
// Marking a booking Refunded is money leaving the platform, so it's gated
// behind an explicit confirmation that also captures a required remark (the
// reason / payout reference) for the activity log. Confirm stays disabled
// until a remark is entered.
function RefundConfirmDialog({
  bookingRef,
  onClose,
  onConfirm,
}: {
  bookingRef: string | null;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [touched, setTouched] = useState(false);

  // Reset the field whenever a new booking is targeted.
  useEffect(() => {
    if (bookingRef) { setRemarks(""); setTouched(false); }
  }, [bookingRef]);

  const valid = remarks.trim().length > 0;
  const submit = () => {
    if (!valid) { setTouched(true); return; }
    onConfirm(remarks);
  };

  return (
    <Modal open={!!bookingRef} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-200/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <rect x="2.5" y="6" width="19" height="13" rx="2" />
              <path d="M12 9v5m0 0-2-2m2 2 2-2" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Mark this booking as &lsquo;Refunded&rsquo;?</h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
              Booking <span className="font-semibold text-slate-700">&lsquo;{bookingRef}&rsquo;</span> will be marked{" "}
              <span className="font-semibold text-brand-600">Refunded</span>.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[12px] font-semibold text-slate-700">
            Remarks <span className="text-rose-500">*</span>
          </label>
          <textarea
            autoFocus
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Enter refund remarks…"
            className={
              "mt-1.5 w-full resize-none rounded-lg border px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 " +
              (touched && !valid
                ? "border-rose-300 focus:ring-rose-200"
                : "border-slate-200 focus:border-brand-400 focus:ring-brand-200")
            }
          />
          {touched && !valid && (
            <p className="mt-1 text-[11.5px] font-medium text-rose-500">Remarks are required before confirming.</p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={submit}
            className={
              "rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition-colors " +
              (valid ? "bg-brand-500 hover:bg-brand-600" : "cursor-not-allowed bg-brand-300")
            }
          >
            Mark Refunded
          </button>
        </div>
      </div>
    </Modal>
  );
}

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
  onMarkPaid,
  onEdit,
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
  onMarkPaid: (ref: string) => void;
  onEdit: (init: EditEntityInit) => void;
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
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
            className="flex max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70"
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
                  {/* Lapsed Pending → a single gray "Expired" chip (see the
                      table cell above for the same treatment). */}
                  {booking.status === "Pending" && isExpired(booking.paymentExpiresAt) ? (
                    <span className="inline-flex items-center whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Expired
                    </span>
                  ) : (
                    <>
                      <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[booking.status]}`}>
                        {statusLabel[booking.status]}
                      </span>
                      {booking.status === "Pending" && booking.paymentExpiresAt && (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                          {formatExpiry(booking.paymentExpiresAt)}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <h2 className="mt-1.5 truncate text-[17px] font-semibold tracking-tight text-slate-900">{booking.ticketholder}</h2>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Booked {fmtDate(booking.bookingDate)} · {booking.pax} {booking.pax === 1 ? "passenger" : "passengers"}
                </p>
                {booking.bookingRefNo && (
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    Booking ref. <span className="font-mono font-semibold tabular-nums text-slate-700">{booking.bookingRefNo}</span>
                  </p>
                )}
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
                    {booking.vehicle ? (
                      <>
                        <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">
                          {booking.vehicle.make} {booking.vehicle.model}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-400">{booking.vehicle.class}</div>
                      </>
                    ) : (
                      <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">
                        <span className="font-normal text-slate-300">—</span>
                      </div>
                    )}
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
                  Submitted → Approve (primary) + ⋯ menu (Cancel / Refund)
                  Approved  → Cancel (ghost rose)
                  Cancelled → no destructive actions */}
            <DialogFooter
              booking={booking}
              onClose={onClose}
              onCancel={onCancel}
              onApprove={onApprove}
              onRefund={onRefund}
              onMarkPaid={onMarkPaid}
              onEdit={onEdit}
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
//   - Submitted bookings need explicit approval → Approve (primary) + ⋯ menu
//     with To Refund + Refund + Cancel so the destructive actions don't crowd
//     the row.
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
  onMarkPaid,
  onEdit,
}: {
  booking: Booking;
  onClose: () => void;
  onCancel: (ref: string) => void;
  onApprove: (ref: string) => void;
  onRefund: (ref: string) => void;
  onMarkPaid: (ref: string) => void;
  onEdit: (init: EditEntityInit) => void;
}) {
  // Single status picker collapses Approve/Refund/Cancel into a ClickUp-style
  // dropdown (matching the tickets dialog). Each selection fires the matching
  // mutation and closes the dialog so the user gets feedback in the table.
  // Cancel is the only trigger for the "For Refund" state — there's no separate
  // "Mark For Refund" action.
  const onChangeStatus = (next: BookingStatus) => {
    if (next === "Confirmed") onApprove(booking.ref);
    else if (next === "Cancelled") onCancel(booking.ref);
    else if (next === "Refunded") onRefund(booking.ref);
    else if (next === "Submitted") onMarkPaid(booking.ref); // Pending → paid (Under Review)
    onClose();
  };

  const editable = canEditBooking(booking.status);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100"
        >
          Close
        </button>
        <EditBookingButton booking={booking} disabled={!editable} onEdit={onEdit} />
      </div>

      <div className="flex items-center gap-2">
        <BookingStatusPicker current={booking.status} onChange={onChangeStatus} />
      </div>
    </div>
  );
}

// ─────────── EditBookingButton ───────────
// The single footer entry point into the shared editor. A booking can hold
// several passengers (± a vehicle), so this opens a small picker listing each
// editable entity; selecting one hands its init object up to the page, which
// renders the shared EditEntityDialog. Disabled (with a tooltip) once the
// booking has settled.
function EditBookingButton({ booking, disabled, onEdit }: {
  booking: Booking;
  disabled: boolean;
  onEdit: (init: EditEntityInit) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        title={disabled ? "Settled bookings can't be edited" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors " +
          (disabled
            ? "cursor-not-allowed text-slate-300"
            : "text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100")
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Edit booking
      </button>

      {open && !disabled && (
        <>
          <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" />
          <div className="absolute bottom-[calc(100%+6px)] left-0 z-20 w-64 overflow-hidden rounded-xl bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.16)] ring-1 ring-slate-200">
            {/* Passengers group — brand eyebrow. */}
            <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-brand-500"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-600">Passengers</span>
            </div>
            {/* Cancelled and customer-removed passengers are excluded — both
                are settled/pending-refund records, not editable rows. They
                remain visible in the booking roster + activity log. */}
            {booking.tickets.filter((t) => t.status !== "Cancelled" && !t.removedByUser).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setOpen(false); onEdit({ kind: "passenger", ticket: t }); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-slate-700 hover:bg-brand-50/50"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">{PAX_TYPE_LABELS[t.paxType]}</span>
                </span>
              </button>
            ))}
            {booking.vehicle && (
              <>
                {/* Vehicle group — indigo eyebrow. */}
                <div className="mt-0.5 flex items-center gap-1.5 border-t border-slate-100 px-3 pb-1 pt-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-indigo-500"><path d="M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5" /><path d="M5 17h14" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /></svg>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-600">Vehicle</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setOpen(false); onEdit({ kind: "vehicle", vehicle: booking.vehicle! }); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-slate-700 hover:bg-indigo-50/50"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5" /><path d="M5 17h14" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{[booking.vehicle.make, booking.vehicle.model].filter(Boolean).join(" ") || booking.vehicle.class}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">{booking.vehicle.plateNumber}</span>
                  </span>
                </button>
              </>
            )}
          </div>
        </>
      )}
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

  const canPick = (s: BookingStatus): boolean => {
    if (s === current) return false;
    // Refunded is fully terminal — nothing left to do.
    if (current === "Refunded") return false;
    // Refund must be preceded by "To Refund" — it's only pickable from there.
    if (s === "Refunded") return current === "To Refund";
    // A booking already flagged To Refund can only proceed to the actual refund.
    if (current === "To Refund") return false;
    // "Mark as Paid" moves an unpaid Pending booking into Under Review — only
    // valid from Pending.
    if (s === "Submitted") return current === "Pending";
    // A Pending (unpaid) booking must be paid before it can be approved.
    if (s === "Confirmed" && current === "Pending") return false;
    return true;
  };

  const options: { value: BookingStatus; label: string }[] = [
    { value: "Submitted",   label: "Mark as Paid" },
    { value: "Confirmed",   label: "Approve" },
    { value: "Refunded",    label: "Refund" },
    { value: "Cancelled",   label: "Cancel booking" },
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
            className="absolute bottom-full right-0 z-30 mb-2 w-60 overflow-hidden rounded-xl bg-white p-1 shadow-[0_18px_44px_-16px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70"
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
                    onClick={() => { if (!disabled) { onChange(o.value); setOpen(false); } }}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors duration-100 ${
                      disabled
                        ? "cursor-not-allowed text-slate-300"
                        : o.value === "Cancelled"
                          ? "text-rose-600 hover:bg-rose-50"
                          : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate font-medium">{o.label}</span>
                    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${statusTone[o.value]} ${disabled ? "opacity-50" : ""}`}>
                      {statusLabel[o.value]}
                    </span>
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
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_44px_38px_72px_64px_80px_20px] items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
        <span>Ticket #</span>
        <span>Passenger</span>
        <span>Gender</span>
        <span>Age</span>
        <span>Type</span>
        <span>Class</span>
        <span>Status</span>
        <span />
      </div>
      <ul className="divide-y divide-slate-100">
        {tickets.map((t) => {
          const expanded = openId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpenId((prev) => (prev === t.id ? null : t.id))}
                aria-label={expanded ? "Collapse passenger details" : "Expand passenger details"}
                aria-expanded={expanded}
                className="grid w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)_44px_38px_72px_64px_80px_20px] items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-50/80"
              >
                <span className="truncate font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{t.ticketNumber ?? "—"}</span>
                <div className="min-w-0">
                  <span className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{t.name || "—"}</span>
                  {t.removedByUser && (
                    <span className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium text-amber-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0"><circle cx="9" cy="8" r="3" /><path d="M4 20c0-3 2.2-5 5-5s5 2 5 5" /><path d="M16 11h5" /></svg>
                      Removed by customer
                    </span>
                  )}
                </div>
                <span className="text-[12px] font-medium tracking-tight text-slate-700">{t.sex}</span>
                <span className="font-mono text-[12px] tabular-nums text-slate-700">{t.age}</span>
                <span className="text-[12px] font-medium tracking-tight text-slate-700">{PAX_TYPE_LABELS[t.paxType]}</span>
                <span className="text-[12px] font-medium tracking-tight text-slate-700">{t.fareClass}</span>
                <span className={`inline-flex w-fit items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${ticketStatusTone[t.status]}`}>
                  {ticketStatusLabel[t.status]}
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

                      {t.note && (
                        <div className="col-span-2">
                          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Note</div>
                          <div className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">{t.note}</div>
                        </div>
                      )}

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
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const [open, setOpen] = useState(false);
  if (!v) return null;
  const compedCount = booking.tickets.filter((t) => t.comped).length;

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      {/* Header row — matches the passenger table's column vocabulary. */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,2fr)_80px_20px] items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
        <span>Ticket #</span>
        <span>Vehicle</span>
        <span>Plate</span>
        <span>Type</span>
        <span>Status</span>
        <span />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,2fr)_80px_20px] items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-50/80"
      >
        <span className="truncate font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{v.ticketNumber ?? "—"}</span>
        <span className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{v.make} {v.model}</span>
        <span className="truncate font-mono text-[12px] tabular-nums text-slate-700">{v.plateNumber || "—"}</span>
        <span className="truncate text-[12px] font-medium tracking-tight text-slate-700">{v.class}</span>
        <span className={`inline-flex w-fit items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${statusTone[booking.status]}`}>
          {statusLabel[booking.status]}
        </span>
        <span className={`grid h-6 w-6 place-items-center justify-self-end text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="veh-expand" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="overflow-hidden bg-slate-50/60">
            <div className="grid grid-cols-3 gap-x-6 gap-y-4 border-t border-dashed border-slate-200 px-4 py-4 text-[12px]">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Type</div>
                <div className="mt-0.5 text-[12.5px] font-semibold tracking-tight text-slate-900">{v.class}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Plate No.</div>
                <div className="mt-0.5 font-mono text-[12.5px] font-bold tabular-nums tracking-[0.04em] text-slate-900">{v.plateNumber || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Free seat/s</div>
                <div className="mt-0.5 font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
                  {compedCount} <span className="text-slate-400">/ {v.includedSeats}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Make / Model</div>
                <div className="mt-0.5 text-[12.5px] font-semibold tracking-tight text-slate-900">{v.make} {v.model}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Year</div>
                <div className="mt-0.5 font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">{v.year}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Label</div>
                <div className="mt-0.5 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{v.label || "—"}</div>
              </div>

              {/* Requirements — OR / CR / Vehicle Photo. */}
              <div className="col-span-3">
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Valid ID Photos</div>
                <ul className="mt-1.5 space-y-1.5 text-[12px]">
                  <RequirementRow label="Official Receipt (OR)" required uploaded={!!v.orUrl} previewUrl={v.orUrl} onPreview={() => v.orUrl && setPreview({ title: "Official Receipt (OR)", url: v.orUrl })} />
                  <RequirementRow label="Certificate of Registration (CR)" required uploaded={!!v.crUrl} previewUrl={v.crUrl} onPreview={() => v.crUrl && setPreview({ title: "Certificate of Registration (CR)", url: v.crUrl })} />
                  <RequirementRow label="Vehicle Photo" required uploaded={!!v.photoUrl} previewUrl={v.photoUrl} onPreview={() => v.photoUrl && setPreview({ title: "Vehicle Photo", url: v.photoUrl })} />
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DocumentPreviewDialog doc={preview} onClose={() => setPreview(null)} />
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
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
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
  const v = booking.vehicle;
  // List every passenger (matching the roster + pax count). Comped seats ride
  // free under the vehicle fare, so they show ₱0 / Free rather than being hidden.
  const passengers = booking.tickets;
  const passengerSubtotal = passengers.reduce((s, t) => s + t.fare, 0);

  // Add-ons + service fee aren't captured per booking yet — sample lines so the
  // breakdown mirrors the customer Review & Pay screen. Deterministic per ref.
  const addOns = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < booking.ref.length; i++) { h ^= booking.ref.charCodeAt(i); h = Math.imul(h, 16777619); }
    const lead = booking.ticketholder;
    const all = [
      { label: "Travel insurance (1×)", price: 50 },
      { label: `${lead} · Extra cabin bag`, price: 100 },
      { label: `${lead} · Fragile handling`, price: 150 },
    ];
    return all.slice(0, (h >>> 0) % (all.length + 1)); // 0..3 add-ons
  }, [booking.ref, booking.ticketholder]);

  // Totals come from the payment provider record so the displayed breakdown
  // reconciles with what the gateway actually charged. The itemized lines
  // above are the customer-facing composition of that subtotal.
  const pay = booking.payment;
  const serviceFee = pay.serviceFee;
  const subtotal = pay.subTotal;
  const total = pay.total;
  const addOnSubtotal = addOns.reduce((sum, addOn) => sum + addOn.price, 0);
  // The customer-facing service fee is shared by each passenger and vehicle
  // line. Keep cents on the evenly split rows and place the rounding remainder
  // on the vehicle so all displayed shares reconcile exactly to the gateway fee.
  const feeLineCount = passengers.length + (v ? 1 : 0);
  const sharedServiceFee = feeLineCount
    ? Math.floor((serviceFee * 100) / feeLineCount) / 100
    : 0;
  const vehicleServiceFee = v
    ? Math.max(0, serviceFee - sharedServiceFee * passengers.length)
    : 0;
  const vehicleBaseFare = v
    ? Math.max(0, subtotal - passengerSubtotal - addOnSubtotal)
    : 0;
  const vehicleTotal = vehicleBaseFare + vehicleServiceFee;

  const money = (n: number) => `₱${n.toLocaleString()}`;
  const signed = (n: number) => (n < 0 ? `−₱${Math.abs(n).toLocaleString()}` : `₱${n.toLocaleString()}`);
  // Payment-provider status pill (Initial / Pending / Completed / Failed /
  // Refunded) — distinct from the internal booking lifecycle.
  const statusTone =
    pay.status === "Completed" ? "bg-emerald-100 text-emerald-800"
    : pay.status === "Pending" || pay.status === "Initial" ? "bg-amber-100 text-amber-800"
    : pay.status === "Failed" ? "bg-rose-100 text-rose-700"
    : "bg-slate-100 text-slate-500";

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Payment Information</h3>
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone}`}>
          {pay.status}
        </span>
      </div>

      {/* Provider trail — reference, gateway, method, and the provider's own
          transaction reference. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-100 px-4 py-3">
        <PayMeta label="Payment reference" value={pay.reference} mono />
        <PayMeta label="Payment provider" value={pay.provider} />
        <PayMeta label="Payment method" value={pay.method} />
        <PayMeta label="Provider reference" value={pay.providerReference} mono />
      </div>

      <div className="px-4 py-3">
        {/* Passengers — full per-pax breakdown (base · discount · service fee)
            so admins see the transparent amounts, not just a net "Free". */}
        <PaySectionLabel icon="passenger" text={`Passengers (${passengers.length})`} />
        <div className="mt-2 space-y-3">
          {passengers.map((t) => {
            const b = paxFareBreakdown(t, sharedServiceFee);
            return (
              <div key={t.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-semibold tracking-tight text-slate-900">Passenger · {t.name}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-slate-900">{money(b.total)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">{PAX_TYPE_LABELS[t.paxType]} · {t.fareClass}</div>
                <dl className="mt-1 space-y-0.5 text-[11.5px]">
                  <div className="flex justify-between"><dt className="text-slate-400">Base Fare</dt><dd className="font-mono tabular-nums text-slate-500">{money(b.base)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Discount</dt><dd className="font-mono tabular-nums text-rose-500">{b.discount > 0 ? signed(-b.discount) : money(0)}</dd></div>
                  {b.serviceFee > 0 && (
                    <div className="flex justify-between"><dt className="text-slate-400">Service Fee</dt><dd className="font-mono tabular-nums text-slate-500">{money(b.serviceFee)}</dd></div>
                  )}
                </dl>
              </div>
            );
          })}
        </div>

        {/* Vehicles */}
        {v && (
          <>
            <div className="mt-4"><PaySectionLabel icon="vehicle" text="Vehicles (1)" /></div>
            <div className="mt-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium tracking-tight text-slate-900">{v.year} {v.make} {v.model}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{v.class} · {v.plateNumber}</div>
                </div>
                <div className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-slate-900">{money(vehicleTotal)}</div>
              </div>
              <dl className="mt-1 space-y-0.5 text-[11.5px]">
                <div className="flex justify-between"><dt className="text-slate-400">Base Fare</dt><dd className="font-mono tabular-nums text-slate-500">{money(vehicleBaseFare)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Service Fee</dt><dd className="font-mono tabular-nums text-slate-500">{money(vehicleServiceFee)}</dd></div>
              </dl>
            </div>
          </>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <>
            <div className="mt-4"><PaySectionLabel icon="addon" text={`Add-ons (${addOns.length})`} /></div>
            <dl className="mt-1.5 space-y-2">
              {addOns.map((a) => (
                <div key={a.label} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <dt className="min-w-0 flex-1 truncate text-slate-900">{a.label}</dt>
                  <dd className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-slate-900">{money(a.price)}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {/* Sub total + service fee */}
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-[12.5px]">
          <div className="flex items-baseline justify-between">
            <span className="text-slate-600">Sub total</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">{money(subtotal)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-600">Service fee</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">{money(serviceFee)}</span>
          </div>
        </div>
      </div>

      {/* Total amount + remarks */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-500">Total amount</span>
          <span className="font-mono text-[16px] font-bold tabular-nums tracking-tight text-brand-600">{money(total)}</span>
        </div>
        <div className="mt-3">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-500">Remarks</div>
          <div className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">{pay.remarks || "—"}</div>
        </div>
      </div>
    </div>
  );
}

// Label + value pair for the payment provider trail (reference, provider, …).
function PayMeta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className={"mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900" + (mono ? " font-mono tabular-nums" : "")}>{value}</div>
    </div>
  );
}

// Small section label with an icon, used inside Payment Information.
function PaySectionLabel({ icon, text }: { icon: "passenger" | "vehicle" | "addon"; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400">
        {icon === "passenger" && <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></>}
        {icon === "vehicle" && <><path d="M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5" /><path d="M3 13h18v4H3z" /><circle cx="7" cy="17.5" r="1.5" /><circle cx="17" cy="17.5" r="1.5" /></>}
        {icon === "addon" && <><path d="M4 8h16l-1.2 9.3A2 2 0 0 1 16.8 19H7.2a2 2 0 0 1-2-1.7L4 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>}
      </svg>
      {text}
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
