"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Stepper from "@/components/Stepper";
import WizardHeader from "@/components/wizard/WizardHeader";
import WizardFooter from "@/components/wizard/WizardFooter";
import ScheduleStep, { type ScheduleValue, type DayKey } from "@/components/schedule-steps/ScheduleStep";
import RoutesStep, { type RoutesValue } from "@/components/schedule-steps/RoutesStep";
import VesselStep, { type VesselValue, MOCK_FLEET } from "@/components/schedule-steps/VesselStep";
import { defaultVehicleClasses, defaultPassengerTypes, defaultAccommodations } from "@/components/AddVesselModal";
import { defaultAddOns } from "@/components/vessel-extras/AddOnsSection";
import FaresStep, { type FaresValue, initialFaresValue } from "@/components/schedule-steps/FaresStep";
import ReviewStep from "@/components/schedule-steps/ReviewStep";
import { useShippingLine } from "@/components/ShippingLineContext";
import { loadStore, saveStore } from "@/lib/persisted-store";
import type { Vessel } from "@/lib/dashboard-data";

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
    accommodations: defaultAccommodations,
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

// Reasonable initial defaults — empty weekday/time map. If the operator
// clicked a calendar slot to open the wizard, seed that weekday + hour so
// they don't have to retap their starting point.
function initialScheduleValue(seed?: { date?: Date; hour?: number }): ScheduleValue {
  if (seed?.date != null) {
    const dow = seed.date.getDay();
    // JS getDay: Sun=0..Sat=6; map to our Mon-first DayKey order.
    const keys: DayKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const key = keys[dow];
    const hour = seed.hour ?? 8;
    return { dayTimes: { [key]: [hour] } };
  }
  return { dayTimes: {} };
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
  const { active } = useShippingLine();
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
    // Stamp the active shipping line so created voyages are owned by it and
    // survive the line-scoped reload (operators are locked to their line).
    setVessel({ ...initialVesselValue(), lineId: active.id });
    setFares(initialFaresValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillKey]);


  // ── Per-step validity gates ──
  // Mirrors the vessel dialog's pattern: required fields gate the primary
  // button (no inline error markup). Continue stays disabled until the
  // step's data model is complete enough to commit. Review has no inputs,
  // so it's always valid once reached.
  const scheduleValid =
    Object.values(schedule.dayTimes).some((arr) => (arr?.length ?? 0) > 0);

  const routesValid =
    routes.originCode !== "" &&
    routes.destinationCode !== "" &&
    routes.originCode !== routes.destinationCode &&
    Number(routes.distanceNm) > 0 &&
    Number(routes.durationLowHrs) > 0 &&
    Number(routes.durationHighHrs) >= Number(routes.durationLowHrs);

  const vesselFleetValid = vessel.mode === "fleet" && vessel.fleetVesselId !== "";
  const isPassengerOnlyVessel =
    vessel.type === "Fast Craft" || vessel.type === "Passenger Ship";
  const chosenAccom = vessel.accommodations.find((a) => a.enabled) ?? null;
  // Sub-step 1 (Identity) only needs a name + type.
  const vesselNewIdentityValid =
    vessel.mode === "new" && vessel.name.trim() !== "" && !!vessel.type;
  // Sub-step 2 (Capacity & fares) needs a chosen tier with seats + fare.
  // Vehicle deck capacity is derived from each class's quantity, not a field.
  const vesselNewCapacityValid =
    (chosenAccom?.capacity ?? 0) > 0 && (chosenAccom?.fare ?? 0) > 0;
  // Gate the embedded sub-wizard per sub-step so Continue can't skip ahead.
  const subStepForGate: 1 | 2 | 3 = vessel.newSubStep ?? 1;
  const vesselNewValid =
    vesselNewIdentityValid && (subStepForGate < 2 || vesselNewCapacityValid);
  const vesselValid = vessel.mode === "fleet" ? vesselFleetValid : vesselNewValid;

  // Fares is valid when there's a base fare > 0 and at least one passenger
  // type enabled with a price set (or auto-computed from the base).
  const faresValid = Number(fares.baseFare) > 0;

  // Review's "Create schedule" only fires when every prior step passes.
  // Otherwise the Stepper lets users jump to Review out of order and
  // submit a half-built schedule.
  const everyPriorValid = scheduleValid && routesValid && vesselValid && faresValid;
  const stepValid: Record<StepId, boolean> = {
    schedule: scheduleValid,
    routes:   routesValid,
    vessel:   vesselValid,
    fares:    faresValid,
    review:   everyPriorValid,
  };
  const continueDisabled = !stepValid[step.id];

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
      // Reverse handoff: a vessel registered inline here is saved to the same
      // per-line store the Vessels page reads, so it shows up there too.
      if (vessel.mode === "new") {
        const lineId = vessel.lineId || active.id;
        const chosen = vessel.accommodations.find((a) => a.enabled) ?? null;
        // Vehicle deck capacity = sum of each enabled class's quantity.
        const totalVehicleSlots = vessel.vehicleClasses
          .filter((c) => c.enabled)
          .reduce((sum, c) => sum + (c.capacity ?? 0), 0);
        const newVessel: Vessel = {
          id: `v${Date.now()}`,
          imo: vessel.imoNumber.trim(),
          name: vessel.name.trim(),
          type: vessel.type,
          passengers: chosen?.capacity ?? 0,
          vehicleSlots: isPassengerOnlyVessel ? null : totalVehicleSlots,
          status: vessel.status === "Inactive" ? "Inactive" : "Active",
          location: vessel.status === "Active" ? "At port" : vessel.status,
          accommodations: chosen ? [chosen] : [],
          vehicleClasses: vessel.vehicleClasses.filter((c) => c.enabled),
          passengerTypes: vessel.passengerTypes,
        };
        const existing = loadStore<Vessel[]>("vessels", lineId) ?? [];
        saveStore("vessels", lineId, [newVessel, ...existing]);
      }
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
          continueDisabled={continueDisabled}
        />
      </div>
    </Modal>
  );
}
