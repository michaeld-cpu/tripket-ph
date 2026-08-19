"use client";
import Modal from "@/components/Modal";

/**
 * BulkDisableRoutesDialog — confirms pulling a set of legs off sale.
 *
 * The summary restates the filters the selection was made under rather than
 * listing every route: a bulk action can span dozens of rows, and "which
 * filters produced this set" is the thing an operator needs to verify before
 * committing. The count is the check that the set is the expected size.
 */
export default function BulkDisableRoutesDialog({
  open,
  count,
  origin,
  destination,
  dateFrom,
  dateTo,
  onClose,
  onConfirm,
}: {
  open: boolean;
  /** How many routes the action will affect. */
  count: number;
  /** Origin filter in force, or null when unfiltered. */
  origin: string | null;
  destination: string | null;
  /** Schedule window the selection was drawn from. */
  dateFrom: Date | null;
  dateTo: Date | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-6">
        <div className="flex items-start gap-3.5">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="9" />
              <path d="M5.6 5.6l12.8 12.8" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Disable selected routes?</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-slate-500">
              The selected routes will be marked{" "}
              <span className="font-semibold text-rose-600">Disabled</span>.
            </p>
          </div>
        </div>

        {/* Summary — what's being acted on, and under which filters. */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[14px] font-medium tracking-tight text-slate-700">Routes to be disabled</span>
            <span className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-[13.5px] font-bold tabular-nums text-rose-600">
              {count} selected
            </span>
          </div>
          <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Route</div>
              <div className="mt-1 flex items-center gap-2 text-[14px] tracking-tight text-slate-800">
                <span>{origin ?? "Any origin"}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-400">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span>{destination ?? "Any destination"}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Schedule date</div>
              <div className="mt-1 flex items-center gap-2 text-[14px] tabular-nums tracking-tight text-slate-800">
                <span>{fmt(dateFrom)}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-400">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span>{fmt(dateTo)}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-slate-400">
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 7.5h.01" />
          </svg>
          <span>
            These selected routes will be disabled based on the current filters above. To change the
            filters, clear the current selection first.
          </span>
        </p>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Keep enabled
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Disable {count} route{count === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
