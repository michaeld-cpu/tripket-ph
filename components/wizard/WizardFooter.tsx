"use client";

/**
 * WizardFooter — shared bottom action bar for multi-step modals.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Step 2 of 5            Cancel  ‹ Back   Continue ›       │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Anatomy & visual contract (matches AddVesselModal):
 *  - "Step N of M" caption on the left (slate-500, bold number tabular)
 *  - Cancel — neutral outlined button (slate-200 border, hover slate-50)
 *  - Back — same neutral outlined button with a leading chevron (hidden on step 1)
 *  - Primary — solid brand-600 filled button with a trailing chevron (or no glyph on submit)
 *  - All buttons share: h-8 (py-1.5), text-sm font-medium, rounded-lg, 150ms transitions
 *
 * Locks the button shapes so every wizard footer renders identically.
 */

export default function WizardFooter({
  stepIdx,
  stepCount,
  onCancel,
  onBack,
  onContinue,
  continueLabel = "Continue",
  isLast = false,
  isSubmitting = false,
  continueDisabled = false,
}: {
  /** Zero-based active step index. */
  stepIdx: number;
  /** Total number of steps. */
  stepCount: number;
  onCancel: () => void;
  onBack: () => void;
  onContinue: () => void;
  /** Label for the primary action button on the last step (default "Create"). */
  continueLabel?: string;
  /** When true the primary action shows a spinner and the label. */
  isLast?: boolean;
  isSubmitting?: boolean;
  continueDisabled?: boolean;
}) {
  const isFirst = stepIdx === 0;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
      <div className="text-[11px] text-slate-500">
        Step{" "}
        <span className="font-medium tabular-nums text-slate-700">{stepIdx + 1}</span>{" "}
        of {stepCount}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
        >
          Cancel
        </button>
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {isSubmitting && (
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 animate-spin">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {continueLabel}
          {!isLast && !isSubmitting && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M9 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
