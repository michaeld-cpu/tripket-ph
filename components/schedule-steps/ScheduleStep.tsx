"use client";
import { useMemo, useState } from "react";

/**
 * Schedule step — first stop of the Create-Schedule wizard.
 *
 * Per backend spec: schedules are always recurring weekly. The server
 * generates voyages for the next 30 days based on whichever weekdays +
 * times the admin selects here. No one-time mode, no start/end date
 * pickers — just weekday + time slots.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ Schedule label (Optional)   [Schedule A]                    │
 *   │ Weekdays + times                                            │
 *   │   Monday    ▾  [6 AM] [7 AM] [9 AM] [4 PM]                  │
 *   │   Tuesday   ▸  off                                          │
 *   │   …                                                         │
 *   └─────────────────────────────────────────────────────────────┘
 */

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

// Selected times per weekday. An empty array means the schedule doesn't
// run that day. Times are stored as 24h hours (4–23); the UI surfaces them
// as 12h labels ("4 AM", "11 PM").
export type ScheduleValue = {
  dayTimes: Partial<Record<DayKey, number[]>>;
  /** Optional operator label shown on each generated voyage card. */
  label?: string;
};

const DAYS: { key: DayKey; short: string; long: string }[] = [
  { key: "Mon", short: "Mon", long: "Monday" },
  { key: "Tue", short: "Tue", long: "Tuesday" },
  { key: "Wed", short: "Wed", long: "Wednesday" },
  { key: "Thu", short: "Thu", long: "Thursday" },
  { key: "Fri", short: "Fri", long: "Friday" },
  { key: "Sat", short: "Sat", long: "Saturday" },
  { key: "Sun", short: "Sun", long: "Sunday" },
];

// Operating hours window — 4 AM through 11 PM inclusive.
const MIN_HOUR = 4;
const MAX_HOUR = 23;
const HOUR_RANGE = Array.from({ length: MAX_HOUR - MIN_HOUR + 1 }, (_, i) => MIN_HOUR + i);

// ─────────── Quick presets ───────────
// One-tap weekday templates. Each preset just toggles which weekdays are
// active; per-day times persist so the admin can pick "Weekdays" then tune
// times per row.
const DAY_PRESETS: { id: string; label: string; days: DayKey[] }[] = [
  { id: "weekdays", label: "Weekdays",  days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "weekends", label: "Weekends",  days: ["Sat", "Sun"] },
  { id: "mwf",      label: "M · W · F", days: ["Mon", "Wed", "Fri"] },
  { id: "tth",      label: "T · Th",    days: ["Tue", "Thu"] },
  { id: "daily",    label: "Daily",     days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
];

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] tabular-nums text-slate-900 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

function fmtHourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = ((h + 11) % 12) + 1;
  return `${display} ${period}`;
}

// Days that have at least one time slot selected.
function activeDays(v: ScheduleValue): DayKey[] {
  return DAYS.map((d) => d.key).filter((k) => (v.dayTimes[k]?.length ?? 0) > 0);
}

