"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useShippingLine } from "@/components/ShippingLineContext";
import {
  fetchDashboardData,
  type Vessel,
  type VehicleClass,
  type PassengerType,
} from "@/lib/dashboard-data";
import EditVesselModal from "@/components/EditVesselModal";
import DeleteVesselDialog from "@/components/DeleteVesselDialog";
import { Skeleton } from "@/components/Skeleton";

// Shared design tokens — one source of truth for chrome / typography across all cards on this page.
const CARD = "overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70";
const SECTION_HEADER = "border-b border-slate-100 px-5 py-3.5";
const EYEBROW = "text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400";

const statusTone: Record<Vessel["status"], { pill: string; dot: string }> = {
  Active:      { pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60", dot: "bg-emerald-500" },
  Inactive:    { pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/60",      dot: "bg-slate-400"   },
  Maintenance: { pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",       dot: "bg-amber-500"   },
  Retired:     { pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",          dot: "bg-rose-500"    },
};

// Live voyage mock — anchored to today's wall clock, deterministic per vessel id.
function useMockVoyage(vessel: Vessel | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!vessel) return null;
  // 4h voyage anchored ~2h45m before now → vessel is ~70% through
  const departed = new Date(now.getTime() - 2.75 * 60 * 60_000);
  const eta = new Date(now.getTime() + 1.5 * 60 * 60_000);
  const total = eta.getTime() - departed.getTime();
  const elapsed = now.getTime() - departed.getTime();
  const progress = Math.min(1, Math.max(0, elapsed / total));
  const remainingMs = eta.getTime() - now.getTime();
  const remainingH = Math.floor(remainingMs / 3_600_000);
  const remainingM = Math.floor((remainingMs % 3_600_000) / 60_000);

  let h = 0;
  for (let i = 0; i < vessel.id.length; i++) h = (h * 31 + vessel.id.charCodeAt(i)) >>> 0;
  const routes: Array<[string, string, string, string]> = [
    ["CEB", "DGT", "Cebu City", "Dumaguete City"],
    ["MNL", "PPS", "Manila",    "Puerto Princesa"],
    ["BAT", "CAL", "Batangas",  "Calapan"],
    ["MNL", "ILO", "Manila",    "Iloilo"],
    ["MNL", "CEB", "Manila",    "Cebu City"],
  ];
  const route = routes[h % routes.length];
  const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return {
    fromCode: route[0],
    toCode: route[1],
    fromCity: route[2],
    toCity: route[3],
    departedLabel: fmt(departed),
    nowLabel: fmt(now),
    etaLabel: fmt(eta),
    remainingLabel: `${remainingH}h ${String(remainingM).padStart(2, "0")}m`,
    progress,
  };
}

// Mock scheduled-departures history per vessel
function mockSchedule(vesselId: string, routePair: [string, string]) {
  let h = 0;
  for (let i = 0; i < vesselId.length; i++) h = (h * 31 + vesselId.charCodeAt(i)) >>> 0;
  const today = new Date("2026-05-19");
  return Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (4 - i));
    const isToday = i === 4;
    return {
      id: `SCH-${vesselId}-${i}`,
      from: routePair[0],
      to: i % 2 === 1 ? "TAG" : routePair[1],
      date: d,
      time: i % 2 === 0 ? "05:30" : "14:00",
      status: isToday ? (i === 4 ? "Departed" : "En route") : "Arrived",
      sold: 1 + ((h >> (i * 3)) % 8),
      capacity: 200,
    };
  });
}

