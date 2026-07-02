"use client";
import { useMemo } from "react";
import type { ScheduleValue, DayKey } from "@/components/schedule-steps/ScheduleStep";
import type { RoutesValue, Port } from "@/components/schedule-steps/RoutesStep";
import { PORTS, findPort } from "@/components/schedule-steps/RoutesStep";
import type { VesselValue, FleetVessel } from "@/components/schedule-steps/VesselStep";
import { useCustomPorts } from "@/lib/custom-ports";

/**
 * Review step — final stop of the Create-Schedule wizard.
 *
 * Treats the schedule like a real itinerary the operator is about to commit:
 *  - Hero: boarding-pass card with origin/destination codes + perforated stats strip
 *  - 2×2 detail grid: Schedule / Route / Vessel / Fares, each with Edit jump-back
 *  - Footer confirm copy
 *
 * Because every previous step gates Continue on completeness, we don't render
 * a warning banner — anything that lands here is by definition valid.
 */

const DAY_SHORT: Record<DayKey, string> = {
  Mon: "M", Tue: "T", Wed: "W", Thu: "Th", Fri: "F", Sat: "S", Sun: "Su",
};
const DAY_LONG: Record<DayKey, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

// Note: passenger / vehicle / add-on metadata now comes from the vessel's
// own catalog (vessel.passengerTypes / vehicleClasses / addOns), so there
// are no static records here anymore.

