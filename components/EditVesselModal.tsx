"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Modal from "./Modal";
import { useToast } from "./ToastContext";
import VesselFormBody, { passengerOnlyTypes } from "./VesselFormBody";
import {
  StepIndicator,
  Step2,
  Step3Review,
  STEP_COPY,
  defaultVehicleClasses,
  defaultPassengerTypes,
} from "./AddVesselModal";
import type { Vessel, VehicleClass, PassengerType } from "@/lib/dashboard-data";

type Props = {
  open: boolean;
  vessel: Vessel | null;
  onClose: () => void;
  onSave?: (v: Vessel) => void;
};

export default function EditVesselModal({ open, vessel, onClose, onSave }: Props) {
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reachedReview, setReachedReview] = useState(false);

  const [values, setValues] = useState({
    name: "",
    type: "RoRo" as Vessel["type"],
    imo: "",
    passengers: "",
    vehicleSlots: "",
    status: "Active" as Vessel["status"],
    lineId: "",
  });
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>(defaultVehicleClasses);
  const [passengerTypes, setPassengerTypes] = useState<PassengerType[]>(defaultPassengerTypes);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate every time the modal opens with a vessel — merge persisted classes/types onto defaults
  // so newly-added presets aren't dropped when editing an older record.
  useEffect(() => {
    if (!open || !vessel) return;
    setStep(1);
    setReachedReview(false);
    setValues({
      name: vessel.name,
      type: vessel.type,
      imo: vessel.imo,
      passengers: String(vessel.passengers),
      vehicleSlots: vessel.vehicleSlots === null ? "" : String(vessel.vehicleSlots),
      status: vessel.status,
      // Vessel.lineId not yet persisted on the canonical Vessel type — falls
      // back to the active line via VesselFormBody's render-time hydration.
      lineId: "",
    });
    const savedClasses = vessel.vehicleClasses ?? [];
    const merged = defaultVehicleClasses.map((d) => {
      const found = savedClasses.find((s) => s.key === d.key);
      return found ? { ...d, ...found } : d;
    });
    const customs = savedClasses.filter((s) => !defaultVehicleClasses.some((d) => d.key === s.key));
    setVehicleClasses([...merged, ...customs]);
    setPassengerTypes(vessel.passengerTypes ?? defaultPassengerTypes);
  }, [open, vessel]);

  const isPassengerOnly = passengerOnlyTypes.includes(values.type);

  const step1Valid =
    !!vessel &&
    values.name.trim().length > 0 &&
    values.passengers.length > 0 &&
    (isPassengerOnly || values.vehicleSlots.length > 0);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleNext = () => {
    if (step === 1) {
      if (!step1Valid) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
      setTimeout(() => setReachedReview(true), 300);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setReachedReview(false);
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (step !== 3) return;
    if (!reachedReview || !vessel) return;
    if (!step1Valid) {
      setStep(1);
      setReachedReview(false);
      return;
    }

    setSubmitting(true);
    const updated: Vessel = {
      ...vessel,
      name: values.name.trim(),
      type: values.type,
      imo: values.imo.trim(),
      passengers: parseInt(values.passengers, 10),
      vehicleSlots: isPassengerOnly ? null : parseInt(values.vehicleSlots, 10),
      status: values.status,
      location: values.status === "Active" ? vessel.location : values.status,
      vehicleClasses: isPassengerOnly ? [] : vehicleClasses.filter((c) => c.enabled),
      passengerTypes,
    };
    onSave?.(updated);
    showToast(`${updated.name} updated`);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-2xl">
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && step !== 3) {
            const target = e.target as HTMLElement;
            if (target.tagName !== "TEXTAREA") e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12 3v3" />
                <path d="M6 13V8h12v5" />
                <path d="M3 13h18l-1.8 5.2a2 2 0 0 1-1.9 1.3H6.7a2 2 0 0 1-1.9-1.3L3 13Z" />
                <path d="M2.5 21c1.2 0 1.2-1 2.4-1s1.2 1 2.4 1 1.2-1 2.4-1 1.2 1 2.3 1 1.2-1 2.4-1 1.2 1 2.4 1 1.2-1 2.3-1" />
              </svg>
            </span>
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Edit vessel</h2>
                <span className="text-[12px] text-slate-400">·</span>
                <span className="font-mono text-[11px] text-slate-500">IMO {vessel?.imo ?? "—"}</span>
              </div>
              <p className="text-[11.5px] text-slate-500">{STEP_COPY[step]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-5">
          <StepIndicator current={step} />
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <VesselFormBody
                  values={values}
                  onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
                  autoFocusName={false}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Step2
                  isPassengerOnly={isPassengerOnly}
                  vehicleClasses={vehicleClasses}
                  setVehicleClasses={setVehicleClasses}
                  passengerTypes={passengerTypes}
                  setPassengerTypes={setPassengerTypes}
                />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Step3Review
                  values={values}
                  isPassengerOnly={isPassengerOnly}
                  vehicleClasses={vehicleClasses}
                  passengerTypes={passengerTypes}
                  onEditStep={(s) => setStep(s)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
          <div className="text-[11px] text-slate-500">
            Step <span className="font-medium text-slate-700 tabular-nums">{step}</span> of 3
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
            >
              Cancel
            </button>
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && !step1Valid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
              >
                {step === 2 ? "Review" : "Next"}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !step1Valid || !reachedReview}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
              >
                {submitting && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 animate-spin">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {submitting ? "Saving" : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
