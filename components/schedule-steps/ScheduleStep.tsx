"use client";
import { useEffect, useMemo } from "react";

/**
 * Schedule step — first stop of the Create-Schedule wizard.
 *
 * One question, framed as a single decision: *When and how often does this trip run?*
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ Recurrence  ⟨ Once · Weekly ⟩                               │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ Departure date     [05/20/2026]      Time   [04:00]         │
 *   │                                                              │
 *   │ ── only when Weekly ─────────────────────────────────────── │
 *   │ Runs on            [M] [T] [W] [Th] [F] [S] [Su]            │
 *   │ Ends on            [06/18/2026]   Up to 30 days from start   │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ ⓘ Runs M · W · F starting May 20, until Jun 18 — 14 trips   │
 *   └─────────────────────────────────────────────────────────────┘
 */

export type Recurrence = "once" | "weekly";
export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type ScheduleValue = {
  recurrence: Recurrence;
  departureDate: string;  // YYYY-MM-DD
  departureTime: string;  // HH:MM (24h)
  runsOn: DayKey[];       // only meaningful when recurrence === "weekly"
  endDate: string;        // YYYY-MM-DD — only meaningful when recurrence === "weekly"
};

const DAYS: { key: DayKey; short: string; long: string }[] = [
  { key: "Mon", short: "M",  long: "Monday" },
  { key: "Tue", short: "T",  long: "Tuesday" },
  { key: "Wed", short: "W",  long: "Wednesday" },
  { key: "Thu", short: "Th", long: "Thursday" },
  { key: "Fri", short: "F",  long: "Friday" },
  { key: "Sat", short: "S",  long: "Saturday" },
  { key: "Sun", short: "Su", long: "Sunday" },
];

const MAX_RANGE_DAYS = 30;

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] tabular-nums text-slate-900 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

export default function ScheduleStep({
  value,
  onChange,
}: {
  value: ScheduleValue;
  onChange: (next: ScheduleValue) => void;
}) {
  // Derived: clamp the end-date so it can never exceed 30 days from departure.
  // We don't auto-rewrite the user's input — just expose the max for the input's
  // `max` attr and surface a hint inline.
  const maxEndDate = useMemo(() => {
    const d = parseISO(value.departureDate);
    if (!d) return "";
    const m = new Date(d); m.setDate(m.getDate() + MAX_RANGE_DAYS);
    return toISO(m);
  }, [value.departureDate]);

  // When the user picks a new departure date or recurrence, normalize the end date
  // so it stays inside the 30-day window. We only nudge if the existing end is
  // outside the window — never overwrite a still-valid choice.
  useEffect(() => {
    if (value.recurrence !== "weekly") return;
    const dep = parseISO(value.departureDate);
    const end = parseISO(value.endDate);
    if (!dep) return;
    if (!end || end < dep) {
      // Default to dep + 7 (a reasonable initial week-long window).
      const next = new Date(dep); next.setDate(next.getDate() + 7);
      onChange({ ...value, endDate: toISO(next) });
      return;
    }
    const cap = new Date(dep); cap.setDate(cap.getDate() + MAX_RANGE_DAYS);
    if (end > cap) onChange({ ...value, endDate: toISO(cap) });
  }, [value.departureDate, value.recurrence]);  // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (key: DayKey) => {
    const has = value.runsOn.includes(key);
    onChange({
      ...value,
      runsOn: has ? value.runsOn.filter((d) => d !== key) : [...value.runsOn, key],
    });
  };

  const summary = buildSummary(value);

  return (
    <div className="space-y-6">
      {/* ─── Recurrence segmented control ─── */}
      <div>
        <label className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Recurrence
        </label>
        <div
          role="radiogroup"
          aria-label="Recurrence"
          className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
        >
          {(["once", "weekly"] as const).map((r) => {
            const active = value.recurrence === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ ...value, recurrence: r })}
                className={
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3.5 text-[12.5px] font-medium transition-colors " +
                  (active
                    ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                {r === "once" ? "Once" : "Weekly"}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Departure date + time ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Departure date">
          <input
            type="date"
            value={value.departureDate}
            onChange={(e) => onChange({ ...value, departureDate: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Time">
          <input
            type="time"
            value={value.departureTime}
            onChange={(e) => onChange({ ...value, departureTime: e.target.value })}
            className={inputCls}
          />
        </Field>
      </div>

      {/* ─── Weekly-only controls ───
          We always render the wrapper so the modal's height doesn't jump as the
          user toggles. When Once is selected, the slot is empty + collapses to 0 height. */}
      <div
        className={
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out " +
          (value.recurrence === "weekly" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
        }
        aria-hidden={value.recurrence !== "weekly"}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-5 border-t border-slate-100 pt-5">
            {/* Weekday pills */}
            <Field label="Runs on" hint={value.runsOn.length === 0 ? "Pick at least one day." : null}>
              <div role="group" aria-label="Days of the week" className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const active = value.runsOn.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      role="checkbox"
                      aria-checked={active}
                      aria-label={d.long}
                      onClick={() => toggleDay(d.key)}
                      className={
                        "grid h-8 w-8 place-items-center rounded-full text-[11.5px] font-semibold transition-colors " +
                        (active
                          ? "bg-brand-500 text-white shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")
                      }
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* End date with 30-day cap */}
            <Field
              label="Ends on"
              hint={`Up to ${MAX_RANGE_DAYS} days from the departure date.`}
            >
              <input
                type="date"
                value={value.endDate}
                min={value.departureDate || undefined}
                max={maxEndDate || undefined}
                onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ─── Live schedule summary ─── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M12 8v4M12 16h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">Summary</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-slate-800">
              {summary.body}
              {summary.tripCount !== null && (
                <>
                  <span className="text-slate-400"> · </span>
                  <span className="font-semibold text-slate-900 tabular-nums">{summary.tripCount}</span>{" "}
                  <span className="text-slate-600">{summary.tripCount === 1 ? "trip" : "trips"}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── Field — label + optional hint + control slot ───────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─────────── Helpers ───────────
function parseISO(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildSummary(v: ScheduleValue): { body: string; tripCount: number | null } {
  const dep = parseISO(v.departureDate);
  if (!dep || !v.departureTime) {
    return { body: "Pick a departure date and time to get started.", tripCount: null };
  }
  const depLabel = dep.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeLabel = formatTime12h(v.departureTime);

  if (v.recurrence === "once") {
    return {
      body: `Runs once on ${depLabel} at ${timeLabel}.`,
      tripCount: 1,
    };
  }

  // Weekly
  if (v.runsOn.length === 0) {
    return { body: `Pick at least one day of the week.`, tripCount: null };
  }
  const end = parseISO(v.endDate);
  if (!end || end < dep) {
    return { body: `Pick when the schedule should end.`, tripCount: null };
  }

  const orderedDays = DAYS.filter((d) => v.runsOn.includes(d.key)).map((d) => d.short);
  const daysLabel = orderedDays.join(" · ");
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Count trips: every day from dep to end (inclusive) whose weekday matches runsOn.
  let trips = 0;
  const cursor = new Date(dep);
  while (cursor.getTime() <= end.getTime()) {
    const dow = (cursor.getDay() + 6) % 7; // Mon=0..Sun=6 to match DAYS order
    if (v.runsOn.includes(DAYS[dow].key)) trips++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    body: `Runs ${daysLabel} at ${timeLabel} from ${depLabel} until ${endLabel}.`,
    tripCount: trips,
  };
}

function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h < 12 ? "AM" : "PM";
  const display = ((h + 11) % 12) + 1;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}
