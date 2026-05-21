"use client";
import { useEffect, useMemo } from "react";
import DatePicker from "@/components/DatePicker";
import TimePicker from "@/components/TimePicker";

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

// ─────────── Quick presets ───────────
// One-tap weekday templates for the most common ferry-schedule patterns.
// "Weekdays" = Mon–Fri, "Weekends" = Sat+Sun, plus a couple of staffing-driven
// patterns (M·W·F and T·Th) that operators frequently configure.
const DAY_PRESETS: { id: string; label: string; days: DayKey[] }[] = [
  { id: "weekdays", label: "Weekdays", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "weekends", label: "Weekends", days: ["Sat", "Sun"] },
  { id: "mwf",      label: "M · W · F", days: ["Mon", "Wed", "Fri"] },
  { id: "tth",      label: "T · Th",    days: ["Tue", "Thu"] },
  { id: "daily",    label: "Daily",    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
];

// Equality check for two day-key sets — order-insensitive, treats duplicates as equal.
function sameDaySet(a: DayKey[], b: DayKey[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((d) => setA.has(d));
}

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
      {/* ─── Recurrence choice cards ─── */}
      <div>
        <label className="mb-2 block text-[11.5px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Recurrence
        </label>
        <div role="radiogroup" aria-label="Recurrence" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RecurrenceCard
            active={value.recurrence === "once"}
            onClick={() => onChange({ ...value, recurrence: "once" })}
            title="One-time trip"
            description="A single trip on a specific date."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="3.5" y="5" width="17" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3.5 10h17" />
                <circle cx="12" cy="15" r="1.25" fill="currentColor" stroke="none" />
              </svg>
            }
          />
          <RecurrenceCard
            active={value.recurrence === "weekly"}
            onClick={() => onChange({ ...value, recurrence: "weekly" })}
            title="Recurring weekly"
            description="Repeats on selected days each week."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 4v5h-5" />
              </svg>
            }
          />
        </div>
      </div>

      {/* ─── Departure date + time ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_260px]">
        <Field label="Departure date">
          <DatePicker
            value={value.departureDate}
            onChange={(iso) => onChange({ ...value, departureDate: iso })}
            ariaLabel="Departure date"
            className="w-full"
          />
        </Field>
        <Field label="Time">
          <TimePicker
            value={value.departureTime}
            onChange={(hhmm) => onChange({ ...value, departureTime: hhmm })}
            ariaLabel="Departure time"
            className="w-full"
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
          {/* Single REPEATS row — weekday pills on the left, "until <date>" on the right.
              Reads as one sentence: "Repeats M·W·F until Thu, May 28". The hint moves
              into the section header so the inputs stay clean. */}
          <div className="border-t border-slate-100 pt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-slate-500">
                Repeats
              </label>
              <span className="text-[11px] text-slate-400">
                {value.runsOn.length === 0
                  ? "Pick at least one day."
                  : `Up to ${MAX_RANGE_DAYS} days from departure.`}
              </span>
            </div>

            {/* Quick-pick presets — one-tap weekday templates. Active when the
                currently-selected set matches the preset exactly (order-insensitive). */}
            <div className="mb-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Quick presets">
              {DAY_PRESETS.map((p) => {
                const active = sameDaySet(value.runsOn, p.days);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChange({ ...value, runsOn: p.days })}
                    className={
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none " +
                      (active
                        ? "bg-brand-50 text-brand-700"
                        : "bg-white text-slate-600 hover:bg-slate-50")
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
              {/* Weekday pills */}
              <div role="group" aria-label="Days of the week" className="flex shrink-0 flex-wrap gap-1.5">
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

              {/* Sentence connector */}
              <span className="shrink-0 text-[12.5px] font-medium text-slate-500">until</span>

              {/* End date — fills the remaining row width so there's no dead gutter on the right */}
              <DatePicker
                value={value.endDate}
                onChange={(iso) => onChange({ ...value, endDate: iso })}
                min={value.departureDate || undefined}
                max={maxEndDate || undefined}
                ariaLabel="End date"
                className="min-w-[220px] flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Live schedule summary — textual readback only ─── */}
      <div className="rounded-xl bg-gradient-to-br from-white to-slate-50/60 px-4 py-3.5 ring-1 ring-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Summary</span>
          {summary.tripCount === null && (
            <span className="text-[10px] font-medium text-slate-400">· incomplete</span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-800">{summary.body}</p>
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

// ─────────── RecurrenceCard ───────────
// Two-up clickable cards for the recurrence choice. Active gets a brand-orange
// ring + tinted background + filled brand check; inactive sits white with a
// slate hairline, lifting subtly on hover.
function RecurrenceCard({
  active,
  onClick,
  title,
  description,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={
        "group relative flex items-start gap-3 rounded-xl border bg-white px-4 py-3.5 text-left transition-all duration-150 " +
        (active
          ? "border-brand-500 ring-2 ring-brand-500/15"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60")
      }
    >
      {/* Icon tile */}
      <span
        className={
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors " +
          (active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500 group-hover:text-slate-700")
        }
      >
        {icon}
      </span>

      {/* Title + description */}
      <div className="min-w-0 flex-1">
        <div
          className={
            "text-[13.5px] font-semibold tracking-tight " +
            (active ? "text-slate-900" : "text-slate-700")
          }
        >
          {title}
        </div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">{description}</p>
      </div>

      {/* Check / radio indicator (top-right) */}
      <span
        className={
          "absolute right-3 top-3 grid h-4 w-4 place-items-center rounded-full transition-colors " +
          (active
            ? "bg-brand-500 text-white"
            : "border border-slate-300 bg-white text-transparent group-hover:border-slate-400")
        }
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
          <path d="M5 12l5 5 9-11" />
        </svg>
      </span>
    </button>
  );
}