export default function ReviewStep({
  schedule,
  routes,
  vessel,
  fleet,
  onEdit,
}: {
  schedule: ScheduleValue;
  routes: RoutesValue;
  vessel: VesselValue;
  fleet: FleetVessel[];
  onEdit: (stepIdx: number) => void;
}) {
  // ── Cross-step lookups ──
  const customPorts = useCustomPorts();
  const allPorts = useMemo(() => [...PORTS, ...customPorts], [customPorts]);
  const origin      = useMemo(() => findPort(allPorts, routes.originCode), [allPorts, routes.originCode]);
  const destination = useMemo(() => findPort(allPorts, routes.destinationCode), [allPorts, routes.destinationCode]);
  const pickedFleet = useMemo(() => fleet.find((v) => v.id === vessel.fleetVesselId) ?? null, [fleet, vessel.fleetVesselId]);

  const vesselName  = vessel.mode === "fleet" ? pickedFleet?.name ?? null : vessel.name.trim() || null;
  const vesselType  = vessel.mode === "fleet" ? pickedFleet?.type ?? null : vessel.type;
  const vesselPax   = vessel.mode === "fleet" ? pickedFleet?.passengerCapacity ?? 0 : Number(vessel.passengerCapacity) || 0;
  const vesselSlots = vessel.mode === "fleet" ? pickedFleet?.vehicleSlots ?? 0 : Number(vessel.vehicleSlots) || 0;
  const vesselImo   = vessel.mode === "fleet" ? null : vessel.imoNumber.trim() || null;

  // ── Trips projection over the next 30 days ──
  // The server expands the schedule across a rolling 30-day window; we
  // mirror that math here so the review screen agrees with the calendar.
  const RANGE_DAYS = 30;
  const tripsTotal = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dowKeys: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let count = 0;
    for (let offset = 0; offset < RANGE_DAYS; offset++) {
      const c = new Date(start);
      c.setDate(c.getDate() + offset);
      const dow = (c.getDay() + 6) % 7;
      count += schedule.dayTimes[dowKeys[dow]]?.length ?? 0;
    }
    return count;
  }, [schedule]);

  // Weekdays that have at least one selected time. Used by the review card
  // to render the WeekdayChips.
  const activeDays = useMemo<DayKey[]>(() => {
    const order: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return order.filter((k) => (schedule.dayTimes[k]?.length ?? 0) > 0);
  }, [schedule]);

  // First-of-day time for the hero ETA calculation — picks the earliest
  // slot on the earliest active weekday so the boarding-pass card has
  // something concrete to show.
  const sampleDepartureTime = useMemo(() => {
    for (const k of activeDays) {
      const hours = schedule.dayTimes[k];
      if (hours && hours.length > 0) {
        const h = hours[0];
        return `${String(h).padStart(2, "0")}:00`;
      }
    }
    return "";
  }, [schedule.dayTimes, activeDays]);

  // ── Estimated arrival time for the hero pill ──
  // Uses the first slot of the first active weekday as a representative
  // departure since the schedule has many possible departure times.
  const eta = useMemo(() => {
    const m = sampleDepartureTime?.match(/^(\d{1,2}):(\d{2})$/);
    const avg = (Number(routes.durationLowHrs) + Number(routes.durationHighHrs)) / 2;
    if (!m || !Number.isFinite(avg) || avg <= 0) return null;
    const startMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const total = Math.round(startMin + avg * 60);
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    const period = endH < 12 ? "AM" : "PM";
    const h12 = ((endH + 11) % 12) + 1;
    const overnight = total >= 24 * 60;
    return `${h12}:${String(endM).padStart(2, "0")} ${period}${overnight ? " (next day)" : ""}`;
  }, [sampleDepartureTime, routes.durationLowHrs, routes.durationHighHrs]);

  return (
    <div className="space-y-5 [&>*]:[animation:review-fade-in_360ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <style>{`
        @keyframes review-fade-in {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        /* ── Emil-style collapse / expand for native <details> ──
           Animates ::details-content height + opacity in *both* directions.
           Requires:
             • interpolate-size on a parent so block-size: auto is animatable
             • transition-behavior: allow-discrete so display: none can hold
               long enough for the closing animation to play
             • @starting-style so the opening transition starts from height 0 */
        :root { interpolate-size: allow-keywords; }

        details.review-section::details-content {
          block-size: 0;
          opacity: 0;
          overflow: clip;
          transition:
            content-visibility 280ms cubic-bezier(0.16, 1, 0.3, 1) allow-discrete,
            display              280ms cubic-bezier(0.16, 1, 0.3, 1) allow-discrete,
            opacity              200ms cubic-bezier(0.16, 1, 0.3, 1),
            block-size           280ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        details.review-section[open]::details-content {
          block-size: auto;
          opacity: 1;
        }
        /* When opening, start from collapsed state so the height transition runs. */
        @starting-style {
          details.review-section[open]::details-content {
            block-size: 0;
            opacity: 0;
          }
        }
      `}</style>

      {/* ─── Single-column timeline ───
         Four sections stack vertically with hairline dividers between them.
         Reads like a printed itinerary — one fact per row, top to bottom. */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 [&>*]:[animation:review-fade-in_360ms_cubic-bezier(0.16,1,0.3,1)_both] [&>*:nth-child(1)]:[animation-delay:120ms] [&>*:nth-child(2)]:[animation-delay:180ms] [&>*:nth-child(3)]:[animation-delay:240ms] [&>*:nth-child(4)]:[animation-delay:300ms]">
        {/* Schedule */}
        <ReviewCard
          title="Schedule"
          subtitle={`Recurring over ${RANGE_DAYS} days`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3.5" y="5" width="17" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3.5 10h17" />
            </svg>
          }
          onEdit={() => onEdit(0)}
        >
          <DefList>
            {schedule.label?.trim() && (
              <DefRow label="Label" value={schedule.label.trim()} />
            )}
            <DefRow label="Runs on" value={<WeekdayChips active={activeDays} />} />
            {activeDays.map((k) => {
              const hours = schedule.dayTimes[k] ?? [];
              return (
                <DefRow
                  key={k}
                  label={k}
                  value={
                    <span className="flex flex-wrap gap-1.5">
                      {hours.map((h) => (
                        <span key={h} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums text-slate-700">
                          {formatHourLabel(h)}
                        </span>
                      ))}
                    </span>
                  }
                />
              );
            })}
            <DefRow
              label="Voyages"
              value={
                <span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">{tripsTotal}</span>
                  <span className="ml-1 text-[10.5px] text-slate-400">over the next {RANGE_DAYS} days</span>
                </span>
              }
            />
          </DefList>
        </ReviewCard>

        {/* Route */}
        <ReviewCard
          title="Route"
          subtitle={routes.createReturn ? "Both directions" : "One-way"}
          icon={
            // Map pin — universally legible "place / route" glyph.
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          }
          onEdit={() => onEdit(1)}
        >
          <DefList>
            <DefRow label="Origin" value={origin ? <PortLine port={origin} /> : <Empty />} />
            <DefRow label="Destination" value={destination ? <PortLine port={destination} /> : <Empty />} />
            <DefRow label="Distance" value={routes.distanceNm ? <Stat value={routes.distanceNm} unit="nm" /> : <Empty />} />
            <DefRow
              label="Crossing"
              value={
                routes.durationLowHrs && routes.durationHighHrs ? (
                  <Stat value={`${routes.durationLowHrs}–${routes.durationHighHrs}`} unit="hrs" />
                ) : (
                  <Empty />
                )
              }
            />
            {routes.createReturn && (
              <DefRow
                label="Return leg"
                value={
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-medium text-brand-700 ring-1 ring-brand-100">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                      <path d="M17 4l4 4-4 4M3 8h18M7 20l-4-4 4-4M21 16H3" />
                    </svg>
                    Will be created
                  </span>
                }
              />
            )}
          </DefList>
        </ReviewCard>

        {/* Vessel — collapsed by default; subtitle carries the headline at a glance. */}
        <ReviewCard
          title="Vessel"
          defaultOpen={false}
          subtitle={
            vesselName
              ? `${vesselName} · ${prettyType(vesselType ?? "")} · ${vesselPax.toLocaleString()} pax`
              : vessel.mode === "fleet"
                ? "From your fleet"
                : "New registration"
          }
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 17h18l-2 3H5l-2-3Z" />
              <rect x="5" y="11" width="14" height="6" rx="1" />
              <path d="M8 11V7h8v4" />
            </svg>
          }
          onEdit={() => onEdit(2)}
          badge={
            vessel.mode === "new" ? (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-brand-700 ring-1 ring-brand-100">
                New
              </span>
            ) : null
          }
        >
          {vesselName ? (
            <DefList>
              <DefRow label="Name" value={<span className="font-semibold text-slate-900">{vesselName}</span>} />
              {vesselType && <DefRow label="Type" value={prettyType(vesselType)} />}
              <DefRow label="Passengers" value={<Stat value={vesselPax.toLocaleString()} unit="pax" />} />
              {vesselSlots > 0 && <DefRow label="Vehicle deck" value={<Stat value={vesselSlots} unit="slots" />} />}
              {vesselImo && <DefRow label="IMO no." value={<Mono>{vesselImo}</Mono>} />}
            </DefList>
          ) : (
            <EmptyHint message="No vessel selected yet." />
          )}
        </ReviewCard>
      </div>
    </div>
  );
}

// ─────────── Review card shell ───────────
// Uses native <details> so each section can collapse independently — keeps the
// review page short while still letting operators expand any section to
// inspect specifics. Schedule + Route default to open (the most-checked
// surfaces); Vessel + Fares default to closed and lead with a one-line summary.
function ReviewCard({
  title, subtitle, icon, onEdit, badge, defaultOpen = true, children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onEdit: () => void;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  void icon; // API stability — header alone is enough hierarchy.
  return (
    <details open={defaultOpen} className="review-section group/card [&[open]_.chevron]:rotate-180">
      <summary className="flex cursor-pointer items-baseline justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50/60 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="chevron h-3 w-3 shrink-0 text-slate-400 transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <h4 className="text-[13.5px] font-semibold tracking-tight text-slate-900">{title}</h4>
            {badge}
          </div>
          {subtitle && (
            <div className="mt-0.5 truncate pl-[18px] text-[11.5px] text-slate-500">{subtitle}</div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
          aria-label={`Edit ${title.toLowerCase()}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium text-brand-700 transition-colors duration-150 ease-out hover:bg-brand-50 active:scale-[0.97]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit
        </button>
      </summary>
      <div className="px-5 pb-4 pl-[34px]">{children}</div>
    </details>
  );
}

// ─────────── Definition-list primitives ───────────
// Rows now sit on a flat label/value baseline with sentence-case labels and a
// hairline divider between entries. Easier to scan top-down than the previous
// uppercase-mono variant which competed with the hero card.
function DefList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-slate-100">{children}</dl>;
}

function DefRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-[12px] text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-[12.5px] font-medium tracking-tight text-slate-900">{value}</dd>
    </div>
  );
}

function WeekdayChips({ active }: { active: DayKey[] }) {
  const set = new Set(active);
  const allKeys: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <span className="inline-flex items-center gap-0.5">
      {allKeys.map((k) => (
        <span
          key={k}
          className={
            "grid h-5 w-5 place-items-center rounded text-[10px] font-semibold tabular-nums " +
            (set.has(k) ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400")
          }
          title={DAY_LONG[k]}
        >
          {DAY_SHORT[k]}
        </span>
      ))}
    </span>
  );
}

function PortLine({ port }: { port: Port }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-medium text-slate-900">{port.name ?? port.city}</span>
      {port.name && <span className="text-[10.5px] text-slate-400">{port.city}</span>}
    </span>
  );
}

function Stat({ value, unit }: { value: string | number; unit: string }) {
  return (
    <span>
      <span className="font-mono font-semibold tabular-nums text-slate-900">{value}</span>
      <span className="ml-1 text-[10.5px] text-slate-400">{unit}</span>
    </span>
  );
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={"font-mono font-semibold tabular-nums " + (className ?? "text-slate-900")}>
      {children}
    </span>
  );
}

function Empty() {
  return <span className="text-slate-400">—</span>;
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/40 px-3 py-3 text-center text-[11.5px] text-slate-500">
      {message}
    </div>
  );
}

function FareLineRow({ label, sublabel, amount, free }: { label: string; sublabel?: string; amount: number; free?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-slate-800">{label}</div>
        {sublabel && <div className="truncate text-[10.5px] text-slate-400">{sublabel}</div>}
      </div>
      <div className="shrink-0">
        {free ? (
          <span className="text-[11.5px] font-semibold text-emerald-600">Free</span>
        ) : (
          <span className="font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">₱{amount.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

// ─────────── Time helpers ───────────
// Compact hour-only label ("4 AM", "11 PM") used by the per-day time chips.
function formatHourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12} ${period}`;
}
function prettyType(t: string): string {
  // Mirrors VesselFormBody.typeOptions so review reads identically to the form.
  if (t === "RoRo") return "RoRo (Roll-on / Roll-off)";
  if (t === "Fast Craft") return "Fast Craft (Passenger only)";
  if (t === "Passenger Ship") return "Passenger Ship (Passenger only)";
  return t;
}
