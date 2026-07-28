"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  HOUR_RANGE,
  MAX_MINUTES,
  MIN_MINUTES,
  fmtTime,
  normalizeSlots,
} from "@/lib/schedule-time";

/**
 * Schedule step — first stop of the Create-Schedule wizard.
 *
 * Per backend spec: schedules are always recurring weekly. The server
 * generates voyages for the next 30 days based on whichever weekdays +
 * times the admin selects here. No one-time mode, no start/end date
 * pickers — just weekday + time slots.
 *
 * Times: departures may land on any minute (different vessels rarely leave
 * exactly on the hour). Each slot is stored as minutes-of-day. The hour grid
 * is a one-tap quick-add (defaults to :00); each selected slot then shows as a
 * chip whose minute can be tuned, and "Add time" opens a native time input for
 * arbitrary minutes.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ Weekdays + times                                            │
 *   │   Runs on   [Mon] [Wed] [Fri]                               │
 *   │   Quick add [6 AM] [7 AM] [9 AM] …                          │
 *   │   Selected  [6:00 AM ▾ ✕] [7:30 AM ▾ ✕]  [+ Add time]       │
 *   └─────────────────────────────────────────────────────────────┘
 */

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

// Selected times per weekday. An empty array means the schedule doesn't run
// that day. Slots are stored as minutes-of-day (0–1439); the UI surfaces them
// as 12h labels ("4 AM", "6:45 PM"). Legacy series that stored whole hours
// (0–23) are auto-upgraded on read via normalizeSlots().
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

