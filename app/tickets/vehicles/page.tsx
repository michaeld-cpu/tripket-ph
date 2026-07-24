"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import { useToast } from "@/components/ToastContext";
import {
  deriveBookings,
  reviveBookings,
  mergeSeededBookings,
  statusTone,
  statusLabel,
  type Booking,
} from "@/lib/bookings-data";
import { loadScopedVoyages } from "@/lib/line-scope";
import { loadStore, saveStore } from "@/lib/persisted-store";

const PAGE_SIZE = 10;

// One row per vehicle booked — flattened off each booking that carries a
// vehicle, carrying enough of the booking's identity to stand alone.
type VehicleRow = {
  id: string;
  ticketNumber?: string;
  bookingRef: string;
  ticketholder: string;
  vehicleClass: string;
  vehicleLabel: string;
  plateNumber: string;
  make: string;
  model: string;
  status: Booking["status"];
  routeOriginCode: string;
  routeDestinationCode: string;
  routeOriginCity: string;
  routeDestinationCity: string;
  vesselName: string;
  departureDate: Date;
  amount: number;
};

function flattenVehicles(bookings: Booking[]): VehicleRow[] {
  return bookings
    .filter((b) => b.vehicle)
    .map((b) => ({
      id: `${b.ref}-VEH`,
      ticketNumber: b.vehicle!.ticketNumber,
      bookingRef: b.ref,
      ticketholder: b.ticketholder,
      vehicleClass: b.vehicle!.class,
      vehicleLabel: b.vehicle!.label,
      plateNumber: b.vehicle!.plateNumber,
      make: b.vehicle!.make,
      model: b.vehicle!.model,
      status: b.status,
      routeOriginCode: b.routeOriginCode,
      routeDestinationCode: b.routeDestinationCode,
      routeOriginCity: b.routeOriginCity,
      routeDestinationCity: b.routeDestinationCity,
      vesselName: b.vesselName,
      departureDate: b.departureDate,
      amount: b.amount,
    }));
}

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default function VehicleTicketsPage() {
  const { active, locked } = useShippingLine();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const persisted = loadStore<unknown>("bookings", active.id);
      if (persisted) {
        const revived = reviveBookings(persisted);
        if (revived.length > 0) {
          const voyages = loadScopedVoyages(active.id, locked);
          const merged = mergeSeededBookings(revived, deriveBookings(voyages));
          if (merged.length !== revived.length) saveStore("bookings", active.id, merged);
          setBookings(merged);
          return;
        }
      }
    } catch { /* fall through */ }
    try {
      const voyages = loadScopedVoyages(active.id, locked);
      const t = setTimeout(() => {
        const seeded = deriveBookings(voyages);
        setBookings(seeded);
        saveStore("bookings", active.id, seeded);
      }, 180);
      return () => clearTimeout(t);
    } catch {
      setBookings([]);
    }
  }, [active.id, locked]);

  useEffect(() => { setPage(1); }, [query]);

  const rows = useMemo(() => (bookings ? flattenVehicles(bookings) : []), [bookings]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.ticketNumber ?? ""} ${r.bookingRef} ${r.ticketholder} ${r.plateNumber} ${r.vehicleClass}`.toLowerCase().includes(q),
    );
  }, [rows, query]);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCopy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopiedId(v);
      showToast(`${v} copied`);
      setTimeout(() => setCopiedId((prev) => (prev === v ? null : prev)), 1500);
    } catch { showToast("Failed to copy", "error"); }
  };

  const isEmpty = bookings !== null && rows.length === 0;

  return (
    <div>
      <PageHeader title="Vehicle Tickets" subtitle={active.name} showDateFilter={false} />

      {!bookings ? (
        <TableSkeleton rows={8} />
      ) : isEmpty ? (
        <EmptyState kind="inbox" title="No vehicle tickets yet" body="Vehicle tickets appear here once a booking includes a vehicle." />
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">All vehicle tickets</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span> of {rows.length} tickets
              </p>
            </div>
            <div className="flex w-72 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-brand-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticket, plate, or booking…" className="w-full min-w-0 flex-1 bg-transparent placeholder:text-slate-400 focus:outline-none" />
            </div>
          </div>

          <div className="overflow-x-auto" style={{ scrollbarGutter: "stable" }}>
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Ticket number</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Status</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Ticketholder</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Booking ref</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Route</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Departure</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Vehicle &amp; class</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Amount</th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50 px-6 py-3 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">No vehicle tickets match your search.</td></tr>
                )}
                {pageRows.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }} className="group transition-colors duration-150 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      {r.ticketNumber ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{r.ticketNumber}</span>
                          <button type="button" onClick={() => handleCopy(r.ticketNumber!)} aria-label={`Copy ${r.ticketNumber}`} className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                            {copiedId === r.ticketNumber ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-600"><path d="M5 12l5 5 9-11" /></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300" title="Assigned when the booking is approved">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[r.status]}`}>
                        {statusLabel[r.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle text-[13.5px] font-semibold tracking-tight text-slate-900">{r.ticketholder}</td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{r.bookingRef}</span>
                        <button type="button" onClick={() => handleCopy(r.bookingRef)} aria-label={`Copy ${r.bookingRef}`} className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                          {copiedId === r.bookingRef ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-600"><path d="M5 12l5 5 9-11" /></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <div className="text-[13px] font-bold tracking-tight text-slate-900">{r.routeOriginCode}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">({r.routeOriginCity})</div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-300"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        <div>
                          <div className="text-[13px] font-bold tracking-tight text-slate-900">{r.routeDestinationCode}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">({r.routeDestinationCity})</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle text-[13px] font-semibold tracking-tight text-slate-900">
                      {fmtDate(r.departureDate)}<span className="ml-1.5 font-mono font-medium tabular-nums text-slate-600">{fmtTime(r.departureDate)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="text-[13px] font-semibold tracking-tight text-slate-900">{r.make} {r.model}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{r.vehicleClass}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">₱{r.amount.toLocaleString()}</td>
                    <td className="sticky right-0 z-10 whitespace-nowrap bg-white px-6 py-4 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] transition-colors group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        ariaLabel={`Actions for ${r.id}`}
                        items={[{
                          label: "View booking",
                          onClick: () => { window.location.href = `/bookings?ref=${r.bookingRef}`; },
                          icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>),
                        }]}
                      />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="vehicle tickets" />
        </section>
      )}
    </div>
  );
}
