"use client";
import { useEffect, useState } from "react";
import Modal from "./Modal";
import type { Line } from "@/lib/shipping-lines";

type Props = {
  open: boolean;
  line: Line | null;
  /** Display name to confirm against (falls back to the line name). */
  name?: string;
  onClose: () => void;
  onConfirm: (line: Line) => void;
};

export default function SuspendLineDialog({ open, line, name, onClose, onConfirm }: Props) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setTyped(""); setSubmitting(false); }
  }, [open]);

  const expected = (name || line?.name) ?? "";
  const matches = typed.trim() === expected.trim();

  const handleConfirm = () => {
    if (!line || !matches || submitting) return;
    setSubmitting(true);
    onConfirm(line);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} maxWidth="max-w-md">
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200/70"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9h2v6H9zM13 9h2v6h-2z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">
              Deactivate this shipping line?
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              <span className="font-medium text-slate-900">{expected || "—"}</span>{" "}
              will stop accepting new bookings and its future schedules will be hidden. Existing
              bookings are honored and nothing is deleted — you can activate it again at any time.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-3">
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Type the line name to confirm
          </label>
          <p className="mt-0.5 font-mono text-[11.5px] text-slate-500">{expected}</p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && matches) { e.preventDefault(); handleConfirm(); } }}
            autoFocus
            placeholder="Line name"
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
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
          disabled={!matches || submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-rose-700 hover:shadow-[0_6px_16px_-6px_rgba(244,63,94,0.55)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100"
        >
          {submitting ? "Deactivating…" : "Deactivate line"}
        </button>
      </div>
    </Modal>
  );
}