// Default slot when seeding a freshly-enabled day: 8:00 AM.
const DEFAULT_SLOT = 8 * 60;

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
  const sets = (Object.values(dayTimes) as number[][])
    .map(normalizeSlots)
    .filter((a) => a.length > 0);
  if (sets.length <= 1) return true;
  const ref = sets[0].join(",");
  return sets.every((s) => s.join(",") === ref);
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

  // The shared slot set = union of all active days' times (they're identical
  // in shared mode; the union is a safe read even right after switching).
  const sharedSlots = useMemo(() => {
    const set = new Set<number>();
    active.forEach((k) => normalizeSlots(value.dayTimes[k]).forEach((m) => set.add(m)));
    return Array.from(set).sort((a, b) => a - b);
  }, [value.dayTimes, active]);

  // Toggle which weekdays the schedule runs on (shared mode). Newly-enabled
  // days inherit the shared slot set; disabled days are dropped.
  const toggleSharedDay = (key: DayKey) => {
    const on = (value.dayTimes[key]?.length ?? 0) > 0;
    const next = { ...value.dayTimes };
    if (on) delete next[key];
    else next[key] = sharedSlots.length ? [...sharedSlots] : [DEFAULT_SLOT];
    onChange({ ...value, dayTimes: next });
  };

  // Write a new shared slot set across every active day at once. Never
  // invents days: with nothing selected yet this is a no-op (voyages would
  // otherwise appear on days that were never chosen).
  const setSharedSlots = (slots: number[]) => {
    if (active.length === 0) return;
    const clean = Array.from(new Set(slots)).sort((a, b) => a - b);
    const next: Partial<Record<DayKey, number[]>> = {};
    active.forEach((k) => { next[k] = [...clean]; });
    onChange({ ...value, dayTimes: next });
  };

  const toggleSharedSlot = (mins: number) => {
    const has = sharedSlots.includes(mins);
    setSharedSlots(has ? sharedSlots.filter((m) => m !== mins) : [...sharedSlots, mins]);
  };

  // Replace one slot with another (minute tuning / add-time). No-op if the
  // target time already exists on the set.
  const replaceSharedSlot = (from: number, to: number) => {
    if (from === to) return;
    if (sharedSlots.includes(to)) { setSharedSlots(sharedSlots.filter((m) => m !== from)); return; }
    setSharedSlots(sharedSlots.map((m) => (m === from ? to : m)));
  };

  // Switching to shared flattens every active day onto the shared set so the
  // single grid is the source of truth.
  const switchToShared = () => {
    if (sharedSlots.length > 0) {
      const next: Partial<Record<DayKey, number[]>> = {};
      active.forEach((k) => { next[k] = [...sharedSlots]; });
      onChange({ ...value, dayTimes: next });
    }
    setMode("shared");
  };

  // Apply a preset — sets the selected weekdays. New weekdays default to a
  // single 8 AM slot so the schedule isn't empty after toggling; existing
  // selections keep their times.
  const applyPreset = (days: DayKey[]) => {
    const next: Partial<Record<DayKey, number[]>> = {};
    DAYS.forEach((d) => {
      if (days.includes(d.key)) {
        next[d.key] = mode === "shared"
          ? (sharedSlots.length ? [...sharedSlots] : [DEFAULT_SLOT])
          : (value.dayTimes[d.key]?.length ? normalizeSlots(value.dayTimes[d.key]) : [DEFAULT_SLOT]);
      }
    });
    onChange({ ...value, dayTimes: next });
  };

  // Toggle a weekday on/off (custom mode). Turning a day on seeds it with a
  // single 8 AM slot; turning it off clears the times for that day.
  const toggleDay = (key: DayKey) => {
    const has = (value.dayTimes[key]?.length ?? 0) > 0;
    const next = { ...value.dayTimes };
    if (has) delete next[key];
    else next[key] = [DEFAULT_SLOT];
    onChange({ ...value, dayTimes: next });
  };

  // Write one day's slot set (custom mode).
  const setDaySlots = (key: DayKey, slots: number[]) => {
    const clean = Array.from(new Set(slots)).sort((a, b) => a - b);
    onChange({ ...value, dayTimes: { ...value.dayTimes, [key]: clean } });
  };

  const totalTrips = useMemo(() => {
    const slotsPerWeek = Object.values(value.dayTimes).reduce((s, arr) => s + (arr?.length ?? 0), 0);
    return Math.round((slotsPerWeek * 30) / 7);
  }, [value.dayTimes]);

  const totalSlots = Object.values(value.dayTimes).reduce((s, arr) => s + (arr?.length ?? 0), 0);

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

      {/* Quick weekday presets */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Weekdays
          </label>
          {/* Mode switch — whether each day shares the same departure times
              or is configured individually. */}
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
            {/* Weekday row */}
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

            {/* Departure times — quick-add grid + selected chips with minute tuning */}
            <div className="border-t border-slate-200 bg-slate-50/70 px-3.5 py-3.5">
              <TimeEditor
                slots={sharedSlots}
                disabled={active.length === 0}
                disabledHint="pick days first"
                appliesTo={active.length}
                onToggleQuick={toggleSharedSlot}
                onChangeSlot={replaceSharedSlot}
                onAdd={(m) => { if (!sharedSlots.includes(m)) setSharedSlots([...sharedSlots, m]); }}
                onRemove={(m) => setSharedSlots(sharedSlots.filter((x) => x !== m))}
                onClear={() => setSharedSlots([])}
              />
            </div>
          </div>
        ) : (
          /* ── Custom mode ── per-day rows, each with its own time editor. */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {DAYS.map((d, i) => {
              const slots = normalizeSlots(value.dayTimes[d.key]);
              const on = slots.length > 0;
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
                          {slots.slice(0, 3).map((m) => (
                            <span key={m} className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-brand-700">
                              {fmtTime(m)}
                            </span>
                          ))}
                          {slots.length > 3 && (
                            <span className="font-mono text-[10px] tabular-nums text-slate-400">+{slots.length - 3}</span>
                          )}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-slate-400 sm:hidden">{slots.length}</span>
                      </div>
                    ) : (
                      <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.08em] text-slate-300">Off</span>
                    )}
                  </div>

                  {on && (
                    <div className="border-t border-dashed border-slate-200/80 bg-slate-50/40 px-3.5 py-3">
                      <TimeEditor
                        slots={slots}
                        disabled={false}
                        appliesTo={1}
                        hideAppliesTo
                        onToggleQuick={(m) => setDaySlots(d.key, slots.includes(m) ? slots.filter((x) => x !== m) : [...slots, m])}
                        onChangeSlot={(from, to) => setDaySlots(d.key, slots.includes(to) ? slots.filter((x) => x !== from) : slots.map((x) => (x === from ? to : x)))}
                        onAdd={(m) => { if (!slots.includes(m)) setDaySlots(d.key, [...slots, m]); }}
                        onRemove={(m) => setDaySlots(d.key, slots.filter((x) => x !== m))}
                        onClear={() => setDaySlots(d.key, [])}
                      />
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
              ? "Toggle at least one weekday and pick at least one time."
              : `${active.length} weekday${active.length === 1 ? "" : "s"} · ${totalSlots} slot${totalSlots === 1 ? "" : "s"} / week · ~${totalTrips} trip${totalTrips === 1 ? "" : "s"} over the next 30 days.`}
          </span>
        </span>
      </div>
    </div>
  );
}

