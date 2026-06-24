"use client";
import { useEffect, useState } from "react";
import Modal from "./Modal";

type Mode = "disable" | "activate";

type Props = {
  open: boolean;
  /** Display label for the route (e.g. "Cebu City → Dumaguete City"). */
  label: string;
  /** "disable" (Active → Inactive) or "activate" (Inactive → Active). */
  mode: Mode;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * Confirm switching a route's operational status. Mirrors VesselStatusDialog —
 * disabling is the danger action, activating is positive; both single-click.
 */
export default function RouteStatusDialog({ open, label, mode, onClose, onConfirm }: Props) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setSubmitting(false);
  }, [open]);

  const isDisable = mode === "disable";

  const handleConfirm = () => {
    if (submitting) return;
    setSubmitting(true);
    onConfirm();
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} maxWidth="max-w-md">
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={
              "grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 " +
              (isDisable
                ? "bg-rose-50 text-rose-600 ring-rose-200/70"
                : "bg-emerald-50 text-emerald-600 ring-emerald-200/70")
            }
          >
            {isDisable ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <circle cx="12" cy="12" r="9" />
                <path d="M5.6 5.6l12.8 12.8" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">
              {isDisable ? "Disable this route?" : "Activate this route?"}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              <span className="font-medium text-slate-900">{label || "—"}</span>{" "}
              {isDisable
                ? "will be set to Inactive — it stops being available for new schedules. Nothing is deleted; you can activate it again at any time."
                : "will be set to Active and available again for scheduling."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className={
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-[background-color,transform,box-shadow] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100 " +
            (isDisable
              ? "bg-rose-600 hover:bg-rose-700 hover:shadow-[0_6px_16px_-6px_rgba(244,63,94,0.55)]"
              : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-[0_6px_16px_-6px_rgba(16,185,129,0.55)]")
          }
        >
          {submitting
            ? (isDisable ? "Disabling…" : "Activating…")
            : (isDisable ? "Disable route" : "Activate route")}
        </button>
      </div>
    </Modal>
  );
}
