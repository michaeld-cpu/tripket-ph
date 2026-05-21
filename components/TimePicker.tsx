"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * TimePicker — custom HH:MM picker with a column-scroll popover.
 *
 * Trigger:
 *   ┌──────────────────────────┐
 *   │ 🕒  4:00 AM         ⌄    │
 *   └──────────────────────────┘
 *
 * Popover anatomy — three scrollable columns + an AM/PM toggle:
 *   ┌──────────────────────┐
 *   │  Hr   Min     AM  PM │
 *   │ ┌──┐ ┌──┐    ┌──┐ ┌──┐│
 *   │ │ 1│ │00│    │AM│ │PM││
 *   │ │ 2│ │05│    └──┘ └──┘│
 *   │ │ 3│ │10│              │
 *   │ │ …│ │ …│              │
 *   │ └──┘ └──┘              │
 *   │  ───────────────────   │
 *   │  Now                   │
 *   └──────────────────────┘
 *
 * Each column scrolls independently with snap behaviour so picking feels
 * tactile. Minutes step by 5 by default (configurable).
 */

export type TimePickerProps = {
  /** 24h "HH:MM" value. Empty string means "no selection". */
  value: string;
  onChange: (hhmm: string) => void;
  /** Step between selectable minutes (default 5). */
  minuteStep?: number;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
};

export default function TimePicker({
  value,
  onChange,
  minuteStep = 5,
  ariaLabel = "Choose a time",
  placeholder = "Pick a time",
  className = "",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Parse current value into 12h parts. Falls back to a sensible default if blank.
  const parsed = parseHHMM(value);
  const initial = parsed ?? { hour24: 4, minute: 0 };
  const [hour12, setHour12] = useState<number>(to12h(initial.hour24).hour);
  const [period, setPeriod] = useState<"AM" | "PM">(to12h(initial.hour24).period);
  const [minute, setMinute] = useState<number>(snapToStep(initial.minute, minuteStep));

  // Sync local state with the prop when the popover (re)opens so external changes win.
  useEffect(() => {
    if (!open) return;
    const p = parseHHMM(value);
    if (!p) return;
    const { hour, period: per } = to12h(p.hour24);
    setHour12(hour);
    setPeriod(per);
    setMinute(snapToStep(p.minute, minuteStep));
  }, [open, value, minuteStep]);

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

  // Auto-scroll the popover into the centre of its scroll ancestor on open,
  // so it never sits clipped inside a constrained dialog body.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      popoverRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  // Commit the selection back up — runs on every column change so the caller
  // sees the latest pick without needing an explicit "OK" button.
  const commit = (h12: number, m: number, per: "AM" | "PM") => {
    const h24 = to24h(h12, per);
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const triggerLabel = parsed ? formatTime12h(value) : placeholder;

  return (
    <div ref={wrapRef} className={"relative inline-block " + className}>
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
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span className={"flex-1 truncate text-left tabular-nums " + (parsed ? "text-slate-900" : "text-slate-400")}>
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
          className="absolute left-0 top-full z-40 mt-1.5 w-[244px] overflow-hidden rounded-xl bg-white p-2 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-8px_rgba(15,23,42,0.18)]"
          style={{ animation: "row-menu-in 120ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_72px] gap-2 px-1 pb-1 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="text-center">Hr</span>
            <span className="text-center">Min</span>
            <span className="text-center">AM / PM</span>
          </div>

          <div className="grid grid-cols-[1fr_1fr_72px] gap-2">
            {/* Hour column */}
            <ScrollColumn
              ariaLabel="Hour"
              items={hours}
              value={hour12}
              format={(n) => String(n)}
              onPick={(n) => { setHour12(n); commit(n, minute, period); }}
            />
            {/* Minute column */}
            <ScrollColumn
              ariaLabel="Minute"
              items={minutes}
              value={minute}
              format={(n) => String(n).padStart(2, "0")}
              onPick={(n) => { setMinute(n); commit(hour12, n, period); }}
            />
            {/* AM/PM toggle */}
            <div className="flex flex-col gap-1">
              {(["AM", "PM"] as const).map((p) => {
                const active = period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPeriod(p); commit(hour12, minute, p); }}
                    className={
                      "h-[68px] rounded-md text-[12px] font-semibold tracking-tight transition-colors " +
                      (active
                        ? "bg-brand-500 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                    }
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Now shortcut */}
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const h24 = now.getHours();
                const m = snapToStep(now.getMinutes(), minuteStep);
                const { hour, period: per } = to12h(h24);
                setHour12(hour);
                setMinute(m);
                setPeriod(per);
                commit(hour, m, per);
                setOpen(false);
              }}
              className="w-full rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── ScrollColumn — vertical list of selectable numbers ───────────
function ScrollColumn({
  items,
  value,
  format,
  onPick,
  ariaLabel,
}: {
  items: number[];
  value: number;
  format: (n: number) => string;
  onPick: (n: number) => void;
  ariaLabel: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Centre-scroll the current selection into view when the column mounts.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const child = el.querySelector<HTMLButtonElement>(`button[data-value='${value}']`);
    if (child) {
      // Avoid scrolling the *page* — only the column itself.
      el.scrollTo({ top: child.offsetTop - el.clientHeight / 2 + child.clientHeight / 2, behavior: "instant" as ScrollBehavior });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={ariaLabel}
      className="h-[144px] overflow-y-auto rounded-md border border-slate-200 bg-slate-50/40 py-1"
    >
      {items.map((n) => {
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            role="option"
            aria-selected={active}
            data-value={n}
            onClick={() => onPick(n)}
            className={
              "block h-8 w-full text-center font-mono text-[13px] tabular-nums transition-colors " +
              (active
                ? "bg-brand-500 font-semibold text-white"
                : "text-slate-700 hover:bg-slate-100")
            }
          >
            {format(n)}
          </button>
        );
      })}
    </div>
  );
}

// ─────────── Helpers ───────────
function parseHHMM(s: string): { hour24: number; minute: number } | null {
  const m = s?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hour24: h, minute: min };
}
function to12h(hour24: number): { hour: number; period: "AM" | "PM" } {
  const period: "AM" | "PM" = hour24 < 12 ? "AM" : "PM";
  const hour = ((hour24 + 11) % 12) + 1;
  return { hour, period };
}
function to24h(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}
function snapToStep(minute: number, step: number): number {
  return Math.round(minute / step) * step % 60;
}
function formatTime12h(hhmm: string): string {
  const p = parseHHMM(hhmm);
  if (!p) return hhmm;
  const { hour, period } = to12h(p.hour24);
  return `${hour}:${String(p.minute).padStart(2, "0")} ${period}`;
}
