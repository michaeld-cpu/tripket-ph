"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { LogoTile } from "@/components/ShippingLineSwitcher";
import { TableSkeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import { useToast } from "@/components/ToastContext";
import {
  deriveBookings,
  reviveBookings,
  mergeSeededBookings,
  statusTone,
  statusLabel,
  canEditBooking,
  updateVehicle,
  type Booking,
  type VehiclePatch,
} from "@/lib/bookings-data";
import { loadScopedVoyages } from "@/lib/line-scope";
import { loadStore, saveStore } from "@/lib/persisted-store";
import EditEntityDialog from "@/components/EditEntityDialog";

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
  year: number;
  status: Booking["status"];
  bookingRefNo?: string;
  email: string;
  orUrl: string;
  crUrl: string;
  photoUrl?: string;
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
      year: b.vehicle!.year,
      status: b.status,
      bookingRefNo: b.bookingRefNo,
      email: b.contactEmail,
      orUrl: b.vehicle!.orUrl,
      crUrl: b.vehicle!.crUrl,
      photoUrl: b.vehicle!.photoUrl,
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [editRef, setEditRef] = useState<string | null>(null);

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

  // Booking whose vehicle is being edited — the editor works off the real
  // Vehicle object (not the flattened row) so it reads/writes every field.
  const editBooking = useMemo(
    () => (bookings ?? []).find((b) => b.ref === editRef) ?? null,
    [bookings, editRef]
  );

  const saveVehicle = (ref: string, patch: VehiclePatch) => {
    setBookings((prev) => {
      if (!prev) return prev;
      const next = updateVehicle(prev, ref, patch, "Someone");
      saveStore("bookings", active.id, next);
      return next;
    });
    setEditRef(null);
    showToast("Vehicle details updated");
  };
  const openRow = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);
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
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Vehicle &amp; class</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Route</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Departure</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Amount</th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50/70 px-6 py-3 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">No vehicle tickets match your search.</td></tr>
                )}
                {pageRows.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }} onClick={() => setOpenId(r.id)} className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      {r.ticketNumber ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{r.ticketNumber}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleCopy(r.ticketNumber!); }} aria-label={`Copy ${r.ticketNumber}`} className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
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
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleCopy(r.bookingRef); }} aria-label={`Copy ${r.bookingRef}`} className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                          {copiedId === r.bookingRef ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-600"><path d="M5 12l5 5 9-11" /></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="text-[13px] font-semibold tracking-tight text-slate-900">{r.make} {r.model}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{r.vehicleClass}</div>
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
                    <td className="whitespace-nowrap px-6 py-4 align-middle font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">₱{r.amount.toLocaleString()}</td>
                    <td className="sticky right-0 z-10 whitespace-nowrap bg-white/70 px-6 py-4 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors group-hover:bg-slate-50/70" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        ariaLabel={`Actions for ${r.id}`}
                        items={[{
                          label: "View booking",
                          onClick: () => { window.location.href = `/bookings?ref=${r.bookingRef}`; },
                          icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>),
                        }, {
                          label: "Edit vehicle",
                          disabled: !canEditBooking(r.status),
                          onClick: () => setEditRef(r.bookingRef),
                          icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>),
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

      <VehicleDetailDialog row={openRow} lineName={active.name} onClose={() => setOpenId(null)} />

      <EditEntityDialog
        open={!!editBooking?.vehicle}
        init={editBooking?.vehicle ? { kind: "vehicle", vehicle: editBooking.vehicle } : null}
        locked={editBooking ? !canEditBooking(editBooking.status) : false}
        onClose={() => setEditRef(null)}
        onSavePassenger={() => { /* not used for vehicle tickets */ }}
        onSaveVehicle={(patch) => { if (editRef) saveVehicle(editRef, patch); }}
      />
    </div>
  );
}

