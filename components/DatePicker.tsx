"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * DatePicker — single-date picker with a custom popover calendar.
 *
 * Trigger:
 *   ┌──────────────────────────────────┐
 *   │ 📅  Wed, May 20, 2026       ⌄    │
 *   └──────────────────────────────────┘
 *
 * Popover (compact month grid, Monday-first):
 *   ┌───────────────────────────────────────┐
 *   │   ‹  May 2026  ›                      │
 *   │   M  T  W  T  F  S  S                 │
 *   │   …  …  …  …  …  …  …                 │
 *   │  18 19 20 21 22 23 24                 │
 *   │   …                                    │
 *   │   ───────────────────────              │
 *   │   Today                                │
 *   └───────────────────────────────────────┘
 *
 * Reuses the project's surface chrome (`rounded-xl ring-1 ring-slate-200/80`
 * + layered shadow) so it matches RowMenu and the voyages-page date picker.
 */

export type DatePickerProps = {
  /** ISO date string (YYYY-MM-DD). Empty string means "no selection". */
  value: string;
  onChange: (iso: string) => void;
  /** Min/max ISO dates, exclusive of selection beyond bounds. */
  min?: string;
  max?: string;
  placeholder?: string;
  /** Aria-label for the trigger button. */
  ariaLabel?: string;
  className?: string;
  /**
   * Which way the popover opens relative to the trigger.
   *  - "down" (default) — anchors to the trigger's bottom edge.
   *  - "up"             — anchors above the trigger; use when the trigger sits
   *                       near the bottom of a constrained dialog body so the
   *                       popover stays fully visible without changing scroll
   *                       behaviour anywhere else.
   */
  direction?: "down" | "up";
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  ariaLabel = "Choose a date",
  className = "",
  direction = "down",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = parseISO(value);
    return startOfMonth(d ?? new Date());
  });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Sync view-month when value changes externally.
  useEffect(() => {
    const d = parseISO(value);
    if (d) setViewMonth(startOfMonth(d));
  }, [value]);

  // Outside-click + Escape close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-scroll the popover into the nearest scrollable ancestor's centre when
  // it opens — keeps the calendar fully visible inside dialog bodies without
  // forcing the user to scroll the form by hand.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      popoverRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const selected = parseISO(value);
  const minDate = parseISO(min ?? "");
  const maxDate = parseISO(max ?? "");
  const today = startOfDay(new Date());

  const triggerLabel = selected
    ? selected.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : placeholder;

  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);

  const isDisabled = (d: Date) =>
    (minDate ? d < minDate : false) || (maxDate ? d > maxDate : false);

  const pick = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toISO(d));
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={"relative " + className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={
          "inline-flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-[13px] tracking-tight transition-[border-color,box-shadow] duration-150 ease-out " +
          (open
            ? "border-brand-200 ring-2 ring-brand-100"
            : "border-slate-200 hover:border-slate-300")
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400">
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
        <span className={"flex-1 truncate text-left tabular-nums " + (selected ? "text-slate-900" : "text-slate-400")}>
          {triggerLabel}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={"h-3 w-3 text-slate-400 transition-transform " + (open ? "rotate-180" : "")}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={ariaLabel}
          className={
            "absolute left-0 z-40 w-[260px] overflow-hidden rounded-xl bg-white p-2 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-8px_rgba(15,23,42,0.18)] " +
            (direction === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5")
          }
          style={{ animation: "row-menu-in 120ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {/* Month nav */}
          <div className="mb-1 flex items-center justify-between gap-1 px-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="text-[12.5px] font-semibold tracking-tight text-slate-900">
              {viewMonth.toLocaleDateString("en-US", { month: "long" })}{" "}
              <span className="tabular-nums text-slate-500">{viewMonth.getFullYear()}</span>
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 px-0.5 pb-0.5">
            {WEEKDAY_LABELS.map((w, i) => (
              <div
                key={i}
                className="grid h-6 place-items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5 px-0.5 pb-0.5">
            {cells.map(({ date, inMonth }, i) => {
              const isToday = sameDay(date, today);
              const isSelected = selected && sameDay(date, selected);
              const disabled = isDisabled(date);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(date)}
                  disabled={disabled}
                  aria-pressed={!!isSelected}
                  aria-label={date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  className={
                    "grid h-7 place-items-center rounded-md text-[11.5px] tabular-nums transition-colors duration-100 " +
                    (disabled
                      ? "cursor-not-allowed text-slate-200"
                      : isSelected
                        ? "bg-brand-500 font-semibold text-white"
                        : isToday
                          ? "bg-brand-50 font-semibold text-brand-700 hover:bg-brand-100"
                          : inMonth
                            ? "text-slate-700 hover:bg-slate-100"
                            : "text-slate-300 hover:bg-slate-50")
                  }
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer — Today shortcut */}
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => {
                const t = today;
                if (isDisabled(t)) return;
                setViewMonth(startOfMonth(t));
                onChange(toISO(t));
                setOpen(false);
              }}
              className="w-full rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── Helpers ───────────
function parseISO(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfDay(d: Date): Date {
  const n = new Date(d); n.setHours(0, 0, 0, 0); return n;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function buildMonthCells(monthStart: Date): { date: Date; inMonth: boolean }[] {
  // Monday-first: convert getDay (Sun=0) → (Mon=0…Sun=6).
  const firstWeekday = (new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay() + 6) % 7;
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const day = i - firstWeekday + 1;
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    cells.push({ date: d, inMonth: d.getMonth() === monthStart.getMonth() });
  }
  return cells;
}
