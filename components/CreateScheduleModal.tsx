"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Stepper from "@/components/Stepper";
import WizardHeader from "@/components/wizard/WizardHeader";
import WizardFooter from "@/components/wizard/WizardFooter";
import ScheduleStep, { type ScheduleValue } from "@/components/schedule-steps/ScheduleStep";
import RoutesStep, { type RoutesValue } from "@/components/schedule-steps/RoutesStep";
import VesselStep, { type VesselValue, MOCK_FLEET } from "@/components/schedule-steps/VesselStep";
import { defaultVehicleClasses, defaultPassengerTypes } from "@/components/AddVesselModal";
import { defaultAddOns } from "@/components/vessel-extras/AddOnsSection";
import FaresStep, { type FaresValue, initialFaresValue } from "@/components/schedule-steps/FaresStep";
import ReviewStep from "@/components/schedule-steps/ReviewStep";

function initialVesselValue(): VesselValue {
  return {
    mode: "fleet",
    fleetVesselId: "",
    name: "",
    type: "RoRo",
    imoNumber: "",
    passengerCapacity: "",
    vehicleSlots: "",
    status: "Active",
    // lineId is hydrated from the active shipping line at modal-open time.
    lineId: "",
    vehicleClasses: defaultVehicleClasses,
    passengerTypes: defaultPassengerTypes,
    addOns: defaultAddOns,
    newSubStep: 1,
  };
}

function initialRoutesValue(): RoutesValue {
  return {
    originCode: "",
    destinationCode: "",
    distanceNm: "",
    durationLowHrs: "",
    durationHighHrs: "",
    createReturn: false,
  };
}

// Reasonable initial defaults — today's date, 4 AM, weekday picker empty.
function initialScheduleValue(seed?: { date?: Date; hour?: number }): ScheduleValue {
  const base = seed?.date ?? new Date();
  const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
  const end = new Date(base); end.setDate(end.getDate() + 7);
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  const hh = seed?.hour != null ? String(seed.hour).padStart(2, "0") : "04";
  return {
    recurrence: "once",
    departureDate: iso,
    departureTime: `${hh}:00`,
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

/**
 * Payload emitted when the wizard finalises. The voyages calendar uses this
 * to render the new schedule as one (or many, for weekly recurrence) blocks
 * on the appropriate day+time cells.
 */
export type CreatedSchedule = {
  schedule: ScheduleValue;
  routes: RoutesValue;
  vessel: VesselValue;
  fares: FaresValue;
};

export default function CreateScheduleModal({
  open,
  onClose,
  onCreate,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  onCreate?: (payload: CreatedSchedule) => void;
  /** Seed the Schedule step with a specific date/hour when an operator clicks
   *  an empty calendar slot. Weekly recurrence still works — the clicked day
   *  becomes the start date, the operator can pick the runs-on weekdays. */
  prefill?: { date: Date; hour: number };
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleValue>(initialScheduleValue);
  const [routes, setRoutes] = useState<RoutesValue>(initialRoutesValue);
  const [vessel, setVessel] = useState<VesselValue>(initialVesselValue);
  const [fares, setFares] = useState<FaresValue>(initialFaresValue);
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  // Reset every time the modal opens. If a prefill came in (slot click), seed
  // the Schedule step with its date/hour; otherwise use the default of today
  // at 04:00. Stringify the prefill so a new object identity isn't required
  // for the effect to re-seed.
  const prefillKey = prefill ? `${prefill.date.toISOString()}|${prefill.hour}` : "";
  useEffect(() => {
    if (!open) return;
    setStepIdx(0);
    setSchedule(initialScheduleValue(prefill));
    setRoutes(initialRoutesValue());
    setVessel(initialVesselValue());
    setFares(initialFaresValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillKey]);


  // When the operator is registering a new vessel inline (step 3, mode === "new"),
  // intercept the outer wizard's Continue/Back to first walk through the embedded
  // sub-wizard (Identity → Classes & fares → Review). Only after sub-step 3 does
  // Continue advance to the outer step 4.
  const inNewVesselFlow = step.id === "vessel" && vessel.mode === "new";
  const subStep: 1 | 2 | 3 = vessel.newSubStep ?? 1;
  const goNext = () => {
    if (inNewVesselFlow && subStep < 3) {
      setVessel({ ...vessel, newSubStep: (subStep + 1) as 1 | 2 | 3 });
      return;
    }
    if (isLast) {
      onCreate?.({ schedule, routes, vessel, fares });
      onClose();
      setStepIdx(0); // reset for next mount
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => {
    if (inNewVesselFlow && subStep > 1) {
      setVessel({ ...vessel, newSubStep: (subStep - 1) as 1 | 2 | 3 });
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  };

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
          ) : step.id === "routes" ? (
            <RoutesStep value={routes} onChange={setRoutes} />
          ) : step.id === "vessel" ? (
            <VesselStep value={vessel} onChange={setVessel} />
          ) : step.id === "fares" ? (
            <FaresStep value={fares} onChange={setFares} vessel={vessel} />
          ) : (
            <ReviewStep
              schedule={schedule}
              routes={routes}
              vessel={vessel}
              fares={fares}
              fleet={MOCK_FLEET}
              onEdit={setStepIdx}
            />
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
