"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import Select from "@/components/Select";
import Tooltip from "@/components/Tooltip";
import CreateScheduleModal from "@/components/CreateScheduleModal";

// Today is fixed in the mock universe so date math is deterministic across renders.
const TODAY = new Date("2026-05-20");
// Current hour in the mock universe — anchors the "Now" pill in the time axis.
const NOW_HOUR = 10;

// 24h × 7-day calendar. Hours run 04:00 → 23:00 (operating window for ferries).
const HOURS = Array.from({ length: 20 }, (_, i) => i + 4); // 4..23
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const [query, setQuery] = useState("");

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

            {/* Hour rows — vertically scrollable inside the card */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {HOURS.map((h, rowIdx) => (
                <div
                  key={h}
                  className={
                    "grid grid-cols-[120px_repeat(7,minmax(0,1fr))] " +
                    (rowIdx !== 0 ? "border-t border-slate-200/70" : "")
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

        {/* ─── Empty hint footer ─── */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5">
          <p className="text-[11.5px] text-slate-500">
            No voyages scheduled in this view.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-600 transition-opacity duration-150 hover:opacity-80"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create the first one
          </button>
        </div>
      </section>

      <CreateScheduleModal open={createOpen} onClose={() => setCreateOpen(false)} />
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
