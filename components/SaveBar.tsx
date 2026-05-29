"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * SaveBar — fixed bottom action bar that spans the content region next to the
 * sidebar. Appears only when there are unsaved edits. The left offset tracks
 * the sidebar's live width (it can collapse), so the bar always aligns with
 * the page content. Shared across Settings + Account.
 */
export default function SaveBar({
  open,
  onSave,
  onDiscard,
  label = "You have unsaved changes",
  saveLabel = "Save changes",
  saveDisabled = false,
  disabledHint,
}: {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  label?: string;
  saveLabel?: string;
  /** Disables Save (without hiding the bar) — used to gate required fields. */
  saveDisabled?: boolean;
  /** Optional copy that replaces the default "You have unsaved changes" text
   *  when Save is disabled, so the user knows what's still missing. */
  disabledHint?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [leftPx, setLeftPx] = useState(240);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const measure = () => {
      const aside = document.querySelector("aside");
      if (aside) setLeftPx(aside.getBoundingClientRect().width);
    };
    measure();
    window.addEventListener("resize", measure);
    const id = window.setInterval(measure, 400);
    return () => { window.removeEventListener("resize", measure); window.clearInterval(id); };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={
        "fixed bottom-0 right-0 z-40 transition-[transform,opacity] duration-200 ease-out " +
        (open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")
      }
      style={{ left: leftPx }}
    >
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-8 py-3.5 shadow-[0_-10px_30px_-16px_rgba(15,23,42,0.25)] backdrop-blur">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
          <span className={"h-1.5 w-1.5 rounded-full " + (saveDisabled ? "bg-rose-500" : "bg-brand-500")} />
          {saveDisabled && disabledHint ? disabledHint : label}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onDiscard} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300">
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="inline-flex items-center rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
