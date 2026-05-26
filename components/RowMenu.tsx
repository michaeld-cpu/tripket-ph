"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type RowMenuItem = {
  label: string;
  onClick: () => void;
  /** Marks the item as destructive — rose text, rose-tinted hover. */
  danger?: boolean;
  /** Disables the item (greyed out, non-clickable). */
  disabled?: boolean;
  /** Optional 16×16 icon rendered before the label. */
  icon?: React.ReactNode;
  /** Optional secondary text rendered to the right (e.g. shortcut, count). */
  meta?: string;
  /** Render a thin hairline divider *above* this item — useful before destructive groups. */
  divider?: boolean;
};

/**
 * RowMenu — the shared kebab dropdown for table rows.
 *
 * Trigger: a compact `h-7 w-7` slate-toned button with three vertical dots.
 * Surface: a tight, rounded-xl floating menu with a hairline ring + layered shadow.
 * Items:   per-item rounded-md tiles inside `p-1` padding — feels like a refined
 *          desktop menu rather than a bare dropdown list.
 *
 * Behaviour:
 * - Closes on outside click and `Escape`.
 * - Auto-flips to open upward when there isn't enough space below the trigger.
 * - Animates in with a brief fade + scale (no spring, no horizontal motion).
 */
const ITEM_H = 32;          // tile height + vertical gap
const MENU_PADDING = 8;     // total py + divider room

export default function RowMenu({
  items,
  ariaLabel = "Row actions",
  align = "right",
}: {
  items: RowMenuItem[];
  ariaLabel?: string;
  /** Horizontal anchor — `right` aligns to the trigger's right edge (default), `left` to its left edge. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"down" | "up">("down");
  // Portal coords — the popover lives on document.body so it escapes any
  // ancestor `overflow-x-auto` containers (eg. the bookings table) which
  // would otherwise add a horizontal scrollbar when the menu pushed past
  // the viewport edge. Coords are computed from the trigger's rect.
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // Outside click + Escape closes the menu. The popover is portaled, so the
  // pointer test must include both the trigger wrapper *and* the popover.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = ref.current?.contains(target);
      const insidePop = popRef.current?.contains(target);
      if (!insideTrigger && !insidePop) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Compute viewport coords + decide vertical placement when the menu opens
  // and on scroll/resize so the floating menu stays anchored to the trigger.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const compute = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const estimatedHeight = items.length * ITEM_H + MENU_PADDING;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const flipUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setPlacement(flipUp ? "up" : "down");
      const MENU_WIDTH = 208; // w-52
      const left = align === "right"
        ? rect.right - MENU_WIDTH
        : rect.left;
      const top = flipUp
        ? rect.top - estimatedHeight - 6
        : rect.bottom + 6;
      setCoords({ top, left });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, items.length, align]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={
          "grid h-7 w-7 place-items-center rounded-lg transition-[background-color,color] duration-150 ease-out " +
          (open
            ? "bg-slate-100 text-slate-900"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")
        }
      >
        {/* Three slim vertical dots — finer weight than the old 18px chunky version */}
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
          <circle cx="8" cy="3.25" r="1.35" />
          <circle cx="8" cy="8"    r="1.35" />
          <circle cx="8" cy="12.75" r="1.35" />
        </svg>
      </button>

      {open && coords && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          role="menu"
          aria-orientation="vertical"
          style={{ position: "fixed", top: coords.top, left: coords.left }}
          className={
            "row-menu-pop z-[60] w-52 overflow-hidden rounded-xl bg-white p-1 " +
            "ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-8px_rgba(15,23,42,0.18)] " +
            (placement === "up" ? "origin-bottom-right" : "origin-top-right")
          }
        >
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && i !== 0 && (
                <div role="separator" className="my-1 h-px bg-slate-100" />
              )}
              <button
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { if (!item.disabled) { item.onClick(); setOpen(false); } }}
                className={
                  "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] " +
                  "transition-colors duration-100 ease-out " +
                  (item.disabled
                    ? "cursor-not-allowed text-slate-400"
                    : item.danger
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900")
                }
              >
                {item.icon && (
                  <span
                    className={
                      "shrink-0 transition-colors duration-100 " +
                      (item.disabled
                        ? "text-slate-300"
                        : item.danger
                          ? "text-rose-500"
                          : "text-slate-400 group-hover:text-slate-700")
                    }
                  >
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 truncate font-medium">{item.label}</span>
                {item.meta && (
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400">{item.meta}</span>
                )}
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      <style jsx>{`
        .row-menu-pop {
          animation: row-menu-in 120ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes row-menu-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
