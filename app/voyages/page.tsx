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

  const [hh, mm] = schedule.departureTime.split(":").map(Number);
  const avgDuration =
    (Number(routes.durationLowHrs) + Number(routes.durationHighHrs)) / 2 || 1.5;

  const baseDate = new Date(schedule.departureDate + "T00:00:00");
  if (isNaN(baseDate.getTime())) return [];

  // Build the list of dates this schedule actually runs.
  const dates: Date[] = [];
  if (schedule.recurrence === "once") {
    dates.push(baseDate);
  } else {
    const end = new Date(schedule.endDate + "T00:00:00");
    if (isNaN(end.getTime())) return [];
    const runsKey = new Set(schedule.runsOn);
    const cursor = new Date(baseDate);
    while (cursor <= end) {
      const dow = (cursor.getDay() + 6) % 7;
      const key = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const)[dow];
      if (runsKey.has(key)) dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return dates.map((d, i) => ({
    id: `vy-${Date.now()}-${i}`,
    date: d,
    hour: hh,
    minute: mm,
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

function fmtRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = sameMonth
    ? end.toLocaleDateString("en-US", { day: "numeric" })
    : end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startStr} – ${endStr}, ${end.getFullYear()}`;
}

export default function VoyagesPage() {
  const { active } = useShippingLine();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(TODAY));
  const [vesselFilter, setVesselFilter] = useState<string>("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [portFilter, setPortFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
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
        const parsed: (Omit<Voyage, "date"> & { date: string })[] = JSON.parse(raw);
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
      window.localStorage.setItem(
        "tripket.voyages",
        JSON.stringify(voyages.map((v) => ({ ...v, date: v.date.toISOString() }))),
      );
    } catch {
      // Quota or serialization error — drop silently.
    }
  }, [voyages, hasHydrated]);
  // Which voyage's detail dialog is open (null = closed).
  const [openVoyageId, setOpenVoyageId] = useState<string | null>(null);
  const openVoyage = useMemo(
    () => voyages.find((v) => v.id === openVoyageId) ?? null,
    [voyages, openVoyageId],
  );

  // Auto-saves status changes on the voyage in the list.
  const updateVoyageStatus = (id: string, status: VoyageStatus) =>
    setVoyages((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));

  // Removes a single voyage occurrence (the dialog handles the confirm flow).
  const removeVoyage = (id: string) => {
    setVoyages((prev) => prev.filter((v) => v.id !== id));
    setOpenVoyageId(null);
  };

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const goToday = () => { setWeekStart(startOfWeek(TODAY)); setUsedCustom(false); };
  const prev = () => { setWeekStart((w) => addDays(w, -7)); setUsedCustom(false); };
  const next = () => { setWeekStart((w) => addDays(w, 7));  setUsedCustom(false); };

  // ─── Week-jump presets ───
  // Each preset resolves to a weekStart so the calendar can show the right 7-day window.
  // The trigger label below picks the preset whose start matches the current weekStart,
  // falling back to "Custom range" so users always know what they're looking at.
  const presets = useMemo(() => {
    const thisWeek = startOfWeek(TODAY);
    return [
      { id: "this",  label: "This week", start: thisWeek },
      { id: "next",  label: "Next week", start: addDays(thisWeek, 7) },
      { id: "last",  label: "Last week", start: addDays(thisWeek, -7) },
      { id: "in30",  label: "In 30 days",  start: startOfWeek(addDays(TODAY, 30)) },
      { id: "ago30", label: "30 days ago", start: startOfWeek(addDays(TODAY, -30)) },
    ];
  }, []);
  // When the user picks a date through the custom picker, we lock the trigger to
  // "Custom range" even if their picked week happens to coincide with a named preset.
  // The flag clears whenever a named preset is selected or the navigator (‹/›/Jump to today)
  // is used.
  const [usedCustom, setUsedCustom] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // Slot the operator clicked to seed the wizard's Schedule step. Cleared on
  // close so the next plain-button create starts fresh.
  const [createPrefill, setCreatePrefill] = useState<{ date: Date; hour: number } | null>(null);
  const activePresetLabel = useMemo(() => {
    if (usedCustom) return "Custom range";
    const hit = presets.find((p) => sameDay(p.start, weekStart));
    return hit?.label ?? "Custom range";
  }, [presets, weekStart, usedCustom]);

  const [presetOpen, setPresetOpen] = useState(false);
  // When the preset menu's "Custom range…" item is picked, swap to the date-picker view
  // *inside the same popover surface* so it feels like a single, connected control.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(() => new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
  const presetWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!presetOpen && !pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (presetWrapRef.current && !presetWrapRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
        setPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Back out of the date picker into the preset menu first; second Escape closes.
        if (pickerOpen) setPickerOpen(false);
        else setPresetOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [presetOpen, pickerOpen]);

  // Custom-range trigger label — "Week of MMM D" when the visible week doesn't match a preset.
  const customLabel = useMemo(
    () => `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    [weekStart],
  );
  const triggerLabel = activePresetLabel === "Custom range" ? customLabel : activePresetLabel;

  return (
    // Fill the scroll container — the page itself never scrolls.
    // Only the calendar's hour-grid scrolls (see the inner wrapper below).
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Voyages"
        subtitle={active.name}
        showDateFilter={false}
        right={
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create schedule
          </button>
        }
      />

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
        {/* ─── Toolbar ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-brand-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vessel or route"
                className="w-52 bg-transparent placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <Select
              size="sm"
              value={portFilter}
              onChange={setPortFilter}
              ariaLabel="Filter by port"
              className="w-36"
              options={[{ value: "all", label: "All ports" }]}
            />

            <Select
              size="sm"
              value={vesselFilter}
              onChange={setVesselFilter}
              ariaLabel="Filter by vessel"
              className="w-40"
              options={[{ value: "all", label: "All vessels" }]}
            />

            <Select
              size="sm"
              value={routeFilter}
              onChange={setRouteFilter}
              ariaLabel="Filter by route"
              className="w-36"
              options={[{ value: "all", label: "All routes" }]}
            />
          </div>

          {/* Week navigator */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous week"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            {/* Preset dropdown — replaces the plain Today button.
                Label reflects whatever range is currently shown; menu lets users jump
                to common week windows. The "Jump to today" item resets to the current week. */}
            <div className="relative" ref={presetWrapRef}>
              <button
                type="button"
                onClick={() => {
                  // Toggle: if already open in either mode, close both. Otherwise open preset list.
                  if (presetOpen || pickerOpen) {
                    setPresetOpen(false);
                    setPickerOpen(false);
                  } else {
                    setPresetOpen(true);
                  }
                }}
                aria-haspopup="menu"
                aria-expanded={presetOpen || pickerOpen}
                className={
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium transition-colors " +
                  // When the visible week is a custom range, paint the trigger brand orange
                  // so the user sees at a glance that they're on a hand-picked range.
                  (activePresetLabel === "Custom range"
                    ? presetOpen || pickerOpen
                      ? "border-brand-300 bg-brand-100 text-brand-700"
                      : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                    : presetOpen || pickerOpen
                      ? "border-slate-300 bg-slate-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                }
              >
                {activePresetLabel === "Custom range" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-brand-600">
                    <rect x="3.5" y="5" width="17" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3.5 10h17" />
                  </svg>
                )}
                {triggerLabel}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={
                    "h-3 w-3 " +
                    (activePresetLabel === "Custom range" ? "text-brand-500" : "text-slate-400")
                  }
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {presetOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 z-40 mt-1.5 w-44 overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-8px_rgba(15,23,42,0.18)]"
                  style={{ animation: "row-menu-in 120ms cubic-bezier(0.16, 1, 0.3, 1)" }}
                >
                  {/* Quick reset — sits above the named presets so users always have a
                      one-tap path back to "now", even when on a Custom range. */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { goToday(); setPresetOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100/80 hover:text-slate-900"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    Jump to today
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  {presets.map((p) => {
                    const active = sameDay(p.start, weekStart);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="menuitem"
                        onClick={() => { setWeekStart(p.start); setUsedCustom(false); setPresetOpen(false); }}
                        className={
                          "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors " +
                          (active
                            ? "bg-brand-50 text-brand-700"
                            : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900")
                        }
                      >
                        <span>{p.label}</span>
                        {active && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-brand-500">
                            <path d="M5 12l5 5 9-11" />
                          </svg>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom range — opens a single-date picker. We pick a date, snap to
                      the start of that week, and close. Simpler than a from/to flow
                      since the calendar's atomic unit is already a week. */}
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPickerMonth(new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
                      setPresetOpen(false);
                      setPickerOpen(true);
                    }}
                    className={
                      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors " +
                      (activePresetLabel === "Custom range"
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900")
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={
                          "h-3.5 w-3.5 " +
                          (activePresetLabel === "Custom range" ? "text-brand-500" : "text-slate-400")
                        }
                      >
                        <rect x="3.5" y="5" width="17" height="16" rx="2" />
                        <path d="M8 3v4M16 3v4M3.5 10h17" />
                      </svg>
                      Custom range…
                    </span>
                    {activePresetLabel === "Custom range" && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-brand-500">
                        <path d="M5 12l5 5 9-11" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              {/* Date picker popover — single date select, snaps to the containing week */}
              {pickerOpen && (
                <MiniDatePicker
                  month={pickerMonth}
                  onMonthChange={setPickerMonth}
                  selected={weekStart}
                  today={TODAY}
                  onPick={(d) => {
                    setWeekStart(startOfWeek(d));
                    setUsedCustom(true);
                    setPickerOpen(false);
                  }}
                  onBack={() => { setPickerOpen(false); setPresetOpen(true); }}
                />
              )}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Next week"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Week summary ─── */}
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">All schedules</h2>
          <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-slate-500">{fmtRange(weekStart, weekEnd)}</p>
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
                    <div
                      className={
                        "text-[10.5px] font-semibold uppercase tracking-[0.12em] " +
                        (isToday ? "text-brand-700" : "text-slate-600")
                      }
                    >
                      {DAY_NAMES[i]}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={
                          "text-[15px] font-semibold tracking-tight " +
                          (isToday ? "text-brand-700" : "text-slate-900")
                        }
                      >
                        {d.getDate()}
                      </span>
                      <span className={"text-[11px] " + (isToday ? "text-brand-600" : "text-slate-500")}>
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      {isToday && (
                        <span className="ml-0.5 inline-flex items-center rounded-full bg-brand-500 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white">
                          Today
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hour rows — vertically scrollable inside the card.
                Voyage blocks render as an absolutely-positioned overlay so
                they can span fractional hours and sit on top of the cells. */}
            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {/* ── Voyage overlay ── */}
              <VoyageOverlay voyages={voyages} days={days} onOpenVoyage={setOpenVoyageId} />

              {HOURS.map((h, rowIdx) => (
                <div
                  key={h}
                  // Inset shadow instead of border-top so the row's box-model
                  // stays exactly 56px tall — keeps the voyage overlay's math
                  // (hour × 56) accurate regardless of how many rows precede.
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

                  {/* Day cells — empty by default, brand-tinted hover with a plus glyph
                      invites the user to schedule a new voyage at that day+hour slot. */}
                  {days.map((d, dayIdx) => {
                    const isToday = sameDay(d, TODAY);
                    return (
                      <Tooltip
                        key={dayIdx}
                        variant="light"
                        delay={250}
                        className="block"
                        content="Add schedule"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setCreatePrefill({ date: d, hour: h });
                            setCreateOpen(true);
                          }}
                          aria-label={`Add schedule on ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${fmtHour(h)}`}
                          className={
                            "group relative h-14 w-full border-l border-slate-200 transition-colors duration-100 " +
                            "hover:bg-brand-50/40 focus-visible:bg-brand-50/40 focus-visible:outline-none " +
                            (isToday ? "bg-brand-50/30" : "")
                          }
                        >
                          {/* Plus glyph — fades in only on hover/focus */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4 text-brand-500"
                            >
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Footer — voyage tally + create CTA. Copy adapts to whether
             the operator has any voyages at all, none in this week, or
             some in view. ─── */}
        {(() => {
          const visibleCount = voyages.filter((v) => v.date >= weekStart && v.date <= weekEnd).length;
          const totalCount = voyages.length;
          let primary: string;
          let secondary: string | null = null;
          if (totalCount === 0) {
            primary = "No voyages yet.";
            secondary = "Get started with your first schedule.";
          } else if (visibleCount === 0) {
            primary = `Nothing this week.`;
            secondary = `${totalCount.toLocaleString()} voyage${totalCount === 1 ? "" : "s"} on other weeks — use the navigator to find them.`;
          } else {
            primary = `${visibleCount.toLocaleString()} voyage${visibleCount === 1 ? "" : "s"} this week.`;
            if (totalCount > visibleCount) {
              secondary = `${(totalCount - visibleCount).toLocaleString()} more on other weeks.`;
            }
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
          // Append voyages to whatever's already on the calendar. We only
          // jump the visible week if the new voyage falls *outside* the
          // current view — otherwise Today stays anchored in place.
          const newVoyages = expandSchedulePayload(payload);
          if (newVoyages.length === 0) return;
          setVoyages((prev) => [...prev, ...newVoyages]);
          const first = newVoyages[0].date;
          const currentEnd = addDays(weekStart, 6);
          if (first < weekStart || first > currentEnd) {
            setWeekStart(startOfWeek(first));
            setUsedCustom(false);
          }
        }}
      />

      <VoyageDetailDialog
        voyage={openVoyage}
        open={!!openVoyage}
        onClose={() => setOpenVoyageId(null)}
        onStatusChange={updateVoyageStatus}
        onRemove={removeVoyage}
      />
    </div>
  );
}

// ─────────── MiniDatePicker ───────────
// Mirrors the dashboard's DateRangePicker UX: From/To inputs at the top, a single
// month with prev/next chevrons, two-click range selection with a hover preview,
// and a Clear / Today footer. Picking a complete range hands the *start date* back
// to the parent, which snaps the calendar to that day's week (the voyages page
// always shows one week at a time).
function MiniDatePicker({ 
  month,
  onMonthChange,
  selected,
  today,
  onPick,
  onBack,
}: {
  month: Date;
  onMonthChange: (m: Date) => void;
  /** The currently-visible week start — used to seed the From/To range. */
  selected: Date;
  today: Date;
  /** Called with the range start once the user finalises a selection. */
  onPick: (d: Date) => void;
  onBack: () => void;
}) {
  // Local range state — committed up to the parent only when the user clicks the
  // second date (or hits the inputs' Enter/blur).
  const seedEnd = addDays(selected, 6);
  const [range, setRange] = useState<{ start: Date; end: Date }>({ start: selected, end: seedEnd });
  const [pickStart, setPickStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [fromInput, setFromInput] = useState(fmtMDY(range.start));
  const [toInput, setToInput] = useState(fmtMDY(range.end));

  useEffect(() => {
    setFromInput(fmtMDY(range.start));
    setToInput(fmtMDY(range.end));
  }, [range.start, range.end]);

  const previewRange = useMemo<{ start: Date; end: Date } | null>(() => {
    if (pickStart && hoverDate) {
      const start = hoverDate < pickStart ? hoverDate : pickStart;
      const end = hoverDate < pickStart ? pickStart : hoverDate;
      return { start, end };
    }
    return null;
  }, [pickStart, hoverDate]);
  const activeRange = previewRange ?? range;

  const handleDayClick = (d: Date) => {
    if (!pickStart) {
      setPickStart(d);
      setHoverDate(d);
      return;
    }
    const start = d < pickStart ? d : pickStart;
    const end = d < pickStart ? pickStart : d;
    setRange({ start, end });
    setPickStart(null);
    setHoverDate(null);
    // Commit upward — the parent snaps to the start of this week.
    onPick(start);
  };

  const handleInputCommit = (which: "from" | "to", raw: string) => {
    const parsed = parseMDY(raw);
    if (!parsed) {
      if (which === "from") setFromInput(fmtMDY(range.start));
      else setToInput(fmtMDY(range.end));
      return;
    }
    let nextStart = range.start, nextEnd = range.end;
    if (which === "from") {
      nextStart = parsed;
      if (parsed > range.end) nextEnd = parsed;
    } else {
      nextEnd = parsed;
      if (parsed < range.start) nextStart = parsed;
    }
    setRange({ start: nextStart, end: nextEnd });
    onPick(nextStart);
  };

  const handleClear = () => {
    setRange({ start: today, end: today });
    setPickStart(null);
    setHoverDate(null);
  };
  const handleTodayBtn = () => {
    setRange({ start: today, end: today });
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));
    setPickStart(null);
    setHoverDate(null);
    onPick(today);
  };

  // Build a 6×7 month grid, Monday-first to match the calendar's ISO week.
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstWeekday + 1;
    return new Date(month.getFullYear(), month.getMonth(), day);
  });

  return (
    <div
      role="dialog"
      aria-label="Choose a date range"
      className="absolute right-0 z-40 mt-1.5 w-[320px] overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-8px_rgba(15,23,42,0.18)]"
      style={{ animation: "row-menu-in 120ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {/* Top strip — back arrow + title */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to presets"
          className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[12.5px] font-semibold tracking-tight text-slate-900">Date range</div>
      </div>

      {/* From / To inputs */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <MDYField label="From" value={fromInput} onChange={setFromInput} onCommit={(v) => handleInputCommit("from", v)} />
        <MDYField label="To"   value={toInput}   onChange={setToInput}   onCommit={(v) => handleInputCommit("to", v)} />
      </div>

      <div className="h-px bg-slate-100" />

      {/* Month header + nav */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <div className="text-[12.5px] font-semibold tracking-tight text-slate-900">
          {month.toLocaleDateString("en-US", { month: "long" })}
          <span className="ml-1 tabular-nums text-slate-500">{month.getFullYear()}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Previous month"
            className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Next month"
            className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 pb-1 text-center text-[10px] font-medium text-slate-400">
        {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => <div key={i}>{w}</div>)}
      </div>

      {/* Day cells — two-click range with hover preview */}
      <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-2 text-center">
        {cells.map((d, ci) => {
          const inMonth = d.getMonth() === month.getMonth();
          const isStart = sameDay(d, activeRange.start);
          const isEnd = sameDay(d, activeRange.end);
          const isInRange = isBetween(d, activeRange.start, activeRange.end);
          const isEdge = isStart || isEnd;
          const isSinglePick = sameDay(activeRange.start, activeRange.end);
          const isCellToday = sameDay(d, today);

          return (
            <button
              key={ci}
              type="button"
              onClick={() => handleDayClick(d)}
              onMouseEnter={() => pickStart && setHoverDate(d)}
              disabled={!inMonth}
              className={
                "relative grid h-8 place-items-center text-[12px] tabular-nums transition-colors duration-100 disabled:cursor-default " +
                (isInRange && !isEdge && !isSinglePick ? "bg-brand-50 text-brand-700 " : "") +
                (isEdge ? "z-10 rounded-md bg-brand-500 font-semibold text-white " : "") +
                (!isInRange && !isEdge && inMonth ? "rounded-md text-slate-700 hover:bg-slate-100 " : "") +
                (!inMonth ? "text-slate-300 " : "")
              }
            >
              {d.getDate()}
              {isCellToday && !isEdge && (
                <span className="absolute bottom-1 h-0.5 w-3 rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer — Clear / Today */}
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={handleClear}
          className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleTodayBtn}
          className="text-[12px] font-medium text-brand-600 transition-opacity hover:opacity-80"
        >
          Today
        </button>
      </div>
    </div>
  );
}

// ─────────── Date input helpers ───────────
function fmtMDY(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
function parseMDY(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
  return isNaN(d.getTime()) ? null : d;
}
function isBetween(d: Date, a: Date, b: Date): boolean {
  const t = d.getTime();
  return t >= Math.min(a.getTime(), b.getTime()) && t <= Math.max(a.getTime(), b.getTime());
}

function MDYField({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white pl-2 pr-1.5 transition-[box-shadow,border-color] duration-150 ease-out focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="MM/DD/YYYY"
          className="w-full bg-transparent py-1 text-[12px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-400">
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
      </div>
    </label>
  );
}


// ─────────── VoyageOverlay — calendar blocks for created voyages ───────────
// Absolutely positioned over the hour grid. Each block:
//  - Sits in the column matching its date (one of the 7 days currently shown)
//  - Top offset = (voyage.hour + minute/60 - 4) × HOUR_ROW_HEIGHT
//  - Height    = voyage.durationHours × HOUR_ROW_HEIGHT, with a minimum
// HOUR_ROW_HEIGHT must match the calendar's row height (h-14 = 56px).
function VoyageOverlay({
  voyages,
  days,
  onOpenVoyage,
}: {
  voyages: Voyage[];
  days: Date[];
  onOpenVoyage: (id: string) => void;
}) {
  const HOUR_ROW = 56;       // matches h-14 on each hour cell
  const MIN_HOUR = 4;        // matches HOURS[0]
  const TIME_AXIS_W = 120;   // matches grid-cols-[120px_repeat(7,…)]

  // Map each visible day to its column index 0..6 for fast lookup.
  const dayCol = new Map<string, number>();
  days.forEach((d, i) => dayCol.set(d.toDateString(), i));

  const visible = voyages.filter((v) => dayCol.has(v.date.toDateString()));

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className="grid h-full"
        style={{ gridTemplateColumns: `${TIME_AXIS_W}px repeat(7, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((_, i) => (
          <div key={i} className="relative">
            {visible
              .filter((v) => dayCol.get(v.date.toDateString()) === i)
              .map((v) => {
                // Each block sits in its **departure hour cell**. Top offset
                // aligns with the hour row; height is fixed to the row height
                // so the card always fits inside one slot — never bleeds down.
                // Duration is represented by the left accent bar's pseudo
                // length below, not by stretching the card.
                const top = (v.hour + v.minute / 60 - MIN_HOUR) * HOUR_ROW;
                return (
                  <VoyageBlock
                    key={v.id}
                    voyage={v}
                    top={top}
                    rowHeight={HOUR_ROW}
                    onOpen={() => onOpenVoyage(v.id)}
                  />
                );
              })}
          </div>
        ))}
      </div>
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

function VoyageBlock({
  voyage,
  top,
  rowHeight,
  onOpen,
}: {
  voyage: Voyage;
  top: number;
  rowHeight: number;
  onOpen: () => void;
}) {
  // The card sits inside the hour cell with a 2px gutter so it doesn't kiss
  // the cell border (and 4px horizontal so it doesn't cover the day divider).
  const cardHeight = rowHeight - 4;

  // ── Past / today / future classification ──
  // Past voyages always ghost regardless of status. For `Scheduled` voyages
  // we further split today vs. future so the today column anchors in brand
  // orange while the rest of the week reads in sky blue.
  const nowMinutes = TODAY.getTime() / 60000 + NOW_HOUR * 60;
  const voyageMinutes =
    new Date(voyage.date.getFullYear(), voyage.date.getMonth(), voyage.date.getDate()).getTime() / 60000 +
    voyage.hour * 60 +
    voyage.minute;
  const isPast = voyageMinutes < nowMinutes;
  const isToday = sameDay(voyage.date, TODAY);
  const toneKey: StatusCardToneKey =
    voyage.status === "Scheduled" && !isToday ? "ScheduledFuture" : voyage.status;
  const tone = STATUS_CARD_TONE[toneKey];

  return (
    <div
      className="pointer-events-auto absolute left-0.5 right-0.5"
      style={{ top: top + 2, height: cardHeight }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${voyage.originCode} to ${voyage.destinationCode} on ${voyage.vesselName} — ${voyage.status.toLowerCase()}${isPast ? " (past)" : ""}`}
        className={
          // Past voyages use a solid muted slate fill — no opacity, no
          // grayscale. Those filters caused sub-pixel double-rendering on the
          // text and let the cell border bleed through behind the card.
          "group/voyage relative flex h-full w-full flex-col justify-center overflow-hidden rounded-lg pl-3 pr-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,transform] duration-150 ease-out " +
          (isPast
            ? "bg-slate-50 hover:bg-slate-100 "
            : `${tone.bg} hover:-translate-y-px ${tone.hoverShadow} `) +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        }
      >
        {/* Solid left accent stripe — colored per status (brand / sky /
            emerald / rose). Ghosted past voyages get a slate accent to keep
            the silhouette consistent without competing for attention. */}
        <span
          aria-hidden
          className={
            "pointer-events-none absolute inset-y-0 left-0 w-[3px] " +
            (isPast ? "bg-slate-300" : tone.accent)
          }
        />
        {/* Route — headline. */}
        <span
          className={
            "truncate font-mono text-[11.5px] font-bold uppercase tabular-nums tracking-[0.08em] " +
            (isPast
              ? "text-slate-500 "
              : `${tone.routeText} ${tone.strike ? "line-through decoration-rose-400/70 " : ""}`)
          }
        >
          {voyage.originCode}
          <span
            className={"mx-1 " + (isPast ? "text-slate-400" : tone.arrow)}
            aria-hidden
          >
            →
          </span>
          {voyage.destinationCode}
        </span>
        {/* Vessel — supporting caption. */}
        <span
          className={
            "truncate text-[10.5px] font-medium tracking-tight " +
            (isPast ? "text-slate-400" : tone.vesselText)
          }
        >
          {voyage.vesselName}
        </span>
      </button>
    </div>
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
const STATUS_CHIP_TONE = {
  active: "bg-brand-500 text-white ring-brand-500",
  rest: "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
} as const;

const STATUS_CHIPS: { key: VoyageStatus; label: string }[] = [
  { key: "Scheduled", label: "Scheduled" },
  { key: "Departed", label: "Departed" },
  { key: "Arrived", label: "Arrived" },
  { key: "Cancelled", label: "Cancelled" },
];

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
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  // Reset confirm state any time the dialog closes or the voyage changes.
  useEffect(() => {
    if (!open) setConfirmingRemove(false);
  }, [open, voyage?.id]);

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

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col">
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

        {/* Detail rows */}
        <dl className="divide-y divide-slate-100 px-5 py-2">
          <DetailRow label="Vessel" value={vesselLine || "—"} />
          <DetailRow
            label="Bookings"
            value={
              <span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">
                  {voyage.paxConfirmed.toLocaleString()}
                </span>
                <span className="text-slate-400"> / {voyage.paxCapacity.toLocaleString()}</span>
              </span>
            }
          />
        </dl>

        {/* Itemized fares — passenger tiers, vehicle classes, add-ons. Each
            group separated by a small slate eyebrow so the breakdown reads
            top-down without crowding the rows above. */}
        <FareBreakdown lines={voyage.fareLines} />

        <div className="border-t border-slate-100" />

        {/* Status — inline chip group, auto-saves on click */}
        <div className="px-5 py-4">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Status
          </div>
          <div role="radiogroup" aria-label="Voyage status" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {STATUS_CHIPS.map((s) => {
              const on = voyage.status === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onStatusChange(voyage.id, s.key)}
                  className={
                    "rounded-lg px-2.5 py-1.5 text-[12px] font-medium tracking-tight ring-1 transition-colors duration-150 " +
                    (on ? STATUS_CHIP_TONE.active : STATUS_CHIP_TONE.rest)
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Destructive footer — two-step remove. First click reveals a confirm
            row; second click actually deletes. Keeps an accidental dismissal
            cheap (Cancel beside Remove). */}
        <div className="flex items-center justify-end gap-2 px-5 py-3">
          {confirmingRemove ? (
            <>
              <span className="mr-auto text-[12px] text-slate-600">
                Remove this voyage?
              </span>
              <button
                type="button"
                onClick={() => setConfirmingRemove(false)}
                className="rounded-md px-2.5 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onRemove(voyage.id)}
                className="rounded-md bg-rose-600 px-2.5 py-1 text-[12px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors hover:bg-rose-700"
              >
                Yes, remove
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
              </svg>
              Remove voyage
            </button>
          )}
        </div>
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
