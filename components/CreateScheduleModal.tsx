"use client";
import { useState } from "react";
import Modal from "@/components/Modal";
import ScheduleStep, { type ScheduleValue } from "@/components/schedule-steps/ScheduleStep";

// Reasonable initial defaults — today's date, 4 AM, weekday picker empty.
function initialScheduleValue(): ScheduleValue {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const end = new Date(today); end.setDate(end.getDate() + 7);
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  return {
    recurrence: "once",
    departureDate: iso,
    departureTime: "04:00",
    runsOn: [],
    endDate: endIso,
  };
}

/**
 * CreateScheduleModal — five-step wizard for spinning up a new schedule.
 *
 * Steps:
 *   1. Schedule  – when it runs (dates, recurrence)
 *   2. Routes    – which origin/destination pair it serves
 *   3. Vessel    – which ship to assign
 *   4. Fares     – pricing by passenger type and vehicle class
 *   5. Review    – summary + confirm
 *
 * Step bodies are intentionally blank for now — this commit only wires the
 * stepper anatomy, navigation, and modal chrome.
 */
type StepId = "schedule" | "routes" | "vessel" | "fares" | "review";

const STEPS: { id: StepId; label: string; description: string }[] = [
  { id: "schedule", label: "Schedule", description: "When the trips run." },
  { id: "routes",   label: "Routes",   description: "Which ports the schedule serves." },
  { id: "vessel",   label: "Vessel",   description: "Which ship gets the assignment." },
  { id: "fares",    label: "Fares",    description: "Pricing per passenger type & vehicle class." },
  { id: "review",   label: "Review",   description: "Confirm and create." },
];

export default function CreateScheduleModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate?: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleValue>(initialScheduleValue);
  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;

  const goNext = () => {
    if (isLast) {
      onCreate?.();
      onClose();
      // Reset for next mount.
      setStepIdx(0);
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex max-h-[90vh] flex-col">
        {/* ─── Header ─── */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Create schedule</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Step <span className="font-mono tabular-nums text-slate-700">{stepIdx + 1}</span> of{" "}
              <span className="font-mono tabular-nums text-slate-700">{STEPS.length}</span> · {step.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* ─── Stepper ─── */}
        <Stepper currentIdx={stepIdx} onStepClick={setStepIdx} />

        {/* ─── Step body ───
            Step 1 is the real form; the others are placeholders for now. The min-h
            keeps the modal stable so the stepper doesn't jiggle between steps. */}
        <div className="min-h-[280px] flex-1 overflow-y-auto px-6 py-5">
          {step.id === "schedule" ? (
            <ScheduleStep value={schedule} onChange={setSchedule} />
          ) : (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Step {stepIdx + 1}
                </div>
                <div className="mt-1.5 text-[15px] font-semibold tracking-tight text-slate-900">{step.label}</div>
                <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-slate-500">
                  {step.description} The form for this step will live here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-[12.5px] font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={isFirst}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
            >
              {isLast ? "Create schedule" : "Continue"}
              {!isLast && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              )}
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

/**
 * Stepper — horizontal indicator at the top of the wizard.
 *
 *  ●  ─── ●  ─── ○ ─── ○ ─── ○
 *  Schedule  Routes  Vessel  Fares  Review
 *
 * Completed steps get a brand-orange fill + check; the active step gets a brand
 * ring on white with the step number; upcoming steps stay slate. Connector lines
 * between nodes show progress at a glance. Clicking a previous step jumps back.
 */
function Stepper({
  currentIdx,
  onStepClick,
}: {
  currentIdx: number;
  onStepClick: (idx: number) => void;
}) {
  return (
    <div className="border-b border-slate-100 px-6 py-4">
      <ol className="flex items-start gap-0">
        {STEPS.map((s, i) => {
          const state: "done" | "active" | "upcoming" =
            i < currentIdx ? "done" : i === currentIdx ? "active" : "upcoming";
          const reachable = i <= currentIdx;
          return (
            <li key={s.id} className="flex flex-1 items-start gap-3">
              {/* Node + label */}
              <button
                type="button"
                onClick={() => reachable && onStepClick(i)}
                disabled={!reachable}
                aria-current={state === "active" ? "step" : undefined}
                className={
                  "group flex min-w-0 items-start gap-2.5 text-left " +
                  (reachable ? "cursor-pointer" : "cursor-not-allowed")
                }
              >
                <span
                  className={
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-colors " +
                    (state === "done"
                      ? "bg-brand-500 text-white"
                      : state === "active"
                        ? "bg-white text-brand-700 ring-2 ring-brand-500"
                        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200")
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
                <div className="min-w-0">
                  <div
                    className={
                      "text-[12px] font-semibold tracking-tight " +
                      (state === "active"
                        ? "text-slate-900"
                        : state === "done"
                          ? "text-slate-700 group-hover:text-slate-900"
                          : "text-slate-400")
                    }
                  >
                    {s.label}
                  </div>
                </div>
              </button>

              {/* Connector — between nodes, not after the last one */}
              {i < STEPS.length - 1 && (
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
    </div>
  );
}
