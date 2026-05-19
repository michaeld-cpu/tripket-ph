"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type RowMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
};

// Approximate menu height = py-1 padding + ~36px per item
const ITEM_H = 36;
const MENU_PADDING = 8;

export default function RowMenu({ items, ariaLabel = "Row actions" }: { items: RowMenuItem[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"down" | "up">("down");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Decide placement when the menu opens
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = items.length * ITEM_H + MENU_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      setPlacement("up");
    } else {
      setPlacement("down");
    }
  }, [open, items.length]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={triggerRef}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`grid h-8 w-8 place-items-center rounded-md transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.92] ${open ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={`animate-popover absolute right-0 z-30 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
            placement === "up" ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right"
          }`}
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