// ─────────── Vehicle detail dialog ───────────
function VehicleDetailDialog({ row, lineName, onClose }: { row: VehicleRow | null; lineName: string; onClose: () => void }) {
  const { active } = useShippingLine();
  if (!row) return null;
  return (
    <Modal open={!!row} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex max-h-[88vh] flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{row.ticketNumber ?? row.id}</span>
              <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[row.status]}`}>{statusLabel[row.status]}</span>
            </div>
            <h2 className="mt-1.5 truncate text-[17px] font-semibold tracking-tight text-slate-900">{row.email}</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">Under booking <span className="font-mono font-medium tabular-nums text-slate-700">{row.bookingRefNo ?? row.bookingRef}</span></p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Route summary */}
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-center justify-center gap-3">
                <div className="min-w-0 flex-1 text-center">
                  <div className="truncate font-mono text-[20px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">{row.routeOriginCode}</div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-500">{row.routeOriginCity}</div>
                </div>
                <svg viewBox="0 0 48 12" className="h-3 w-10 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 6 H38" strokeDasharray="3 3" /><path d="M38 2 L44 6 L38 10" /></svg>
                <div className="flex flex-col items-center gap-1">
                  <span className="shrink-0"><LogoTile line={active} size={32} /></span>
                  <span className="max-w-[120px] truncate text-[10px] font-medium text-slate-500">{lineName}</span>
                </div>
                <svg viewBox="0 0 48 12" className="h-3 w-10 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 6 H38" strokeDasharray="3 3" /><path d="M38 2 L44 6 L38 10" /></svg>
                <div className="min-w-0 flex-1 text-center">
                  <div className="truncate font-mono text-[20px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">{row.routeDestinationCode}</div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-500">{row.routeDestinationCity}</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
              <div className="px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Departure</div>
                <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{fmtDate(row.departureDate)}</div>
                <div className="mt-0.5 font-mono text-[11.5px] font-medium tabular-nums text-slate-600">{fmtTime(row.departureDate)}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Vessel</div>
                <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{row.vesselName}</div>
              </div>
            </div>
          </div>

          {/* Vehicle */}
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Vehicle</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4 text-[13px]">
              <div>
                <div className="text-[10.5px] text-slate-500">Make &amp; Model</div>
                <div className="mt-0.5 font-semibold tracking-tight text-slate-900">{row.make} {row.model}</div>
              </div>
              <div>
                <div className="text-[10.5px] text-slate-500">Type</div>
                <div className="mt-0.5 font-medium text-slate-900">{row.vehicleClass}</div>
              </div>
              <div>
                <div className="text-[10.5px] text-slate-500">Plate No.</div>
                <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">{row.plateNumber}</div>
              </div>
              <div>
                <div className="text-[10.5px] text-slate-500">Year</div>
                <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">{row.year}</div>
              </div>
            </div>
          </div>

          {/* Valid ID photos */}
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
            <div className="px-4 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Valid ID Photos</div>
            <ul className="space-y-1.5 px-4 pb-4 pt-2 text-[12.5px]">
              <VehicleDocRow label="Official Receipt (OR)" url={row.orUrl} />
              <VehicleDocRow label="Certificate of Registration (CR)" url={row.crUrl} />
              <VehicleDocRow label="Vehicle Photo" url={row.photoUrl} />
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-100">Close</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { window.location.href = `/bookings?ref=${row.bookingRef}`; }} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50">Go to booking</button>
            <button type="button" onClick={() => { window.location.href = `/bookings?ref=${row.bookingRef}`; }} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-white transition-colors hover:bg-brand-700">
              Update status
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="m6 9 6 6 6-6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function VehicleDocRow({ label, url }: { label: string; url?: string }) {
  const uploaded = !!url;
  return (
    <li className="flex items-center gap-3 rounded-lg px-1 py-1.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m8 13 2.5 3L14 12l4 5" /><circle cx="8.5" cy="9" r="1.5" /></svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{label}</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">Required</div>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${uploaded ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {uploaded && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M5 12l5 5 9-11" /></svg>}
        {uploaded ? "Uploaded" : "Missing"}
      </span>
    </li>
  );
}
