"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import Select from "@/components/Select";
import Tooltip from "@/components/Tooltip";
import CreateScheduleModal from "@/components/CreateScheduleModal";
import { MOCK_FLEET, type VesselType } from "@/components/schedule-steps/VesselStep";
import { PORTS } from "@/components/schedule-steps/RoutesStep";
import Modal from "@/components/Modal";
import DateRangePicker, { type DateRange } from "@/components/DateRangePicker";
import { lines as allLines } from "@/lib/shipping-lines";
import { LogoTile } from "@/components/ShippingLineSwitcher";

// Real "now" — drives the TODAY column highlight, the NOW pill on the time
// axis, and the past-voyage ghosting. Computed once per page load so all the
// date math inside the same render is consistent.
const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const NOW_HOUR = new Date().getHours();

// 24h × 7-day calendar. Hours run 04:00 → 23:00 (operating window for ferries).
const HOURS = Array.from({ length: 20 }, (_, i) => i + 4); // 4..23
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Single voyage occurrence rendered on the calendar grid. ──
// Weekly schedules expand into many of these (one per matching weekday between
// departureDate and endDate); one-time schedules produce a single block.
// ── Voyage lifecycle status ──
type VoyageStatus = "Scheduled" | "Departed" | "Arrived" | "Cancelled";

type Voyage = {
  id: string;
  /** Calendar day this block sits on. */
  date: Date;
  /** Hour offset from midnight, e.g. 4 for 04:00, 14.5 for 14:30 — used to
   *  position the block on the time axis. */
  hour: number;
  minute: number;
  /** How long the crossing takes; drives block height. */
  durationHours: number;
  /** Display label for the block. */
  vesselName: string;
  vesselType: VesselType | null;
  originCode: string;
  destinationCode: string;
  originCity: string;
  destinationCity: string;
  paxCapacity: number;
  /** Owning shipping line — surfaces in the dialog header. */
  lineId: string;
  /** Sample fare snapshot for the detail dialog. */
  cheapestFare: number;
  priciestFare: number;
  /** Itemized fare lines for the dialog — passenger tiers + add-ons. */
  fareLines: { key: string; label: string; sublabel?: string; amount: number; group: "passenger" | "vehicle" | "addon"; free?: boolean }[];
  /** Confirmed bookings count — defaults to 0 until a booking system lands. */
  paxConfirmed: number;
  status: VoyageStatus;
  /** Optional operator label for recurring schedules (e.g. "Schedule A").
      Carried from the schedule wizard; surfaces on the calendar card. */
  scheduleLabel?: string;
};

// Helper — turn a CreatedSchedule payload into one-or-many calendar Voyages.
function expandSchedulePayload(payload: import("@/components/CreateScheduleModal").CreatedSchedule): Voyage[] {
  const { schedule, routes, vessel, fares } = payload;

  // Resolve vessel display info (name + capacity + type) from either the
  // fleet or the inline-registered values.
  const fromFleet = MOCK_FLEET.find((v) => v.id === vessel.fleetVesselId);
  const vesselName =
    vessel.mode === "fleet" ? fromFleet?.name ?? "Unnamed vessel" : vessel.name.trim() || "New vessel";
  const vesselType: VesselType | null =
    vessel.mode === "fleet" ? fromFleet?.type ?? null : vessel.type;
  const paxCapacity =
    vessel.mode === "fleet" ? fromFleet?.passengerCapacity ?? 0 : Number(vessel.passengerCapacity) || 0;

  const origin = PORTS.find((p) => p.code === routes.originCode);
  const destination = PORTS.find((p) => p.code === routes.destinationCode);

  // ── Derive cheapest / priciest passenger fares from the catalog + prices ──
  const base = Number(fares.baseFare) || 0;
  const enabledPrices = vessel.passengerTypes
    .filter((p) => fares.passengerPrices[p.key]?.enabled && !p.isInfant)
    .map((p) => {
      const row = fares.passengerPrices[p.key];
      if (row.price) return Number(row.price) || 0;
      return p.discountPct > 0 ? Math.round(base * (1 - p.discountPct / 100)) : base;
    })
    .filter((n) => n > 0);
  const cheapestFare = enabledPrices.length > 0 ? Math.min(...enabledPrices) : base;
  const priciestFare = enabledPrices.length > 0 ? Math.max(...enabledPrices) : base;

  // ── Itemized fare breakdown for the detail dialog. ──
  // Passenger tiers come from the vessel's catalog (with per-schedule price
  // overrides applied), vehicle classes from the same source, add-ons last.
  type FareLine = { key: string; label: string; sublabel?: string; amount: number; group: "passenger" | "vehicle" | "addon"; free?: boolean };
  const fareLines: FareLine[] = [];
  vessel.passengerTypes
    .filter((p) => fares.passengerPrices[p.key]?.enabled)
    .forEach((p) => {
      const row = fares.passengerPrices[p.key];
      if (p.isInfant) {
        fareLines.push({ key: `pax-${p.key}`, label: p.label, sublabel: p.requiredDoc, amount: 0, group: "passenger", free: true });
        return;
      }
      const computed = p.discountPct > 0 ? Math.round(base * (1 - p.discountPct / 100)) : base;
      const amount = row.price ? Number(row.price) || 0 : computed;
      const sublabel = p.discountPct > 0 ? `${p.discountPct}% off base · ${p.requiredDoc}` : p.requiredDoc;
      fareLines.push({ key: `pax-${p.key}`, label: p.label, sublabel, amount, group: "passenger" });
    });
  vessel.vehicleClasses
    .filter((c) => c.enabled && fares.vehiclePrices[c.key]?.enabled)
    .forEach((c) => {
      const row = fares.vehiclePrices[c.key];
      fareLines.push({ key: `veh-${c.key}`, label: c.label, sublabel: c.descriptor, amount: Number(row.price) || 0, group: "vehicle" });
    });
  vessel.addOns
    .filter((a) => fares.addOnPrices[a.key]?.enabled)
    .forEach((a) => {
      const row = fares.addOnPrices[a.key];
      fareLines.push({ key: `addon-${a.key}`, label: a.label, sublabel: a.descriptor, amount: Number(row?.price) || a.defaultPrice, group: "addon" });
    });

  const avgDuration =
    (Number(routes.durationLowHrs) + Number(routes.durationHighHrs)) / 2 || 1.5;

  // Schedules are always recurring. Generate the next 30 days starting
  // today; for each day in that window, expand every selected weekday+hour
  // slot into a voyage. The server does this for real; this is the
  // client-side preview that lights up the calendar immediately.
  const RANGE_DAYS = 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dowKeys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

  const expansions: { date: Date; hour: number }[] = [];
  for (let offset = 0; offset < RANGE_DAYS; offset++) {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() + offset);
    const dow = (cursor.getDay() + 6) % 7; // Mon=0..Sun=6
    const key = dowKeys[dow];
    const hours = schedule.dayTimes[key] ?? [];
    hours.forEach((h) => expansions.push({ date: cursor, hour: h }));
  }

  const scheduleLabel = schedule.label?.trim() || undefined;

  return expansions.map(({ date, hour }, i) => ({
    id: `vy-${Date.now()}-${i}`,
    date,
    hour,
    minute: 0,
    durationHours: avgDuration,
    vesselName,
    vesselType,
    originCode: origin?.code ?? routes.originCode,
    destinationCode: destination?.code ?? routes.destinationCode,
    originCity: origin?.city ?? routes.originCode,
    destinationCity: destination?.city ?? routes.destinationCode,
    paxCapacity,
    lineId: vessel.lineId,
    cheapestFare,
    priciestFare,
    fareLines,
    paxConfirmed: 0,
    status: "Scheduled" as const,
    scheduleLabel,
  }));
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  // ISO week: Monday is the first day (getDay returns 0 for Sun).
  const dow = (out.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d); out.setDate(out.getDate() + n); return out;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtHour(h: number): string {
  // Full clock form, always single-line in the time-axis column (e.g. "4:00 AM").
  const period = h < 12 ? "AM" : "PM";
  const display = ((h + 11) % 12) + 1;
  return `${display}:00 ${period}`;
}

