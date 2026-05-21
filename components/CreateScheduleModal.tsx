"use client";
import { useState } from "react";
import Modal from "@/components/Modal";
import Stepper from "@/components/Stepper";
import WizardHeader from "@/components/wizard/WizardHeader";
import WizardFooter from "@/components/wizard/WizardFooter";
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
 * Uses the shared wizard chrome:
 *  - <WizardHeader> for the icon tile + title + step caption + close button
 *  - <Stepper>      for the active/done/upcoming circles
 *  - <WizardFooter> for Cancel · Back · Continue buttons
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
  const isLast = stepIdx === STEPS.length - 1;

  const goNext = () => {
    if (isLast) {
      onCreate?.();
      onClose();
      setStepIdx(0); // reset for next mount
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex max-h-[90vh] flex-col">
        <WizardHeader
          title="Create schedule"
          caption={step.description}
          onClose={onClose}
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <rect x="3.5" y="5" width="17" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3.5 10h17" />
              <path d="M8 14h2M14 14h2M8 18h2M14 18h2" />
            </svg>
          }
        />

        {/* Stepper — shared component, identical to Add vessel */}
        <div className="border-b border-slate-100 px-6 py-4">
          <Stepper
            steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
            currentIdx={stepIdx}
            onStepClick={setStepIdx}
          />
        </div>

        {/* Step body — step 1 is the real form, the rest are placeholders. */}
        <div
          className="min-h-[280px] flex-1 overflow-y-auto px-6 py-5"
          style={{ scrollbarGutter: "stable" }}
        >
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

        <WizardFooter
          stepIdx={stepIdx}
          stepCount={STEPS.length}
          onCancel={onClose}
          onBack={goBack}
          onContinue={goNext}
          isLast={isLast}
          continueLabel={isLast ? "Create schedule" : "Continue"}
        />
      </div>
    </Modal>
  );
}
