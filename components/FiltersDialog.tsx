"use client";
import { useEffect, useState, type ReactNode } from "react";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import DateRangePicker, { type DateRange } from "@/components/DateRangePicker";

/**
 * FiltersDialog — single entry point for every page-level filter.
 *
 * The bookings and tickets toolbars used to inline 4–6 selects which crowded
 * the header. This dialog collapses them behind a Filters button that opens
 * a vertical list of labeled fields. Apply commits the draft to the parent;
 * Reset zeroes everything to defaults; Cancel discards drafts.
 *
 * Callers pass a `fields` definition list so the dialog stays generic
 * (works for bookings, tickets, or anything else that needs the pattern).
 */

export type SelectFieldDef = {
  kind: "select";
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  defaultValue?: string;
};

export type DateRangeFieldDef = {
  kind: "dateRange";
  key: string;
  label: string;
  value: DateRange;
  onChange: (v: DateRange) => void;
  defaultValue?: DateRange;
};

export type FilterFieldDef = SelectFieldDef | DateRangeFieldDef;

export default function FiltersDialog({
  open,
  onClose,
  fields,
  activeCount,
}: {
  open: boolean;
  onClose: () => void;
  fields: FilterFieldDef[];
  /** How many filters are currently non-default. Drives the empty/reset state copy. */
  activeCount: number;
}) {
  // Draft mirrors the parent's filter state while the dialog is open. We
  // copy on open, edit locally, and commit on Apply — so closing without
  // Apply discards changes.
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) return;
    const seed: Record<string, unknown> = {};
    fields.forEach((f) => { seed[f.key] = f.value; });
    setDraft(seed);
    // Intentionally only re-seed when the dialog opens, not on every field
    // tick — drafts must survive parent re-renders while the modal is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const apply = () => {
    fields.forEach((f) => {
      const next = draft[f.key];
      if (f.kind === "select" && typeof next === "string") f.onChange(next);
      if (f.kind === "dateRange" && next && typeof next === "object") f.onChange(next as DateRange);
    });
    onClose();
  };

  const reset = () => {
    const seed: Record<string, unknown> = {};
    fields.forEach((f) => { seed[f.key] = f.defaultValue ?? (f.kind === "select" ? "all" : f.value); });
    setDraft(seed);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Filters</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {activeCount === 0
                ? "No filters applied yet."
                : `${activeCount} filter${activeCount === 1 ? "" : "s"} active.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4" style={{ scrollbarGutter: "stable" }}>
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.kind === "select" ? (
                <Select
                  value={String(draft[f.key] ?? f.value)}
                  onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                  ariaLabel={f.label}
                  className="w-full"
                  options={f.options}
                />
              ) : (
                <DateRangePicker
                  value={(draft[f.key] as DateRange) ?? f.value}
                  onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                />
              )}
            </Field>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3.5">
          <button
            type="button"
            onClick={reset}
            className="text-[12.5px] font-medium text-slate-500 transition-colors hover:text-rose-600"
          >
            Reset all
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * FiltersButton — toolbar trigger that opens the dialog. Shows the active
 * filter count as a chip so the surface always communicates "what's on."
 */
export function FiltersButton({
  onClick, activeCount,
}: {
  onClick: () => void;
  activeCount: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-500">
        <path d="M3 5h18M6 12h12M10 19h4" />
      </svg>
      Filters
      {activeCount > 0 && (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10.5px] font-semibold text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}