// Humanize a crossing duration in hours → "3h 30m" / "2h" / "45m".
function fmtDuration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function VoyagesPage() {
  const { active, locked } = useShippingLine();
  const [weekStart] = useState<Date>(() => startOfWeek(TODAY));
  const [vesselFilter, setVesselFilter] = useState<string>("all");
  const [portFilter, setPortFilter] = useState<string>("all");

  // Deep-link support: the Routes page links here pre-filtered by a route's
  // origin port and assigned vessel (?origin=CEB&vessel=MV%20Filipinas%20Cebu).
  // Read those once on mount and seed the filters.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const origin = params.get("origin");
    const vessel = params.get("vessel");
    if (origin) setPortFilter(origin);
    if (vessel) setVesselFilter(vessel);
  }, []);
  // Voyages persisted in localStorage. SSR-safe sequencing:
  //  1. Initial state is empty on both server and client → no hydration drift.
  //  2. After mount, read localStorage and (if anything's stored) push it into
  //     state via setVoyages. The hasHydrated flag flips to true so writes
  //     can begin.
  //  3. Writes are gated on hasHydrated so the initial-render `voyages = []`
  //     never clobbers the saved payload before we get a chance to read it.
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("tripket.voyages");
      if (raw) {
        const parsedAll: (Omit<Voyage, "date"> & { date: string })[] = JSON.parse(raw);
        // Operators only see their own line's voyages; admins see all (the
        // switcher governs which line they're acting as).
        const parsed = locked ? parsedAll.filter((v) => (v as { lineId?: string }).lineId === active.id) : parsedAll;
        // Defensive backfills for fields that may not exist on older stored
        // voyages (the schema has grown over time).
        setVoyages(parsed.map((v) => {
          const loose = v as Partial<Omit<Voyage, "date">> & { date: string };
          return {
            ...v,
            date: new Date(v.date),
            fareLines: loose.fareLines ?? [],
            lineId: loose.lineId ?? "",
            status: loose.status ?? "Scheduled",
          };
        }));
      }
    } catch {
      // Malformed payload — ignore and start fresh.
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      const mine = voyages.map((v) => ({ ...v, date: v.date.toISOString() }));
      // When operating inside a single line (operator, or admin scoped to a
      // line), `voyages` only holds this line's records — so merge them back
      // over the stored set without clobbering other lines' voyages.
      let payload = mine;
      if (locked) {
        const rawAll = window.localStorage.getItem("tripket.voyages");
        const others = rawAll
          ? (JSON.parse(rawAll) as { lineId?: string }[]).filter((v) => v.lineId !== active.id)
          : [];
        payload = [...others, ...mine] as typeof mine;
      }
      window.localStorage.setItem("tripket.voyages", JSON.stringify(payload));
    } catch {
      // Quota or serialization error — drop silently.
    }
  }, [voyages, hasHydrated, locked, active.id]);
  // Which voyage's detail dialog is open (null = closed).
  const [openVoyageId, setOpenVoyageId] = useState<string | null>(null);
  const openVoyage = useMemo(
    () => voyages.find((v) => v.id === openVoyageId) ?? null,
    [voyages, openVoyageId],
  );

  // The calendar shows one block per recurring weekly slot (weekday + time +
  // vessel), even though that slot expands into ~4 dated voyages over 30 days.
  // So edits/removals must act on the whole slot, not a single occurrence —
  // otherwise the block reappears from the next remaining occurrence.
  const slotKey = (v: Voyage) => `${(v.date.getDay() + 6) % 7}|${v.hour}|${v.minute}|${v.vesselName}`;
  const sameSlot = (a: Voyage, b: Voyage) => slotKey(a) === slotKey(b);

  // Auto-saves status changes across every occurrence of the slot.
  const updateVoyageStatus = (id: string, status: VoyageStatus) =>
    setVoyages((prev) => {
      const target = prev.find((v) => v.id === id);
      if (!target) return prev;
      return prev.map((v) => (sameSlot(v, target) ? { ...v, status } : v));
    });

  // Removes the whole recurring slot (all its dated occurrences).
  const removeVoyage = (id: string) => {
    setVoyages((prev) => {
      const target = prev.find((v) => v.id === id);
      if (!target) return prev;
      return prev.filter((v) => !sameSlot(v, target));
    });
    setOpenVoyageId(null);
  };

  // ── Batch select / delete ──
  // In select mode, clicking a slot toggles it (by slotKey) instead of opening
  // the detail dialog. Deleting clears every occurrence of the chosen slots.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  const toggleSlot = (key: string) =>
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const exitSelectMode = () => { setSelectMode(false); setSelectedSlots(new Set()); };

  const deleteSelectedSlots = () => {
    setVoyages((prev) => prev.filter((v) => !selectedSlots.has(slotKey(v))));
    exitSelectMode();
  };

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Port + vessel filter options, derived from the voyages that actually exist
  // so the dropdowns never offer dead choices.
  const portOptions = useMemo(() => {
    const seen = new Map<string, string>(); // code → city
    voyages.forEach((v) => { seen.set(v.originCode, v.originCity); seen.set(v.destinationCode, v.destinationCity); });
    return [
      { value: "all", label: "All ports" },
      ...Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([code, city]) => ({ value: code, label: `${city} (${code})` })),
    ];
  }, [voyages]);

  const vesselOptions = useMemo(() => {
    const seen = new Set<string>();
    voyages.forEach((v) => seen.add(v.vesselName));
    return [{ value: "all", label: "All vessels" }, ...Array.from(seen).sort().map((n) => ({ value: n, label: n }))];
  }, [voyages]);

  // Calendar voyages, scoped to the active port + vessel filters. A port match
  // is either end of the crossing (origin or destination).
  const filteredVoyages = useMemo(
    () =>
      voyages
        .filter((v) => portFilter === "all" || v.originCode === portFilter || v.destinationCode === portFilter)
        .filter((v) => vesselFilter === "all" || v.vesselName === vesselFilter),
    [voyages, portFilter, vesselFilter]
  );

  // Group voyages into one representative card per recurring slot, bucketed by
  // weekday + hour. A "slot" is a distinct route + vessel + time — the SAME
  // weekday+hour can hold several (different routes/vessels), which is exactly
  // why cells stack rather than overlay. Key: "weekday|hour".
  const cellSlots = useMemo(() => {
    const map = new Map<string, Voyage[]>();
    const seen = new Set<string>();
    const weekdayOf = (d: Date) => (d.getDay() + 6) % 7;
    [...filteredVoyages]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((v) => {
        const wd = weekdayOf(v.date);
        // One card per distinct slot (route + vessel + exact time).
        const dedupe = `${wd}|${v.hour}|${v.minute}|${v.vesselName}|${v.originCode}-${v.destinationCode}`;
        if (seen.has(dedupe)) return;
        seen.add(dedupe);
        const bucket = `${wd}|${v.hour}`;
        const arr = map.get(bucket);
        if (arr) arr.push(v); else map.set(bucket, [v]);
      });
    return map;
  }, [filteredVoyages]);

  const [createOpen, setCreateOpen] = useState(false);
  const [manifestOpen, setManifestOpen] = useState(false);
  // Slot the operator clicked to seed the wizard's Schedule step. Cleared on
  // close so the next plain-button create starts fresh.
  const [createPrefill, setCreatePrefill] = useState<{ date: Date; hour: number } | null>(null);

  return (
    // Fill the scroll container — the page itself never scrolls.
    // Only the calendar's hour-grid scrolls (see the inner wrapper below).
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Voyages"
        subtitle={active.name}
        showDateFilter={false}
        showExport={false}
        right={
          <div className="flex items-center gap-2">
            {/* Manifest browser — everyday audit artifact. Opens a dialog
                listing each dated departure's manifest as a downloadable card. */}
            <button
              type="button"
              onClick={() => setManifestOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
                <path d="M14 3v6h6" />
                <path d="M8 13h8M8 17h5" />
              </svg>
              Manifest
            </button>
            {/* Export — placeholder for a CSV/PDF dump of the schedule. */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Export
            </button>
            <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create schedule
            </button>
          </div>
        }
      />

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
        {/* ─── Toolbar ─── */}
        {/* Scoped to Port + Vessel filters per backend spec. The calendar
            below is a weekday × time template, so there's no search, route
            filter, or date picker — the view itself doesn't have specific
            days, just recurring weekday slots. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              size="sm"
              value={portFilter}
              onChange={setPortFilter}
              ariaLabel="Filter by port"
              className="w-44"
              options={portOptions}
            />

            <Select
              size="sm"
              value={vesselFilter}
              onChange={setVesselFilter}
              ariaLabel="Filter by vessel"
              className="w-48"
              options={vesselOptions}
            />
          </div>

          {/* Select-mode toggle for batch deleting slots. */}
          {selectMode ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-slate-600">
                {selectedSlots.size} selected
              </span>
              <button
                type="button"
                onClick={deleteSelectedSlots}
                disabled={selectedSlots.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors duration-150 hover:bg-rose-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
                Delete{selectedSlots.size > 0 ? ` (${selectedSlots.size})` : ""}
              </button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-500">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Select
            </button>
          )}
        </div>

        {/* ─── Schedule summary ─── */}
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Weekly schedule template</h2>
          <p className="mt-0.5 text-[11.5px] text-slate-500">Recurring departures by weekday + time.</p>
        </div>

        {/* ─── Calendar grid ───
            Wrapper grows to fill remaining card height (flex-1) and lets only the
            inner hour-rows scroll vertically. The day-header row stays pinned. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
          <div className="flex min-w-[920px] flex-1 flex-col">
            {/* Day header row — pinned */}
            <div className="grid shrink-0 grid-cols-[120px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/60">
              {/* Time-axis spacer with the chart's y-axis seam */}
              <div className="border-r border-slate-200" />
              {days.map((d, i) => {
                const isToday = sameDay(d, TODAY);
                return (
                  <div
                    key={i}
                    className={
                      "relative flex flex-col items-start gap-0.5 border-l border-slate-200 px-3 py-3 " +
                      (isToday ? "bg-brand-50/70" : "")
                    }
                  >
                    {/* Brand bar over the Today column header — clear visual anchor */}
                    {isToday && (
                      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-brand-500" />
                    )}
                    <div className="flex items-center gap-2">
                      <span className={"text-[15px] font-semibold tracking-tight " + (isToday ? "text-brand-700" : "text-slate-900")}>
                        {DAY_NAMES[i]}
                      </span>
                      {isToday && (
                        <span className="inline-flex items-center rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_1px_2px_rgba(249,115,22,0.4)]">
                          Today
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hour rows — vertically scrollable inside the card. Cells render
                their voyage cards inline and grow to fit, so multiple
                routes/vessels at the same weekday+hour stack instead of
                overlapping. */}
            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {HOURS.map((h, rowIdx) => (
                <div
                  key={h}
                  className={
                    "grid grid-cols-[120px_repeat(7,minmax(0,1fr))] " +
                    (rowIdx !== 0 ? "shadow-[inset_0_1px_0_rgba(226,232,240,0.7)]" : "")
                  }
                >
                  {/* Time axis label — full clock, left-aligned, single-line.
                      Non-current hours read subtly; the current hour stays full-contrast and is
                      tagged with a "Now" pill so the present moment is unmistakable. */}
                  <div className="flex items-center gap-2 border-r border-slate-200 px-3 pt-1.5">
                    <span
                      className={
                        "whitespace-nowrap text-[12.5px] font-normal tabular-nums tracking-tight " +
                        (h === NOW_HOUR ? "text-slate-900 font-semibold" : "text-slate-400")
                      }
                    >
                      {fmtHour(h)}
                    </span>
                    {h === NOW_HOUR && (
                      <span className="inline-flex items-center rounded-lg bg-brand-500 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white">
                        Now
                      </span>
                    )}
                  </div>

                  {/* Day cells — render any voyage cards for this weekday+hour
                      stacked vertically; the cell grows to fit. Empty cells
                      show a hover "add" affordance. */}
                  {days.map((d, dayIdx) => {
                    const isToday = sameDay(d, TODAY);
                    const wd = (d.getDay() + 6) % 7;
                    const slots = cellSlots.get(`${wd}|${h}`) ?? [];
                    return (
                      <div
                        key={dayIdx}
                        className={
                          "group/cell relative min-h-14 w-full border-l border-slate-200 " +
                          (slots.length > 0 ? "p-1 " : "") +
                          (isToday ? "bg-brand-50/30" : "")
                        }
                      >
                        {slots.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {slots.map((v) => {
                              const key = slotKey(v);
                              return (
                                <VoyageCard
                                  key={v.id}
                                  voyage={v}
                                  selectMode={selectMode}
                                  selected={selectedSlots.has(key)}
                                  onClick={() => (selectMode ? toggleSlot(key) : setOpenVoyageId(v.id))}
                                />
                              );
                            })}
                            {/* Quiet add-more affordance under the stack */}
                            {!selectMode && (
                              <button
                                type="button"
                                onClick={() => { setCreatePrefill({ date: d, hour: h }); setCreateOpen(true); }}
                                aria-label={`Add another schedule at ${fmtHour(h)}`}
                                className="flex items-center justify-center rounded-md py-0.5 text-slate-300 opacity-0 transition-opacity duration-150 hover:bg-brand-50/60 hover:text-brand-500 group-hover/cell:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg>
                              </button>
                            )}
                          </div>
                        ) : (
                          <Tooltip variant="light" delay={250} className="!absolute inset-0 !block" content="Add schedule">
                            <button
                              type="button"
                              onClick={() => { setCreatePrefill({ date: d, hour: h }); setCreateOpen(true); }}
                              aria-label={`Add schedule on ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${fmtHour(h)}`}
                              className="group flex h-full w-full items-center justify-center transition-colors duration-100 hover:bg-brand-50/40 focus-visible:bg-brand-50/40 focus-visible:outline-none"
                            >
                              <span aria-hidden className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-brand-500"><path d="M12 5v14M5 12h14" /></svg>
                              </span>
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Footer — template tally + create CTA. The calendar is a weekday
             template, so we count distinct weekly departure slots and the
             total generated voyages they expand into. ─── */}
        {(() => {
          const slotKeys = new Set(
            filteredVoyages.map((v) => `${(v.date.getDay() + 6) % 7}|${v.hour}|${v.minute}|${v.vesselName}`)
          );
          const slotCount = slotKeys.size;
          const totalCount = filteredVoyages.length;
          let primary: string;
          let secondary: string | null = null;
          if (totalCount === 0) {
            primary = "No voyages yet.";
            secondary = "Get started with your first schedule.";
          } else {
            primary = `${slotCount.toLocaleString()} weekly departure${slotCount === 1 ? "" : "s"}.`;
            secondary = `Generating ${totalCount.toLocaleString()} voyage${totalCount === 1 ? "" : "s"} over the next 30 days.`;
          }
          return (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-2.5">
              <p className="min-w-0 truncate text-[11.5px] text-slate-500">
                <span className="font-medium text-slate-700">{primary}</span>
                {secondary && <span className="ml-1.5 text-slate-400">{secondary}</span>}
              </p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-brand-600 transition-opacity duration-150 hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {totalCount === 0 ? "Create your first schedule" : "New schedule"}
              </button>
            </div>
          );
        })()}
      </section>

      <CreateScheduleModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreatePrefill(null); }}
        prefill={createPrefill ?? undefined}
        onCreate={(payload) => {
          // The calendar is a weekday template, so newly-created voyages land
          // on their weekday columns immediately — no week-jump needed.
          const newVoyages = expandSchedulePayload(payload);
          if (newVoyages.length === 0) return;
          setVoyages((prev) => [...prev, ...newVoyages]);
        }}
      />

      <VoyageDetailDialog
        voyage={openVoyage}
        open={!!openVoyage}
        onClose={() => setOpenVoyageId(null)}
        onStatusChange={updateVoyageStatus}
        onRemove={removeVoyage}
      />

      <ManifestDialog
        open={manifestOpen}
        onClose={() => setManifestOpen(false)}
        voyages={voyages}
      />
    </div>
  );
}


type StatusCardToneKey = VoyageStatus | "ScheduledFuture";

// Card palette per voyage status. Stays in sync with the dialog's chip tones
// so a glance at any cell signals the same lifecycle state.
//   - Scheduled (today / now)        → brand-orange (today's anchor)
//   - ScheduledFuture (not today)    → sky-blue (upcoming, not today)
//   - Departed / Arrived / Cancelled → matching dialog chip palette
// Each tone carries a solid accent class for the 3px left edge of the card.
const STATUS_CARD_TONE: Record<StatusCardToneKey, {
  bg: string;
  accent: string;
  hoverShadow: string;
  routeText: string;
  arrow: string;
  vesselText: string;
  strike: boolean;
}> = {
  Scheduled: {
    bg: "bg-brand-50",
    accent: "bg-brand-500",
    hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(249,115,22,0.3)]",
    routeText: "text-brand-800",
    arrow: "text-brand-500",
    vesselText: "text-slate-700",
    strike: false,
  },
  ScheduledFuture: {
    bg: "bg-sky-50",
    accent: "bg-sky-500",
    hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(2,132,199,0.3)]",
    routeText: "text-sky-800",
    arrow: "text-sky-500",
    vesselText: "text-slate-700",
    strike: false,
  },
  Departed: {
    bg: "bg-sky-50",
    accent: "bg-sky-600",
    hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(2,132,199,0.3)]",
    routeText: "text-sky-800",
    arrow: "text-sky-500",
    vesselText: "text-slate-700",
    strike: false,
  },
  Arrived: {
    bg: "bg-emerald-50",
    accent: "bg-emerald-600",
    hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(5,150,105,0.3)]",
    routeText: "text-emerald-800",
    arrow: "text-emerald-500",
    vesselText: "text-slate-700",
    strike: false,
  },
  Cancelled: {
    bg: "bg-rose-50",
    accent: "bg-rose-500",
    hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(225,29,72,0.25)]",
    routeText: "text-rose-700",
    arrow: "text-rose-400",
    vesselText: "text-rose-500",
    strike: true,
  },
};

// Per-vessel card tone — deterministic from the vessel name so stacked cards
// (same day+time, different vessels) are distinguishable by their whole-card
// color. Cool/neutral families only, to avoid clashing with the brand orange
// (Today) and the status tones (rose = cancelled, etc.).
type CardTone = { bg: string; accent: string; hoverShadow: string; routeText: string; arrow: string; vesselText: string };
const VESSEL_TONES: CardTone[] = [
  { bg: "bg-brand-50 ring-1 ring-brand-200",     accent: "bg-brand-500",   hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(249,115,22,0.3)]",  routeText: "text-brand-800",   arrow: "text-brand-500",   vesselText: "text-brand-700" },
  { bg: "bg-blue-100 ring-1 ring-blue-200",      accent: "bg-blue-600",    hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(37,99,235,0.35)]",  routeText: "text-blue-800",    arrow: "text-blue-600",    vesselText: "text-blue-700" },
  { bg: "bg-violet-50 ring-1 ring-violet-200",   accent: "bg-violet-500",  hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(139,92,246,0.3)]", routeText: "text-violet-800",  arrow: "text-violet-500",  vesselText: "text-violet-600" },
  { bg: "bg-sky-50 ring-1 ring-sky-200",         accent: "bg-sky-500",     hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(14,165,233,0.3)]",  routeText: "text-sky-800",     arrow: "text-sky-500",     vesselText: "text-sky-600" },
  { bg: "bg-indigo-50 ring-1 ring-indigo-200",   accent: "bg-indigo-500",  hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(99,102,241,0.3)]",  routeText: "text-indigo-800",  arrow: "text-indigo-500",  vesselText: "text-indigo-600" },
  { bg: "bg-fuchsia-50 ring-1 ring-fuchsia-200", accent: "bg-fuchsia-500", hoverShadow: "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_12px_-8px_rgba(217,70,239,0.3)]",  routeText: "text-fuchsia-800", arrow: "text-fuchsia-500", vesselText: "text-fuchsia-600" },
];
// Weighted assignment so brand orange (index 0) is the MAIN tone — most
// vessels land on it — while the accent colors (blue + others) are used
// sparingly. Roughly: ~half map to orange, the rest spread across the accents.
function vesselTone(name: string): CardTone {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const accents = VESSEL_TONES.length - 1; // tones after orange
  // Bucket into (accents + accents) slots: the first `accents` buckets all map
  // to orange, the rest map 1:1 to each accent → orange ≈ 50% share.
  const bucket = h % (accents * 2);
  return bucket < accents ? VESSEL_TONES[0] : VESSEL_TONES[1 + (bucket - accents)];
}

// ─────────── VoyageCard — inline, stacking card for one slot ───────────
// Rendered inside its weekday+hour cell (no absolute positioning), so multiple
// routes/vessels at the same time stack and the cell grows to fit.
function VoyageCard({
  voyage,
  onClick,
  selectMode = false,
  selected = false,
}: {
  voyage: Voyage;
  onClick: () => void;
  selectMode?: boolean;
  selected?: boolean;
}) {
  // Card color priority:
  //  1. Departed/Arrived/Cancelled → their lifecycle status tone
  //  2. Otherwise (scheduled) → per-vessel color, so cards stacked in the same
  //     day+time slot are each distinct. (Today is signaled by the column's
  //     tint + header pill, not by recoloring every card orange.)
  const tone: CardTone =
    voyage.status !== "Scheduled"
      ? STATUS_CARD_TONE[voyage.status]
      : vesselTone(voyage.vesselName);
  const strike = voyage.status === "Cancelled";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selectMode ? selected : undefined}
      aria-label={
        selectMode
          ? `${selected ? "Deselect" : "Select"} ${voyage.originCode} to ${voyage.destinationCode} on ${voyage.vesselName}`
          : `Open ${voyage.originCode} to ${voyage.destinationCode} on ${voyage.vesselName} — ${voyage.status.toLowerCase()}`
      }
      className={
        "group/voyage relative flex w-full flex-col overflow-hidden rounded-lg py-1.5 pl-3 pr-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,transform] duration-150 ease-out " +
        `${tone.bg} hover:-translate-y-px ${tone.hoverShadow} ` +
        (selectMode && selected ? "ring-2 ring-brand-500 ring-offset-1 ring-offset-white " : "") +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      }
    >
      {/* Selection checkbox — only in select mode. */}
      {selectMode && (
        <span
          aria-hidden
          className={
            "absolute right-1.5 top-1.5 z-10 grid h-4 w-4 place-items-center rounded-[5px] border transition-colors " +
            (selected ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-white/90")
          }
        >
          {selected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
              <path d="M5 12l5 5 9-11" />
            </svg>
          )}
        </span>
      )}
      {/* Solid left accent stripe — colored per status. */}
      <span aria-hidden className={"pointer-events-none absolute inset-y-0 left-0 w-[3px] " + tone.accent} />

      {/* Route — headline. */}
      <span
        className={
          "truncate font-mono text-[11.5px] font-bold uppercase tabular-nums tracking-[0.08em] " +
          `${tone.routeText} ${strike ? "line-through decoration-rose-400/70 " : ""}`
        }
      >
        {voyage.originCode}
        <span className={"mx-1 " + tone.arrow} aria-hidden>→</span>
        {voyage.destinationCode}
      </span>
      {/* Vessel — supporting caption. The whole card is tinted per vessel so
          stacked cards (same day+time, different vessels) read as distinct. */}
      <span className={"truncate text-[10.5px] font-medium tracking-tight " + tone.vesselText}>
        {voyage.vesselName}
      </span>
      {voyage.scheduleLabel && (
        <span className="truncate text-[10px] font-medium tracking-tight text-slate-500">
          {voyage.scheduleLabel}
        </span>
      )}
    </button>
  );
}

// ─────────── VoyageDetailDialog ───────────
// Read-only detail surface for an existing voyage. The only editable field is
// the lifecycle status, which auto-saves the moment a different chip is picked.
//
// Anatomy:
//   ┌──────────────────────────────────────────────────────┐
//   │ TAG → ORM                                       ✕    │
//   │ Mon, May 25, 2026 · 4:00 AM                          │
//   ├──────────────────────────────────────────────────────┤
//   │ Vessel       MV Maayo 18 · RoRo · 420 pax            │
//   │ Bookings     0 / 420                                 │
//   │ Fares        ₱1,696 → ₱2,520                         │
//   ├──────────────────────────────────────────────────────┤
//   │ Status       [Scheduled] [Departed] [Arrived] [Cncl] │
//   └──────────────────────────────────────────────────────┘
// All chips share the same brand-orange palette — the meaning is in the label,
// not the color. Cards on the calendar still tint per status (sky / emerald /
// rose) so the lifecycle reads at a glance there; the dialog itself stays calm.
const STATUS_CHIPS: { key: VoyageStatus; label: string }[] = [
  { key: "Scheduled", label: "Scheduled" },
  { key: "Departed", label: "Departed" },
  { key: "Arrived", label: "Arrived" },
  { key: "Cancelled", label: "Cancelled" },
];

// Pill tones for the voyage status picker — mirror the calendar lifecycle.
const VOYAGE_STATUS_PILL_TONE: Record<VoyageStatus, string> = {
  Scheduled: "bg-brand-50 text-brand-700",
  Departed:  "bg-sky-50 text-sky-700",
  Arrived:   "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-slate-100 text-slate-500",
};

// ─────────── VoyageStatusPicker ───────────
// ClickUp-style status selector for the voyage detail dialog. Mirrors the
// booking/ticket pickers: brand-orange primary trigger reads "STATUS · VALUE
// ▾" with a popover listing every transition. Closes on outside click + Esc.
function VoyageStatusPicker({
  current,
  onChange,
}: {
  current: VoyageStatus;
  onChange: (next: VoyageStatus) => void;
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
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-white">{current}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 text-white/80 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-30 mb-2 w-56 overflow-hidden rounded-xl bg-white p-1 shadow-[0_18px_44px_-16px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70"
        >
          <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
            Update status
          </div>
          {STATUS_CHIPS.map((o) => {
            const isCurrent = o.key === current;
            return (
              <button
                key={o.key}
                type="button"
                role="menuitem"
                disabled={isCurrent}
                onClick={() => { if (!isCurrent) { onChange(o.key); setOpen(false); } }}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors duration-100 ${
                  isCurrent
                    ? "cursor-default text-slate-400"
                    : o.key === "Cancelled"
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <span className="truncate font-medium">Mark {o.label}</span>
                <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${VOYAGE_STATUS_PILL_TONE[o.key]} ${isCurrent ? "opacity-50" : ""}`}>
                  {o.label}
                </span>
                <span className="flex justify-end">
                  {isCurrent && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400">
                      <path d="M5 12l5 5 9-11" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────── VoyageFooter ───────────
// Footer for the voyage detail dialog. Owns the entire footer surface so
// the destructive-confirm flow can transform the row in-place instead of
// stacking another modal on top. Two states:
//   • Idle    — Remove (secondary ghost) on the left, Status picker on the right
//   • Confirm — full-row takeover: icon + question + Cancel / Remove voyage
// Reads as a focused micro-interaction rather than dialog-over-dialog.
function VoyageFooter({
  voyage,
  onRemove,
  onStatusChange,
}: {
  voyage: Voyage;
  onRemove: (id: string) => void;
  onStatusChange: (id: string, next: VoyageStatus) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setConfirming(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  if (confirming) {
    return (
      <div className="flex items-center gap-3 border-t border-rose-100 bg-rose-50/40 px-5 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 9v4M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold tracking-tight text-slate-900">Remove this voyage?</div>
          <div className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
            It will disappear from the template. Bookings stay intact.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
          style={{ boxShadow: "none" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); onRemove(voyage.id); }}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-rose-700"
          style={{ boxShadow: "none" }}
        >
          Remove voyage
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-rose-600 transition-colors duration-150 hover:bg-rose-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
        </svg>
        Remove
      </button>
      <VoyageStatusPicker
        current={voyage.status}
        onChange={(next) => onStatusChange(voyage.id, next)}
      />
    </div>
  );
}

function VoyageDetailDialog({
  voyage,
  open,
  onClose,
  onStatusChange,
  onRemove,
}: {
  voyage: Voyage | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: VoyageStatus) => void;
  onRemove: (id: string) => void;
}) {
  // The dialog mirrors whichever line is currently active in the top-bar
  // switcher — voyages always read from the live context, never the stored
  // lineId. Keeps the org identity in sync with the rest of the app.
  const { active: activeLine } = useShippingLine();

  if (!voyage) return null;

  const period = voyage.hour < 12 ? "AM" : "PM";
  const h12 = ((voyage.hour + 11) % 12) + 1;
  const timeLabel = `${h12}:${String(voyage.minute).padStart(2, "0")} ${period}`;
  const dateLabel = voyage.date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const vesselLine = [
    voyage.vesselName,
    voyage.vesselType,
    voyage.paxCapacity > 0 ? `${voyage.paxCapacity.toLocaleString()} pax cap.` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Estimated arrival = departure + crossing duration, rendered in the same
  // 12h clock as the departure time. Flags an overnight crossing.
  const etaLabel = (() => {
    const startMin = voyage.hour * 60 + voyage.minute;
    const total = Math.round(startMin + voyage.durationHours * 60);
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    const p = eh < 12 ? "AM" : "PM";
    const e12 = ((eh + 11) % 12) + 1;
    const overnight = total >= 24 * 60;
    return `${e12}:${String(em).padStart(2, "0")} ${p}${overnight ? " (+1)" : ""}`;
  })();

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      {/* Capped height with a scrollable middle so the footer (Remove +
          Status) is always pinned and visible, no matter how many fare
          lines the voyage carries. */}
      <div className="flex max-h-[88vh] flex-col">
        {/* Small left-aligned dialog title + close button. */}
        <div className="flex items-center justify-between gap-3 px-5 pt-6 pb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Voyage details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Itinerary header — shipping line on top, then big city names
            flanking a centered logo avatar with dashed-arrow connectors. */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-center gap-3">
            {/* Origin — code on top, city caption below. */}
            <div className="min-w-0 text-center">
              <div className="truncate font-mono text-[22px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">
                {voyage.originCode}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-slate-500">
                {voyage.originCity}
              </div>
            </div>
            <DashedArrow />
            {/* Avatar + line name caption. The line name sits as a quiet
                subtitle directly under the logo so the org identity reads
                without competing with the city headlines. */}
            <div className="flex flex-col items-center gap-1">
              <ShippingLineAvatar lineId={activeLine.id} />
              <span className="max-w-[120px] truncate text-[10px] font-medium text-slate-500">
                {activeLine.name}
              </span>
            </div>
            <DashedArrow />
            {/* Destination — same anatomy. */}
            <div className="min-w-0 text-center">
              <div className="truncate font-mono text-[22px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">
                {voyage.destinationCode}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-slate-500">
                {voyage.destinationCity}
              </div>
            </div>
          </div>
          <p className="mt-3 truncate text-center text-[11.5px] text-slate-500">
            <span>{dateLabel}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-mono tabular-nums">{timeLabel}</span>
          </p>
        </div>

        <div className="border-t border-slate-100" />

        {/* Scrollable middle — detail rows + fare breakdown. Keeps the footer
            pinned below regardless of how long the fare list is. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Detail rows — template-level facts (no bookings; those live on the
            generated dated departures, not the recurring template). */}
        <dl className="divide-y divide-slate-100 px-5 py-2">
          <DetailRow label="Vessel" value={vesselLine || "—"} />
          {voyage.scheduleLabel && (
            <DetailRow label="Schedule" value={voyage.scheduleLabel} />
          )}
          <DetailRow
            label="Crossing"
            value={
              <span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">{fmtDuration(voyage.durationHours)}</span>
                <span className="text-slate-400"> · ETA {etaLabel}</span>
              </span>
            }
          />
          <DetailRow
            label="Capacity"
            value={
              <span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">{voyage.paxCapacity.toLocaleString()}</span>
                <span className="text-slate-400"> pax</span>
              </span>
            }
          />
        </dl>

        {/* Itemized fares — passenger tiers, vehicle classes, add-ons. Each
            group separated by a small slate eyebrow so the breakdown reads
            top-down without crowding the rows above. */}
        <FareBreakdown lines={voyage.fareLines} />
        </div>

        <div className="border-t border-slate-100" />

        <VoyageFooter
          voyage={voyage}
          onRemove={onRemove}
          onStatusChange={onStatusChange}
        />
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-[12px] text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-[12.5px] tracking-tight text-slate-900">{value}</dd>
    </div>
  );
}

// ─────────── ShippingLineAvatar ───────────
// Logo-only avatar shown between the city names in the voyage dialog header.
// Framed in a soft white box matching the switcher's LogoTile vocabulary.
function ShippingLineAvatar({ lineId }: { lineId: string }) {
  const line = allLines.find((l) => l.id === lineId);
  if (!line) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-400">
        —
      </span>
    );
  }
  return (
    <span className="shrink-0">
      <LogoTile line={line} size={32} />
    </span>
  );
}

// ─────────── DashedArrow ───────────
// Visual connector flanking the shipping-line avatar in the dialog header.
// Dashed line with a chevron tip — communicates "X to Y via this operator."
function DashedArrow() {
  return (
    <svg viewBox="0 0 48 12" className="h-3 w-12 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 6 H38" strokeDasharray="3 3" />
      <path d="M38 2 L44 6 L38 10" />
    </svg>
  );
}

// ─────────── FareBreakdown ───────────
// Itemized fare lines for the voyage dialog. Replaces the cheapest→priciest
// summary with a top-down list grouped by Passenger / Vehicle / Add-ons.
// Each group only renders when it has at least one line.
function FareBreakdown({
  lines,
}: {
  lines: { key: string; label: string; sublabel?: string; amount: number; group: "passenger" | "vehicle" | "addon"; free?: boolean }[] | undefined;
}) {
  // Older voyages persisted before fareLines existed won't have this field.
  // Treat missing/empty the same way.
  if (!lines || lines.length === 0) {
    return (
      <div className="px-5 py-3">
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/40 px-3 py-3 text-center text-[11.5px] text-slate-400">
          No fares configured for this voyage.
        </div>
      </div>
    );
  }

  const groups: { key: "passenger" | "vehicle" | "addon"; title: string }[] = [
    { key: "passenger", title: "Passenger fares" },
    { key: "vehicle",   title: "Vehicle fares" },
    { key: "addon",     title: "Add-ons" },
  ];

  return (
    <div className="px-5 pb-1">
      {groups.map((g) => {
        const items = lines.filter((l) => l.group === g.key);
        if (items.length === 0) return null;
        return (
          <div key={g.key} className="mt-3 first:mt-1">
            <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {g.title}
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((l) => (
                <div key={l.key} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium tracking-tight text-slate-800">
                      {l.label}
                    </div>
                    {l.sublabel && (
                      <div className="truncate text-[10.5px] text-slate-500">{l.sublabel}</div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {l.free ? (
                      <span className="text-[11.5px] font-semibold text-emerald-600">Free</span>
                    ) : (
                      <span className="font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
                        ₱{l.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────── ManifestDialog ───────────
// Everyday audit surface. Each dated departure in the schedule template
// produces one manifest — the passenger/vehicle list the gate crew checks
// at boarding. The dialog browses available manifests as named file cards,
// filterable by vessel; clicking a card downloads that manifest as CSV.
function ManifestDialog({
  open,
  onClose,
  voyages,
}: {
  open: boolean;
  onClose: () => void;
  voyages: Voyage[];
}) {
  const [vesselFilter, setVesselFilter] = useState<string>("all");
  // Departure-date range — manifests are audited daily, so the operator
  // usually wants a narrow window. Defaults to the next 7 days.
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    start: today,
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
  }));

  // Vessel filter options derived from the available voyages.
  const vesselOptions = useMemo(() => {
    const seen = new Set<string>();
    voyages.forEach((v) => seen.add(v.vesselName));
    return [
      { value: "all", label: "All vessels" },
      ...Array.from(seen).sort().map((v) => ({ value: v, label: v })),
    ];
  }, [voyages]);

  // One manifest entry per dated departure, newest first, scoped to the
  // active vessel + departure-date window.
  const manifests = useMemo(() => {
    const rangeStart = new Date(dateRange.start); rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(dateRange.end); rangeEnd.setHours(23, 59, 59, 999);
    return voyages
      .filter((v) => vesselFilter === "all" || v.vesselName === vesselFilter)
      .filter((v) => v.date >= rangeStart && v.date <= rangeEnd)
      .slice()
      .sort((a, b) => {
        const dt = b.date.getTime() - a.date.getTime();
        return dt !== 0 ? dt : a.hour - b.hour;
      });
  }, [voyages, vesselFilter, dateRange]);

  // Build + trigger a CSV download for a single voyage manifest. Mock data
  // until bookings are linked to voyages by id — for now the header rows
  // make the format obvious to the gate crew / backend dev.
  const downloadManifest = (v: Voyage) => {
    const dateLabel = v.date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
    const timeLabel = `${String(v.hour).padStart(2, "0")}:${String(v.minute).padStart(2, "0")}`;
    const lines = [
      `Manifest — ${v.originCode} → ${v.destinationCode}`,
      `Vessel,${v.vesselName}`,
      `Departure,${dateLabel} ${timeLabel}`,
      `Capacity,${v.paxCapacity}`,
      "",
      "Pax #,Name,Ticket ID,Valid ID,Vehicle,Status",
      // Placeholder rows — replaced once bookings carry a voyageId link.
      "—,No bookings linked yet,—,—,—,—",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-${v.originCode}-${v.destinationCode}-${dateLabel.replace(/\//g, "")}-${timeLabel.replace(":", "")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
      {/* Fixed height so the dialog never resizes as the vessel/date filter
          narrows the result set — the card list scrolls internally instead. */}
      <div className="flex h-[720px] max-h-[90vh] flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Voyage manifests</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              One manifest per dated departure. Click a card to download.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Filter bar — vessel filter grows to fill the row; the date-range
            picker keeps its natural width on the right. */}
        <div className="flex items-center gap-2 px-5 py-3">
          <Select
            size="sm"
            value={vesselFilter}
            onChange={setVesselFilter}
            ariaLabel="Filter manifests by vessel"
            className="flex-1"
            options={vesselOptions}
          />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* Result count — its own line below the filters so the calendar
            picker has room to breathe. */}
        <div className="border-b border-slate-100 px-5 pb-3">
          <span className="text-[11.5px] tabular-nums text-slate-500">
            {manifests.length} manifest{manifests.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Manifest cards */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {manifests.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[12.5px] text-slate-400">
              No departures match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {manifests.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => downloadManifest(v)}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-colors duration-150 hover:border-brand-500 hover:ring-1 hover:ring-brand-500 focus:outline-none focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500"
                >
                  {/* File icon tile */}
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
                      <path d="M14 3v6h6" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[12.5px] font-bold uppercase tabular-nums tracking-[0.04em] text-slate-900">
                        {v.originCode} → {v.destinationCode}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-slate-500">{v.vesselName}</div>
                    <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
                      {v.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}
                      {((v.hour + 11) % 12) + 1}:{String(v.minute).padStart(2, "0")} {v.hour < 12 ? "AM" : "PM"}
                    </div>
                  </div>
                  {/* Download affordance */}
                  <span className="mt-0.5 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