export default function VesselDetailPage() {
  const params = useParams<{ id: string }>();
  const { active } = useShippingLine();
  const [vessels, setVessels] = useState<Vessel[] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardData(active.id).then((d) => {
      if (!cancelled) setVessels(d.vessels);
    });
    return () => { cancelled = true; };
  }, [active.id]);

  const vessel = vessels?.find((v) => v.id === params.id) ?? null;
  const voyage = useMockVoyage(vessel);
  const isLive = vessel?.status === "Active";

  if (vessels && !vessel) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Link href="/vessels" className="transition-colors duration-150 ease-out hover:text-slate-900">
          Operations
        </Link>
        <span className="text-slate-300">›</span>
        <Link href="/vessels" className="transition-colors duration-150 ease-out hover:text-slate-900">
          Vessels
        </Link>
      </nav>

      {/* Title row — sits above the grid */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/vessels"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </Link>
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
              {vessel?.name ?? <span className="text-slate-300">Loading vessel…</span>}
            </h1>
            {vessel && (
              <p className="text-[12px] text-slate-500">
                {vessel.type} <span className="text-slate-300">·</span>{" "}
                <span className="font-mono">IMO {vessel.imo}</span>
              </p>
            )}
          </div>
        </div>

        {vessel && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Edit
            </button>
          </div>
        )}
      </div>

      {/* ───────────────  MAIN GRID — info LEFT, map RIGHT (full-bleed)  ─────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN — skeleton placeholder while content is being designed */}
        <div className="space-y-4 lg:col-span-7">
          {/* Live voyage skeleton */}
          <section className={CARD}>
            <header className={SECTION_HEADER}>
              <Skeleton className="h-3 w-24" />
            </header>
            <div className="px-5 py-4">
              <div className="grid grid-cols-3 items-end gap-4">
                <div>
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="mt-2 h-3 w-20" />
                  <Skeleton className="mt-1.5 h-5 w-24" />
                </div>
                <div className="flex flex-col items-center">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="mt-2 h-3 w-28" />
                  <Skeleton className="mt-1.5 h-5 w-24" />
                </div>
                <div className="flex flex-col items-end">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="mt-2 h-3 w-24" />
                  <Skeleton className="mt-1.5 h-5 w-24" />
                </div>
              </div>
              <Skeleton className="mt-5 h-[3px] w-full rounded-full" />
            </div>
          </section>

          {/* Specs skeleton */}
          <section className={CARD}>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="mt-2 h-4 w-28" />
                  <Skeleton className="mt-1.5 h-3 w-24" />
                </div>
              ))}
            </div>
          </section>

          {/* Passenger types skeleton */}
          <section className={CARD}>
            <header className={SECTION_HEADER}>
              <Skeleton className="h-3 w-28" />
            </header>
            <ul className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="mt-1.5 h-3 w-56" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </li>
              ))}
            </ul>
          </section>

          {/* Scheduled departures skeleton */}
          <section className={CARD}>
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </header>
            <ul className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="grid grid-cols-[88px_1fr_60px_92px_160px] items-center gap-3 px-5 py-3.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <Skeleton className="h-2.5 w-12" />
                      <Skeleton className="h-2.5 w-12" />
                    </div>
                    <Skeleton className="mt-1 h-[3px] w-full rounded-full" />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* LEFT COLUMN (real content — currently hidden, restore by swapping with skeleton above) */}
        <div className="hidden space-y-4 lg:col-span-7">
          {/* Live voyage — Departed / Now / ETA timeline */}
          {isLive && voyage && (
            <section className={CARD}>
              <header className={SECTION_HEADER}>
                <h2 className={EYEBROW}>Live voyage</h2>
              </header>
              <div className="px-5 py-4">
                <div className="grid grid-cols-3 items-end gap-4">
                  <div>
                    <div className={EYEBROW}>Departed</div>
                    <div className="mt-1 text-[12.5px] text-slate-500">{voyage.fromCity}</div>
                    <div className="mt-0.5 font-mono text-[17px] font-semibold tabular-nums tracking-tight text-slate-900">
                      {voyage.departedLabel}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={EYEBROW}>Now</div>
                    <div className="mt-1 text-[12.5px] text-slate-500">{voyage.remainingLabel} remaining</div>
                    <div className="mt-0.5 font-mono text-[17px] font-semibold tabular-nums tracking-tight text-brand-600">
                      {voyage.nowLabel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={EYEBROW}>ETA</div>
                    <div className="mt-1 text-[12.5px] text-slate-500">{voyage.toCity}</div>
                    <div className="mt-0.5 font-mono text-[17px] font-semibold tabular-nums tracking-tight text-slate-900">
                      {voyage.etaLabel}
                    </div>
                  </div>
                </div>
                <div className="relative mt-4 h-[3px] rounded-full bg-slate-100">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-brand-500"
                    style={{ width: `${voyage.progress * 100}%` }}
                  />
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500 bg-white shadow-[0_0_0_4px_rgba(251,146,60,0.12)]"
                    style={{ left: `${voyage.progress * 100}%` }}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Vessel specs */}
          {vessel && (
            <section className={CARD}>
              <dl className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="px-5 py-4">
                  <dt className={EYEBROW}>Vessel type</dt>
                  <dd className="mt-1.5 text-[15px] font-semibold tracking-tight text-slate-900">{vessel.type}</dd>
                  <dd className="mt-0.5 font-mono text-[11.5px] tabular-nums text-slate-500">IMO {vessel.imo}</dd>
                </div>
                <div className="px-5 py-4">
                  <dt className={EYEBROW}>Capacity</dt>
                  <dd className="mt-1.5 text-[15px] font-semibold tracking-tight text-slate-900">
                    {vessel.passengers.toLocaleString()}
                    <span className="ml-1 text-[11.5px] font-normal text-slate-400">pax</span>
                  </dd>
                  <dd className="mt-0.5 text-[11.5px] text-slate-500">
                    {vessel.vehicleSlots === null ? "Passenger only" : `${vessel.vehicleSlots} vehicle slots`}
                  </dd>
                </div>
                <div className="px-5 py-4">
                  <dt className={EYEBROW}>Accepted vehicles</dt>
                  <dd className="mt-1.5 text-[15px] font-semibold tracking-tight text-slate-900">
                    {vessel.vehicleSlots === null
                      ? "Passengers only"
                      : `${vessel.vehicleClasses?.filter((c) => c.enabled).length ?? 0} classes`}
                  </dd>
                  <dd className="mt-0.5 truncate text-[11.5px] text-slate-500">
                    {vessel.vehicleSlots !== null && vessel.vehicleClasses
                      ? vessel.vehicleClasses.filter((c) => c.enabled).map((c) => c.label).join(", ") || "None configured"
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* Passenger types */}
          {vessel && (
            <section className={CARD}>
              <header className={SECTION_HEADER}>
                <h2 className={EYEBROW}>Passenger types</h2>
              </header>
              {vessel.passengerTypes && vessel.passengerTypes.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {vessel.passengerTypes.map((pt: PassengerType) => (
                    <li key={pt.key} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium tracking-tight text-slate-900">{pt.label}</div>
                        <div className="truncate text-[11.5px] text-slate-500">{pt.requiredDoc}</div>
                      </div>
                      <span className={`shrink-0 font-mono text-[12.5px] tabular-nums ${pt.isInfant ? "text-emerald-600" : "text-slate-700"}`}>
                        {pt.isInfant ? "Free" : `${pt.discountPct}% off`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-6 text-center">
                  <p className="text-[12.5px] text-slate-500">No passenger categories configured.</p>
                </div>
              )}
            </section>
          )}

          {/* Vehicle classes (only if vehicle-capable) */}
          {vessel && vessel.vehicleSlots !== null && vessel.vehicleClasses && vessel.vehicleClasses.length > 0 && (
            <section className={CARD}>
              <header className={SECTION_HEADER}>
                <h2 className={EYEBROW}>Vehicle classes</h2>
              </header>
              <ul className="divide-y divide-slate-100">
                {vessel.vehicleClasses.map((cls: VehicleClass) => (
                  <li key={cls.key} className="flex items-center gap-3 px-5 py-3">
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${cls.enabled ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"}`}>
                      {cls.enabled && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                          <path d="M5 12l5 5 9-11" />
                        </svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1 text-[13.5px] font-medium tracking-tight text-slate-900">{cls.label}</div>
                    <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-slate-500">{cls.descriptor}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Scheduled departures */}
          {vessel && voyage && (
            <section className={CARD}>
              <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <h2 className={EYEBROW}>Scheduled departures</h2>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
                >
                  Edit schedule
                </button>
              </header>
              <ul className="divide-y divide-slate-100">
                {mockSchedule(vessel.id, [voyage.fromCode, voyage.toCode]).map((s) => {
                  const pct = (s.sold / s.capacity) * 100;
                  const isLiveRun = s.status === "En route" || s.status === "Departed";
                  return (
                    <li key={s.id} className="grid grid-cols-[88px_1fr_60px_92px_160px] items-center gap-3 px-5 py-3.5">
                      <div className="font-mono text-[12.5px] font-medium tabular-nums tracking-tight text-slate-900">
                        {s.from}<span className="px-1 text-slate-300">→</span>{s.to}
                      </div>
                      <div className="text-[12.5px] text-slate-600">
                        {s.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </div>
                      <div className="font-mono text-[12.5px] tabular-nums text-slate-700">{s.time}</div>
                      <div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isLiveRun
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/60"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isLiveRun ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {s.status}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] text-slate-500">Tickets</span>
                          <span className="font-mono text-[11.5px] tabular-nums text-slate-700">
                            {s.sold}<span className="text-slate-400">/{s.capacity}</span>
                          </span>
                        </div>
                        <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN — map placeholder, inside grid, matches info-column height */}
        <aside className="lg:col-span-5">
          <div className="h-full min-h-[480px] overflow-hidden rounded-2xl bg-[#aedcf3] shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70" />
        </aside>
      </div>

      <EditVesselModal
        open={editOpen}
        vessel={vessel}
        onClose={() => setEditOpen(false)}
        onSave={(updated) => setVessels((prev) => prev ? prev.map((v) => v.id === updated.id ? updated : v) : prev)}
      />

      <DeleteVesselDialog
        open={deleteOpen}
        vessel={vessel}
        onClose={() => setDeleteOpen(false)}
        onConfirm={(v) => {
          setVessels((prev) => prev ? prev.filter((x) => x.id !== v.id) : prev);
          window.location.href = "/vessels";
        }}
      />
    </div>
  );
}
