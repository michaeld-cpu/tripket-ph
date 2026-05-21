"use client";

/**
 * Stepper — site-wide horizontal step indicator for multi-step dialogs and wizards.
 *
 *   ● ─── ● ─── ○ ─── ○ ─── ○
 *   Done   Active  Upcoming Upcoming Upcoming
 *
 * State shapes (locked to the same look on every site dialog):
 *  - done      → solid brand-500 disc + white check icon, label slate-700.
 *                Clickable to jump back when `onStepClick` is provided.
 *  - active    → white disc with a brand-500 ring + brand-700 step number,
 *                label slate-900.
 *  - upcoming  → slate-100 disc + slate-200 ring + slate-500 number,
 *                label slate-400, non-interactive.
 *
 * Connectors between nodes flip brand-500 once the *prior* step is done.
 *
 * Usage:
 *   <Stepper
 *     steps={[
 *       { id: "schedule", label: "Schedule" },
 *       { id: "routes",   label: "Routes" },
 *       { id: "vessel",   label: "Vessel" },
 *       { id: "fares",    label: "Fares" },
 *       { id: "review",   label: "Review" },
 *     ]}
 *     currentIdx={1}
 *     onStepClick={setStepIdx}
 *   />
 */

export type StepperStep = {
  id: string;
  label: string;
};

export default function Stepper({
  steps,
  currentIdx,
  onStepClick,
  className = "",
}: {
  steps: StepperStep[];
  currentIdx: number;
  /** When provided, *completed* steps become clickable so the user can jump back. */
  onStepClick?: (idx: number) => void;
  className?: string;
}) {
  return (
    <ol className={"flex items-start gap-0 " + className}>
      {steps.map((s, i) => {
        const state: "done" | "active" | "upcoming" =
          i < currentIdx ? "done" : i === currentIdx ? "active" : "upcoming";
        const reachable = i <= currentIdx && !!onStepClick;
        return (
          <li key={s.id} className="flex flex-1 items-start gap-3">
            <button
              type="button"
              onClick={() => reachable && onStepClick?.(i)}
              disabled={!reachable}
              aria-current={state === "active" ? "step" : undefined}
              className={
                "group flex min-w-0 items-start gap-2.5 text-left " +
                (reachable ? "cursor-pointer" : "cursor-default")
              }
            >
              <span
                className={
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-colors " +
                  (state === "done"
                    ? "bg-brand-500 text-white"
                    : state === "active"
                      ? "border border-brand-500 bg-white text-brand-700"
                      : "border border-slate-200 bg-white text-slate-400")
                }
              >
                {state === "done" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <path d="M5 12l5 5 9-11" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <div className="flex min-w-0 flex-col leading-tight">
                <span
                  className={
                    "text-[10.5px] font-semibold uppercase tracking-[0.1em] " +
                    (state === "upcoming" ? "text-slate-400" : "text-slate-500")
                  }
                >
                  Step {i + 1}
                </span>
                <span
                  className={
                    "text-[12.5px] tracking-tight " +
                    (state === "active"
                      ? "font-semibold text-slate-900"
                      : state === "done"
                        ? "font-medium text-slate-700 group-hover:text-slate-900"
                        : "font-medium text-slate-400")
                  }
                >
                  {s.label}
                </span>
              </div>
            </button>

            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={
                  "mt-[11px] h-px flex-1 rounded-full transition-colors " +
                  (i < currentIdx ? "bg-brand-500" : "bg-slate-200")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