// ─────────── TimeEditor ───────────
// A departure-times editor for one slot set. The hour grid is a one-tap
// quick-add (adds/removes the on-the-hour slot). Below it, every selected
// slot renders as a chip with a minute stepper (:00/:15/:30/:45) and a remove
// button; "Add time" opens a native time input for arbitrary minutes.
function TimeEditor({
  slots,
  disabled,
  disabledHint,
  appliesTo,
  hideAppliesTo,
  onToggleQuick,
  onChangeSlot,
  onAdd,
  onRemove,
  onClear,
}: {
  slots: number[];
  disabled: boolean;
  disabledHint?: string;
  appliesTo: number;
  hideAppliesTo?: boolean;
  onToggleQuick: (mins: number) => void;
  onChangeSlot: (from: number, to: number) => void;
  onAdd: (mins: number) => void;
  onRemove: (mins: number) => void;
  onClear: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-brand-500">
          {hideAppliesTo ? "Departure times" : (
            <>Departure times {appliesTo > 0
              ? `· applies to ${appliesTo} day${appliesTo === 1 ? "" : "s"}`
              : <span className="text-slate-400">· {disabledHint ?? "pick days first"}</span>}</>
          )}
        </span>
        {slots.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10.5px] font-medium text-slate-400 transition-colors hover:text-rose-500"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick-add hour grid — a filled tile means an on-the-hour slot exists. */}
      {!disabled && (
        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">Quick add · on the hour</div>
      )}
      <div className={"grid grid-cols-5 gap-1.5 sm:grid-cols-10 " + (disabled ? "opacity-50" : "")}>
        {HOUR_RANGE.map((m) => {
          const selected = slots.includes(m);
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onToggleQuick(m)}
              className={
                "rounded-md px-2 py-1 text-[11.5px] font-medium tabular-nums tracking-tight transition-colors focus-visible:outline-none " +
                (selected
                  ? "bg-brand-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50") +
                (disabled ? " cursor-not-allowed" : "")
              }
            >
              {fmtTime(m)}
            </button>
          );
        })}
      </div>

      {/* ── Selected times ──
          Broken out into its own labelled, boxed section so the chosen
          departures read as a distinct list rather than crowding the grid. */}
      {!disabled && (
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2.5 flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">Selected times</span>
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-50 px-1 font-mono text-[10px] font-semibold text-brand-600">{slots.length}</span>
          </div>

          {slots.length === 0 ? (
            <p className="mb-3 text-[12px] text-slate-400">
              Tap an hour above, or use <span className="font-semibold text-brand-600">Add time</span> for an exact minute.
            </p>
          ) : (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {slots.map((m) => (
                <SlotChip
                  key={m}
                  mins={m}
                  taken={slots}
                  onChange={(to) => onChangeSlot(m, to)}
                  onRemove={() => onRemove(m)}
                />
              ))}
            </div>
          )}

          {/* Prominent Add-time affordance — full-width dashed brand button that
              opens the branded time dialog. */}
          <div>
            <button
              ref={addBtnRef}
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-300 bg-brand-50/50 py-2.5 text-[13px] font-semibold text-brand-600 transition-colors hover:border-brand-400 hover:bg-brand-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l2.5 2.5" />
              </svg>
              Add departure time
            </button>
            {adding && (
              <BrandTimeDialog
                anchorRef={addBtnRef}
                initial={DEFAULT_SLOT}
                taken={slots}
                title="Add departure time"
                confirmLabel="Add time"
                onCancel={() => setAdding(false)}
                onConfirm={(mins) => { onAdd(mins); setAdding(false); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── SlotChip ───────────
// A single selected departure time. Clicking the time opens the branded time
// dialog (pre-filled) so the operator can set the exact hour + minute. The ✕
// removes the slot.
function SlotChip({
  mins,
  taken,
  onChange,
  onRemove,
}: {
  mins: number;
  taken: number[];
  onChange: (to: number) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);

  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-white py-1 pl-2 pr-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200">
      <button
        ref={chipRef}
        type="button"
        onClick={() => setEditing(true)}
        title="Edit time"
        className="inline-flex items-center gap-1.5 rounded-md px-0.5 text-[13px] font-semibold tabular-nums tracking-tight text-slate-800 hover:text-brand-600"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-brand-500">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
        {fmtTime(mins)}
      </button>
      <button
        type="button"
        aria-label={`Remove ${fmtTime(mins)}`}
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-3 w-3">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {editing && (
        <BrandTimeDialog
          anchorRef={chipRef}
          initial={mins}
          taken={taken}
          self={mins}
          title="Edit departure time"
          confirmLabel="Save"
          onCancel={() => setEditing(false)}
          onConfirm={(to) => { onChange(to); setEditing(false); }}
        />
      )}
    </span>
  );
}

// ─────────── BrandTimeDialog ───────────
// A branded inline time picker (no native <input type=time>). Portaled to
// <body> with fixed coordinates anchored to its trigger so it never gets
// clipped by the scrollable wizard modal. HH:MM display, scrollable hour +
// minute columns, and an AM/PM toggle. Confirm is disabled when the chosen time
// collides with another selected slot or falls outside the operating window.
function BrandTimeDialog({
  anchorRef,
  initial,
  taken,
  self,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  initial: number;
  taken: number[];
  /** The slot currently being edited (allowed even though it's "taken"). */
  self?: number;
  title: string;
  confirmLabel: string;
  onConfirm: (mins: number) => void;
  onCancel: () => void;
}) {
  const DIALOG_W = 260;
  const DIALOG_H = 180; // approx — for flip decision only
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const up = spaceBelow < DIALOG_H && r.top > spaceBelow;
      // Clamp horizontally so the panel stays fully on-screen (8px gutter).
      const left = Math.min(
        Math.max(8, r.left),
        window.innerWidth - DIALOG_W - 8
      );
      const top = up ? r.top - DIALOG_H - 8 : r.bottom + 8;
      setCoords({ top, left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef]);

  const clampInit = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, initial));
  // Fields are typed freely (as strings) so the user can clear/retype; the
  // committed value is derived + validated on confirm.
  const [hourStr, setHourStr] = useState(String(((Math.floor(clampInit / 60) + 11) % 12) + 1));
  const [minStr, setMinStr] = useState(String(clampInit % 60).padStart(2, "0"));
  const [period, setPeriod] = useState<"AM" | "PM">(Math.floor(clampInit / 60) < 12 ? "AM" : "PM");

  const hourNum = Number(hourStr);
  const minNum = Number(minStr);
  const hourOk = /^\d{1,2}$/.test(hourStr) && hourNum >= 1 && hourNum <= 12;
  const minOk = /^\d{1,2}$/.test(minStr) && minNum >= 0 && minNum <= 59;

  // Compose 12h field values → minutes-of-day (only meaningful when both ok).
  const candidate = (() => {
    let h = hourNum % 12; // 12 -> 0
    if (period === "PM") h += 12;
    return h * 60 + minNum;
  })();

  const outOfWindow = hourOk && minOk && (candidate < MIN_MINUTES || candidate > MAX_MINUTES);
  const clash = hourOk && minOk && candidate !== self && taken.includes(candidate);
  const invalid = !hourOk || !minOk || outOfWindow || clash;

  // Clamp a typed hour/minute to its range as the user leaves the field.
  const blurHour = () => {
    if (hourStr === "") return;
    const n = Math.min(12, Math.max(1, Number(hourStr) || 1));
    setHourStr(String(n));
  };
  const blurMin = () => {
    if (minStr === "") { setMinStr("00"); return; }
    const n = Math.min(59, Math.max(0, Number(minStr) || 0));
    setMinStr(String(n).padStart(2, "0"));
  };

  const togglePeriod = () => setPeriod((p) => (p === "AM" ? "PM" : "AM"));

  const submit = () => { if (!invalid) onConfirm(candidate); };

  if (typeof document === "undefined" || !coords) return null;

  return createPortal(
    <>
      {/* click-away scrim */}
      <button type="button" aria-hidden tabIndex={-1} onClick={onCancel} className="fixed inset-0 z-[90] cursor-default" />
      <div
        role="dialog"
        aria-label={title}
        style={{ position: "fixed", top: coords.top, left: coords.left, width: DIALOG_W }}
        className="z-[100] overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(15,23,42,0.16)] ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — branded band. */}
        <div className="bg-brand-500 px-4 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">{title}</div>
        </div>

        {/* Field row — HH : MM inputs + an AM/PM toggle with arrows. */}
        <div className="flex items-center justify-center gap-1.5 px-4 pb-3 pt-4">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Hour"
            autoFocus
            value={hourStr}
            onChange={(e) => setHourStr(e.target.value.replace(/\D/g, "").slice(0, 2))}
            onBlur={blurHour}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
            className={
              "h-12 w-14 rounded-lg border text-center font-mono text-[22px] font-bold tabular-nums tracking-tight text-slate-900 focus:outline-none focus:ring-2 " +
              (hourOk ? "border-slate-200 focus:border-brand-400 focus:ring-brand-200" : "border-rose-300 focus:ring-rose-200")
            }
          />
          <span className="pb-0.5 font-mono text-[22px] font-bold text-slate-300">:</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Minute"
            value={minStr}
            onChange={(e) => setMinStr(e.target.value.replace(/\D/g, "").slice(0, 2))}
            onBlur={blurMin}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
            className={
              "h-12 w-14 rounded-lg border text-center font-mono text-[22px] font-bold tabular-nums tracking-tight text-slate-900 focus:outline-none focus:ring-2 " +
              (minOk ? "border-slate-200 focus:border-brand-400 focus:ring-brand-200" : "border-rose-300 focus:ring-rose-200")
            }
          />

          {/* AM/PM stepper — up/down arrows toggle between the two. */}
          <div className="ml-1 flex flex-col items-stretch">
            <button
              type="button"
              aria-label="Switch AM/PM"
              onClick={togglePeriod}
              className="flex h-4 items-center justify-center rounded-t-md bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M18 15l-6-6-6 6" /></svg>
            </button>
            <div className="flex h-6 w-11 items-center justify-center bg-brand-500 font-mono text-[13px] font-bold tabular-nums text-white">
              {period}
            </div>
            <button
              type="button"
              aria-label="Switch AM/PM"
              onClick={togglePeriod}
              className="flex h-4 items-center justify-center rounded-b-md bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>
        </div>

        {/* Validation hint */}
        {invalid && (
          <div className="px-4 pb-1 text-[10.5px] font-medium text-rose-500">
            {!hourOk ? "Hour must be 1–12."
              : !minOk ? "Minutes must be 00–59."
              : outOfWindow ? "Pick a time between 4:00 AM and 11:59 PM."
              : "That time is already selected."}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={invalid}
            onClick={submit}
            className={
              "rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors " +
              (invalid ? "cursor-not-allowed bg-slate-300" : "bg-brand-500 hover:bg-brand-600")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
