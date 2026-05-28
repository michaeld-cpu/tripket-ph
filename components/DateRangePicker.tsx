"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export type DateRange = { start: Date; end: Date };

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfDay(d: Date): Date {
  const n = new Date(d); n.setHours(0, 0, 0, 0); return n;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
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
function isBetween(d: Date, a: Date, b: Date): boolean {
  const t = d.getTime();
  return t >= Math.min(a.getTime(), b.getTime()) && t <= Math.max(a.getTime(), b.getTime());
}
function fmtTrigger(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function fmtInput(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
function parseInputDate(s: string): Date | null {
  // Accept MM/DD/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
  return isNaN(d.getTime()) ? null : startOfDay(d);
}
function buildMonthCells(monthStart: Date): Date[] {
  const firstWeekday = monthStart.getDay();
  const gridStart = addDays(monthStart, -firstWeekday);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(value.end));
  const [fromInput, setFromInput] = useState(fmtInput(value.start));
  const [toInput, setToInput] = useState(fmtInput(value.end));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [pickStart, setPickStart] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Sync local inputs when value changes externally
  useEffect(() => {
    setFromInput(fmtInput(value.start));
    setToInput(fmtInput(value.end));
  }, [value.start, value.end]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setViewMonth(startOfMonth(value.end));
      setPickStart(null);
      setHoverDate(null);
    }
  }, [open, value.end]);

  const handleDayClick = (d: Date) => {
    if (!pickStart) {
      setPickStart(d);
      setHoverDate(d);
    } else {
      const start = d < pickStart ? d : pickStart;
      const end = d < pickStart ? pickStart : d;
      onChange({ start, end });
      setPickStart(null);
    }
  };

  const handleInputCommit = (which: "from" | "to", raw: string) => {
    const parsed = parseInputDate(raw);
    if (!parsed) {
      // revert to canonical
      if (which === "from") setFromInput(fmtInput(value.start));
      else setToInput(fmtInput(value.end));
      return;
    }
    if (which === "from") {
      const end = parsed > value.end ? parsed : value.end;
      onChange({ start: parsed, end });
    } else {
      const start = parsed < value.start ? parsed : value.start;
      onChange({ start, end: parsed });
    }
  };

  const handleClear = () => {
    const today = startOfDay(new Date());
    onChange({ start: today, end: today });
    setPickStart(null);
  };

  const handleToday = () => {
    const today = startOfDay(new Date());
    onChange({ start: today, end: today });
    setPickStart(null);
    setViewMonth(startOfMonth(today));
  };

  const previewRange = useMemo<DateRange | null>(() => {
    if (pickStart && hoverDate) {
      const start = hoverDate < pickStart ? hoverDate : pickStart;
      const end = hoverDate < pickStart ? pickStart : hoverDate;
      return { start, end };
    }
    return null;
  }, [pickStart, hoverDate]);

  const cells = buildMonthCells(viewMonth);
  const today = startOfDay(new Date());
  const activeRange = previewRange ?? value;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97] focus:outline-none focus-visible:border-brand-200 focus-visible:ring-2 focus-visible:ring-brand-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-brand-500">
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
        <span className="tabular-nums">
          {fmtTrigger(value.start)}
          {!sameDay(value.start, value.end) && <> – {fmtTrigger(value.end)}</>}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.8 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-40 mt-2 w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70"
          >
            {/* Header: From / To inputs */}
            <div className="px-4 pt-4 pb-3">
              <div className="text-[13px] font-semibold tracking-tight text-slate-900">Date range</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <DateField label="From" value={fromInput} onChange={setFromInput} onCommit={v => handleInputCommit("from", v)} />
                <DateField label="To"   value={toInput}   onChange={setToInput}   onCommit={v => handleInputCommit("to", v)} />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Single calendar */}
            <div className="px-4 py-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[13px] font-semibold tracking-tight text-slate-900">
                  {MONTHS[viewMonth.getMonth()]} <span className="tabular-nums text-slate-500">{viewMonth.getFullYear()}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMonth(m => addMonths(m, -1))}
                    aria-label="Previous month"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 active:scale-90"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth(m => addMonths(m, 1))}
                    aria-label="Next month"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 active:scale-90"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Weekday labels */}
              <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-slate-400">
                {WEEKDAYS.map((w, wi) => <div key={wi}>{w}</div>)}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-0.5 text-center">
                {cells.map((d, ci) => {
                  const inMonth = d.getMonth() === viewMonth.getMonth();
                  const isStart = sameDay(d, activeRange.start);
                  const isEnd = sameDay(d, activeRange.end);
                  const isInRange = isBetween(d, activeRange.start, activeRange.end);
                  const isEdge = isStart || isEnd;
                  const isSinglePick = sameDay(activeRange.start, activeRange.end);
                  const isToday = sameDay(d, today);

                  return (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => handleDayClick(d)}
                      onMouseEnter={() => pickStart && setHoverDate(d)}
                      disabled={!inMonth}
                      className={`relative grid h-9 place-items-center text-[12px] tabular-nums transition-[background-color,color,transform] duration-100 ease-out active:scale-90 disabled:cursor-default ${
                        isInRange && !isEdge && !isSinglePick ? "bg-brand-50 text-brand-700" : ""
                      } ${
                        isEdge ? "z-10 rounded-md bg-brand-600 font-semibold text-white" : ""
                      } ${
                        !isInRange && !isEdge && inMonth ? "rounded-md text-slate-700 hover:bg-slate-100" : ""
                      } ${
                        !inMonth ? "text-slate-300" : ""
                      }`}
                    >
                      {d.getDate()}
                      {isToday && !isEdge && (
                        <span className="absolute bottom-1 h-0.5 w-3 rounded-full bg-brand-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
              <button
                type="button"
                onClick={handleClear}
                className="text-[13px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-[13px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DateField({
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
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white pl-2.5 pr-2 transition-[box-shadow,border-color] duration-150 ease-out focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={e => onCommit(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="MM/DD/YYYY"
          className="w-full bg-transparent py-1.5 text-[13px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-400">
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
      </div>
    </label>
  );
}
