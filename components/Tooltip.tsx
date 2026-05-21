"use client";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

type Side = "top" | "bottom";

type Variant = "dark" | "light";

type Props = {
  content: ReactNode;
  children: ReactNode;
  /** Show only when the wrapped element is truncated (ellipsis active). */
  onlyWhenTruncated?: boolean;
  side?: Side;
  /** Delay before showing, ms. */
  delay?: number;
  className?: string;
  /**
   * Visual variant — `dark` (default) is the compact slate-900 pill used inline.
   * `light` matches the chart tooltips: white surface with hairline border, soft shadow,
   * and enough room for multi-line content.
   */
  variant?: Variant;
};

export default function Tooltip({
  content,
  children,
  onlyWhenTruncated = false,
  side = "top",
  delay = 250,
  className = "",
  variant = "dark",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const shouldShow = () => {
    if (!onlyWhenTruncated) return true;
    // Walk into the first element child — children may be wrapped — and check for overflow.
    const el = wrapRef.current?.firstElementChild as HTMLElement | null;
    if (!el) return false;
    return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
  };

  const handleEnter = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (shouldShow()) setOpen(true);
    }, delay);
  };
  const handleLeave = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setOpen(false);
  };

  return (
    <span
      ref={wrapRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className={`relative inline-flex max-w-full ${className}`}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 2 : -2, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "top" ? 2 : -2, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.6 }}
            className={
              "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 -translate-x-px " +
              (variant === "dark"
                ? "whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium tracking-tight text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.45)] "
                : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11.5px] text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.10)] ") +
              (side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5")
            }
          >
            {content}
            <span
              className={
                "absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 " +
                (variant === "dark" ? "bg-slate-900 " : "border border-slate-200 bg-white ") +
                (side === "top"
                  ? variant === "dark"
                    ? "top-full -mt-1"
                    : "top-full -mt-1 border-l-0 border-t-0"
                  : variant === "dark"
                    ? "bottom-full -mb-1"
                    : "bottom-full -mb-1 border-r-0 border-b-0")
              }
              aria-hidden
            />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
