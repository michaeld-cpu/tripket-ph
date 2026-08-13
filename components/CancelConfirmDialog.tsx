"use client";
import { useEffect, useState, type ReactNode } from "react";
import Modal from "@/components/Modal";
import Select from "@/components/Select";

// ─────────── CancelConfirmDialog ───────────
// Shared by the Bookings page and the vehicle-ticket module. Cancelling queues
// the amount for return, so the copy states that consequence instead of asking
// "are you sure". It deliberately avoids naming seats or counts — a booking on
// an already-departed voyage releases nothing, so any such claim would be wrong
// for that case. The dismiss button says "Keep …" so it can't be misread as the
// destructive action sitting next to it.
//
// A reason is required; "Others" unlocks a free-text field. The chosen reason
// is what the caller writes into the activity log.
//
// Three lists, one per surface, because the reasons genuinely differ: a whole
// sailing is grounded for operational causes, while an individual ticket is
// voided over the record itself.

// Booking-level.
export const CANCEL_REASONS = [
  "Bad weather / port closure",
  "No available vessel",
  "Duplicate booking",
  "Others",
] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

// Per-ticket (passenger and vehicle) — a single ticket is cancelled because
// the record is wrong, not because the trip can't sail.
export const TICKET_CANCEL_REASONS = [
  "Duplicate Ticket",
  "Invalid/Missing Requirements",
  "Others",
] as const;

// A whole route/leg can't be cancelled for a duplicate booking — that's a
// per-booking concern — so route cancellation offers the operational reasons
// only.
export const ROUTE_CANCEL_REASONS = [
  "Bad weather / port closure",
  "No available vessel",
  "Others",
] as const;

export default function CancelConfirmDialog({
  targetRef,
  noun = "booking",
  title,
  body,
  confirmLabel,
  dismissLabel,
  reasons = CANCEL_REASONS,
  onClose,
  onConfirm,
}: {
  /** Ref of the record being cancelled; null closes the dialog. */
  targetRef: string | null;
  /** What's being cancelled — drives the default title, body and dismiss copy. */
  noun?: "booking" | "ticket" | "route";
  /** Override the default "Cancel {noun} '{ref}'?" heading. */
  title?: string;
  /** Override the default consequence line under the heading. */
  body?: ReactNode;
  /** Override the confirm button's "Cancel {noun}" label. */
  confirmLabel?: string;
  /** Override the dismiss button's "Keep {noun}" label. */
  dismissLabel?: string;
  /** Selectable reasons. Defaults to the booking-level set; routes pass the
   *  narrowed ROUTE_CANCEL_REASONS. */
  reasons?: readonly string[];
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [other, setOther] = useState("");
  const [touched, setTouched] = useState(false);

  // Reset whenever a new record is targeted.
  useEffect(() => {
    if (targetRef) { setReason(""); setOther(""); setTouched(false); }
  }, [targetRef]);

  const valid = reason !== "" && (reason !== "Others" || other.trim().length > 0);
  const submit = () => {
    if (!valid) { setTouched(true); return; }
    onConfirm(reason === "Others" ? other.trim() : reason);
  };

  return (
    <Modal open={!!targetRef} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <circle cx="12" cy="12" r="9" />
              <path d="M6 6l12 12" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
              {title ?? <>Cancel {noun} &lsquo;{targetRef}&rsquo;?</>}
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
              {body ?? <>This marks the {noun} For Refund. The payout is processed separately.</>}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[12px] font-semibold text-slate-700">
            Cancellation reason <span className="text-rose-500">*</span>
          </label>
          <div className="mt-1.5">
            <Select
              value={reason}
              options={reasons.map((r) => ({ value: r, label: r }))}
              onChange={(v) => { setReason(v); setTouched(true); }}
              ariaLabel="Cancellation reason"
              placeholder="Select a reason…"
              className="w-full"
            />
          </div>

          {reason === "Others" && (
            <textarea
              rows={3}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Describe the reason…"
              className={
                "mt-2 w-full resize-none rounded-lg border px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 " +
                (touched && other.trim() === ""
                  ? "border-rose-300 focus:ring-rose-200"
                  : "border-slate-200 focus:border-brand-400 focus:ring-brand-200")
              }
            />
          )}

          {touched && !valid && (
            <p className="mt-1 text-[11.5px] font-medium text-rose-500">
              {reason === "Others"
                ? "Enter the reason before confirming."
                : "Select a cancellation reason before confirming."}
            </p>
          )}

          {/* The reason isn't internal-only — it reaches the passenger, and
              can't be edited once confirmed. Sits under the field so it's read
              before the admin types, not after. */}
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-slate-500">
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <path d="M12 7.5h.01" />
            </svg>
            <span>
              <span className="font-semibold text-slate-600">The passenger sees this reason in their booking app.</span>{" "}
              Keep it clear and factual.
            </span>
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
          >
            {dismissLabel ?? `Keep ${noun}`}
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={submit}
            className={
              "rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition-colors " +
              (valid ? "bg-rose-600 hover:bg-rose-700" : "cursor-not-allowed bg-rose-300")
            }
          >
            {confirmLabel ?? `Cancel ${noun}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