function sameDaySet(a: DayKey[], b: DayKey[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((d) => setA.has(d));
}

// True when every active day shares an identical set of times (or there are
// none yet) — i.e. the schedule can be represented by the shared-times mode
// without losing information.
function isUniform(dayTimes: Partial<Record<DayKey, number[]>>): boolean {
  const sets = (Object.values(dayTimes) as number[][]).filter((a) => a && a.length > 0);
  if (sets.length <= 1) return true;
  const ref = [...sets[0]].sort((a, b) => a - b).join(",");
  return sets.every((s) => [...s].sort((a, b) => a - b).join(",") === ref);
}

export default function ScheduleStep({
  value,
  onChange,
}: {
  value: ScheduleValue;
  onChange: (next: ScheduleValue) => void;
}) {
  const active = activeDays(value);

  // ── Mode: shared times (one grid for every selected day) vs custom
  // per-day. Default is shared — that's the overwhelmingly common ferry
  // schedule ("same departures every operating day"), and it collapses the
  // repetitive per-day tapping. We seed the initial mode from the data: if
  // the existing schedule already has differing times per day, open in
  // custom so we don't silently flatten it.
  const [mode, setMode] = useState<"shared" | "custom">(() =>
    isUniform(value.dayTimes) ? "shared" : "custom"
  );

  // The shared time set = union of all active days' times (they're identical
  // in shared mode; the union is a safe read even right after switching).
  const sharedHours = useMemo(() => {
    const set = new Set<number>();
    active.forEach((k) => (value.dayTimes[k] ?? []).forEach((h) => set.add(h)));
    return Array.from(set).sort((a, b) => a - b);
  }, [value.dayTimes, active]);

  // Toggle which weekdays the schedule runs on (shared mode). Newly-enabled
  // days inherit the shared time set; disabled days are dropped.
  const toggleSharedDay = (key: DayKey) => {
    const on = (value.dayTimes[key]?.length ?? 0) > 0;
    const next = { ...value.dayTimes };
    if (on) delete next[key];
    else next[key] = sharedHours.length ? [...sharedHours] : [8];
    onChange({ ...value, dayTimes: next });
  };

  // Toggle an hour in shared mode → applies to every active day at once.
  // Never invents days: if nothing is selected yet, picking a time is a no-op
  // (the user must choose the weekdays first, otherwise voyages would appear on
  // days that were never selected).
  const toggleSharedHour = (hour: number) => {
    if (active.length === 0) return;
    const has = sharedHours.includes(hour);
    const nextHours = (has ? sharedHours.filter((h) => h !== hour) : [...sharedHours, hour]).sort((a, b) => a - b);
    const next: Partial<Record<DayKey, number[]>> = {};
    active.forEach((k) => { next[k] = [...nextHours]; });
    onChange({ ...value, dayTimes: next });
  };

  // Switching to shared flattens every active day onto the shared set so the
  // single grid is the source of truth.
  const switchToShared = () => {
    if (sharedHours.length > 0) {
      const next: Partial<Record<DayKey, number[]>> = {};
      active.forEach((k) => { next[k] = [...sharedHours]; });
      onChange({ ...value, dayTimes: next });
    }
    setMode("shared");
  };

  // Apply a preset — sets the selected weekdays. New weekdays default to
  // a single 8 AM slot so the schedule isn't empty after toggling; existing
  // selections keep their times.
  const applyPreset = (days: DayKey[]) => {
    const next: Partial<Record<DayKey, number[]>> = {};
    DAYS.forEach((d) => {
      if (days.includes(d.key)) {
        // In shared mode every new day inherits the shared set; in custom
        // mode keep each day's existing times.
        next[d.key] = mode === "shared"
          ? (sharedHours.length ? [...sharedHours] : [8])
          : (value.dayTimes[d.key]?.length ? value.dayTimes[d.key]! : [8]);
      }
    });
    onChange({ ...value, dayTimes: next });
  };

  // Toggle a weekday on/off. Turning a day on seeds it with a single 8 AM
  // slot; turning it off clears the times for that day.
  const toggleDay = (key: DayKey) => {
    const has = (value.dayTimes[key]?.length ?? 0) > 0;
    const next = { ...value.dayTimes };
    if (has) delete next[key];
    else next[key] = [8];
    onChange({ ...value, dayTimes: next });
  };

  // Toggle a specific hour on a weekday — no-op if the weekday isn't
  // active yet. Sorts the resulting array so the chip display stays in
  // chronological order.
  const toggleHour = (key: DayKey, hour: number) => {
    const cur = value.dayTimes[key] ?? [];
    const next = cur.includes(hour) ? cur.filter((h) => h !== hour) : [...cur, hour].sort((a, b) => a - b);
    onChange({ ...value, dayTimes: { ...value.dayTimes, [key]: next } });
  };

  const totalTrips = useMemo(() => {
    // Count of weekday × time combos × 30 days / 7 ≈ trips generated by
    // the server over the rolling 30-day window. The server is authoritative;
    // this is a quick admin-side preview.
    const slotsPerWeek = Object.values(value.dayTimes).reduce((s, arr) => s + (arr?.length ?? 0), 0);
    return Math.round((slotsPerWeek * 30) / 7);
  }, [value.dayTimes]);

  return (
    <div className="space-y-6">
      {/* Heads-up banner — explains the 30-day recurrence policy so the
          admin doesn't look for start/end pickers. */}
      <div className="flex items-center gap-2.5 rounded-lg border border-brand-200/80 bg-brand-50/60 px-3.5 py-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-brand-600">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 4v5h-5" />
        </svg>
        <div className="text-[12.5px] tracking-tight">
          <span className="font-semibold text-brand-700">Recurring schedule.</span>{" "}
          <span className="text-slate-600">
            The server will automatically generate voyages for the next 30 days based on the weekdays and times you pick below.
          </span>
        </div>
      </div>

      {/* Schedule label — optional operator-friendly name (e.g. "Schedule A"). */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Schedule label <span className="text-slate-400 normal-case tracking-normal">(Optional)</span>
          </label>
          <span className="text-[11px] text-slate-400">Shown on each voyage card.</span>
        </div>
        <input
          type="text"
          value={value.label ?? ""}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="e.g. Schedule A"
          maxLength={32}
          className={inputCls}
        />
      </div>

      {/* Quick weekday presets */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Weekdays
          </label>
          {/* Mode switch — whether each day shares the same departure times
              or is configured individually. Verb-led labels read as the
              choice being made, not a status. */}
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={switchToShared}
              className={"rounded-md px-2.5 py-1 transition-colors " + (mode === "shared" ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-700")}
            >
              One time set
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={"rounded-md px-2.5 py-1 transition-colors " + (mode === "custom" ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-700")}
            >
              Per day
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Quick presets">
          {DAY_PRESETS.map((p) => {
            const isActive = sameDaySet(active, p.days);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.days)}
                className={
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none " +
                  (isActive
                    ? "bg-brand-50 text-brand-700"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")
                }
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {mode === "shared" ? (
          /* ── Shared mode ──
             Step 1: pick which weekdays as a single chip row.
             Step 2: pick the departure times once — applied to all of them. */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Weekday row — circular day toggles so they read as distinct
                from the rectangular time tiles below. */}
            <div className="border-b border-slate-100 px-3.5 py-3">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-brand-500">Runs on</div>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const on = (value.dayTimes[d.key]?.length ?? 0) > 0;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      aria-pressed={on}
                      aria-label={d.long}
                      title={d.long}
                      onClick={() => toggleSharedDay(d.key)}
                      className={
                        "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none " +
                        (on
                          ? "bg-brand-500 text-white"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")
                      }
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shared hour grid — tinted panel so the times zone reads as a
                distinct step from the day chips above. */}
            <div className="border-t border-slate-200 bg-slate-50/70 px-3.5 py-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-brand-500">
                  Departure times {active.length > 0
                    ? `· applies to ${active.length} day${active.length === 1 ? "" : "s"}`
                    : <span className="text-slate-400">· pick days first</span>}
                </span>
                {sharedHours.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { const next: Partial<Record<DayKey, number[]>> = {}; active.forEach((k) => { next[k] = []; }); onChange({ ...value, dayTimes: next }); }}
                    className="text-[10.5px] font-medium text-slate-400 transition-colors hover:text-rose-500"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className={"grid grid-cols-5 gap-1.5 sm:grid-cols-10 " + (active.length === 0 ? "opacity-50" : "")}>
                {HOUR_RANGE.map((h) => {
                  const selected = sharedHours.includes(h);
                  const disabled = active.length === 0;
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleSharedHour(h)}
                      className={
                        "rounded-md px-2 py-1 text-[11.5px] font-medium tabular-nums tracking-tight transition-colors focus-visible:outline-none " +
                        (selected
                          ? "bg-brand-500 text-white"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50") +
                        (disabled ? " cursor-not-allowed" : "")
                      }
                    >
                      {fmtHourLabel(h)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── Custom mode ── per-day rows, each with its own hour grid. */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {DAYS.map((d, i) => {
              const hours = value.dayTimes[d.key] ?? [];
              const on = hours.length > 0;
              return (
                <div key={d.key} className={i === 0 ? "" : "border-t border-slate-100"}>
                  <div className={"flex items-center gap-3 px-3.5 " + (on ? "py-2.5" : "py-2")}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`Toggle ${d.long}`}
                      onClick={() => toggleDay(d.key)}
                      className={
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 " +
                        (on ? "bg-brand-500" : "bg-slate-200")
                      }
                    >
                      <span
                        aria-hidden
                        className={
                          "block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-transform duration-150 " +
                          (on ? "translate-x-4" : "translate-x-0")
                        }
                      />
                    </button>
                    <span className={"text-[13px] font-semibold tracking-tight " + (on ? "text-slate-900" : "text-slate-400")}>
                      {d.long}
                    </span>
                    {on ? (
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="hidden items-center gap-1 sm:flex">
                          {hours.slice(0, 3).map((h) => (
                            <span key={h} className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-brand-700">
                              {fmtHourLabel(h)}
                            </span>
                          ))}
                          {hours.length > 3 && (
                            <span className="font-mono text-[10px] tabular-nums text-slate-400">+{hours.length - 3}</span>
                          )}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-slate-400 sm:hidden">{hours.length}</span>
                      </div>
                    ) : (
                      <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.08em] text-slate-300">Off</span>
                    )}
                  </div>

                  {on && (
                    <div className="border-t border-dashed border-slate-200/80 bg-slate-50/40 px-3.5 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">Departure times</span>
                        <button
                          type="button"
                          onClick={() => onChange({ ...value, dayTimes: { ...value.dayTimes, [d.key]: [] } })}
                          className="text-[10.5px] font-medium text-slate-400 transition-colors hover:text-rose-500"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                        {HOUR_RANGE.map((h) => {
                          const selected = hours.includes(h);
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => toggleHour(d.key, h)}
                              className={
                                "rounded-md px-2 py-1 text-[11.5px] font-medium tabular-nums tracking-tight transition-colors focus-visible:outline-none " +
                                (selected
                                  ? "bg-brand-500 text-white"
                                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")
                              }
                            >
                              {fmtHourLabel(h)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live summary — count of weekly slots + the rolling-30-day trip projection. */}
      <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={"h-4 w-4 shrink-0 " + (totalTrips === 0 ? "text-slate-400" : "text-emerald-600")}>
          {totalTrips === 0
            ? <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16v.01" /></>
            : <path d="M5 12l5 5L20 7" />}
        </svg>
        <span className="text-[12.5px] tracking-tight text-slate-700">
          <span className="font-semibold text-slate-900">
            {totalTrips === 0 ? "Schedule incomplete." : "Schedule set."}
          </span>{" "}
          <span className="text-slate-500">
            {totalTrips === 0
              ? "Toggle at least one weekday and pick at least one hour."
              : `${active.length} weekday${active.length === 1 ? "" : "s"} · ${Object.values(value.dayTimes).reduce((s, arr) => s + (arr?.length ?? 0), 0)} slot${Object.values(value.dayTimes).reduce((s, arr) => s + (arr?.length ?? 0), 0) === 1 ? "" : "s"} / week · ~${totalTrips} trip${totalTrips === 1 ? "" : "s"} over the next 30 days.`}
          </span>
        </span>
      </div>
    </div>
  );
}
