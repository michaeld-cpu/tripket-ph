"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type SelectProps<T extends string> = {
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
};

const ITEM_H = 36;
const MENU_PADDING = 8;

export default function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel = "Select",
  className = "",
  size = "md",
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"down" | "up">("down");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const current = options.find(o => o.value === value);

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

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = options.length * ITEM_H + MENU_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setPlacement(spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? "up" : "down");
  }, [open, options.length]);

  const padding = size === "sm" ? "px-3 py-1.5" : "px-3 py-2";

  return (
    <div className={`relative inline-block ${className}`} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white text-left text-sm transition-colors ${padding} ${
          open
            ? "border-gray-300 ring-2 ring-brand-100"
            : "border-gray-200 hover:border-gray-300 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
        }`}
      >
        <span className="truncate text-gray-900">{current?.label ?? ariaLabel}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 z-30 min-w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
            placement === "up" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {options.map(opt => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  selected ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {selected && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-brand-600">
                    <path d="M5 12l5 5 9-11" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
