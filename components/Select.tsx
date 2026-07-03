"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  /** Render the option menu inline (absolutely positioned within the trigger's
   *  wrapper) instead of portaling it to <body>. Use inside a scrollable modal
   *  so the menu scrolls with the dialog body rather than floating over the
   *  page behind it. Default false keeps the portal behavior page-level selects
   *  rely on to escape ancestor `overflow-hidden`. */
  inline?: boolean;
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
  inline = false,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"down" | "up">("down");
  // Menu is portaled to <body> with fixed coords so it never gets clipped
  // by an ancestor `overflow-hidden` (e.g. a Modal). Coords come from the
  // trigger's rect and recompute on scroll/resize.
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
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
    // Inline mode positions the menu with CSS, so no fixed-coord math needed.
    if (inline) return;
    if (!open || !triggerRef.current) return;
    const compute = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const estimatedHeight = Math.min(options.length * ITEM_H + MENU_PADDING, 280);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const up = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setPlacement(up ? "up" : "down");
      setCoords({
        top: up ? rect.top - estimatedHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, options.length]);

  // Inline menus can open cropped when the trigger sits near the bottom of a
  // scrollable modal body. On open, pick up/down based on room within the
  // nearest scroll container, then nudge that container so the menu is fully
  // visible. Deferred a frame so the menu is laid out first.
  useEffect(() => {
    if (!inline || !open || !triggerRef.current) return;
    const id = requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      // Find the nearest scrollable ancestor (the modal body); fall back to
      // the viewport.
      let scroller: HTMLElement | null = trigger.parentElement;
      while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
        scroller = scroller.parentElement;
      }
      const bounds = scroller?.getBoundingClientRect()
        ?? { top: 0, bottom: window.innerHeight } as DOMRect;
      const tRect = trigger.getBoundingClientRect();
      const menuH = menu.offsetHeight;
      const roomBelow = bounds.bottom - tRect.bottom;
      const roomAbove = tRect.top - bounds.top;
      // Flip up only when there isn't room below but there is above.
      setPlacement(menuH > roomBelow && roomAbove > roomBelow ? "up" : "down");
      // Then scroll the container so the menu lands in view either way.
      menu.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [inline, open]);

  const padding = size === "sm" ? "px-3 py-1.5" : "px-3 py-2";

  // Shared option rows — rendered in both the inline and portaled menus.
  const optionList = options.map(opt => {
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
  });

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

      {/* Inline menu — absolutely positioned within the wrapper so it scrolls
          with the surrounding modal body instead of floating over the page.
          max-h caps the height and overflow-y-auto adds internal scroll. */}
      {inline && open && (
        <div
          ref={menuRef}
          role="listbox"
          className={`absolute left-0 right-0 z-30 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${
            placement === "up" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {optionList}
        </div>
      )}

      {!inline && open && coords && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, maxHeight: 280 }}
          className={`z-[100] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${
            placement === "up" ? "origin-bottom" : "origin-top"
          }`}
        >
          {optionList}
        </div>,
        document.body
      )}
    </div>
  );
}
