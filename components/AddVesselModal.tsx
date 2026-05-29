"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Modal from "./Modal";
import { useToast } from "./ToastContext";
import { useShippingLine } from "./ShippingLineContext";
import VesselFormBody, { passengerOnlyTypes, typeOptions } from "./VesselFormBody";
import NumberInput from "./NumberInput";
import { defaultAddOns } from "./vessel-extras/AddOnsSection";
import VesselCatalogStep from "./vessel-extras/VesselCatalogStep";
import type { Vessel, VehicleClass, PassengerType, AddOn } from "@/lib/dashboard-data";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (v: Omit<Vessel, "id">) => void;
};

export const defaultVehicleClasses: VehicleClass[] = [
  { key: "motorcycle",  label: "Motorcycle / Tricycle", descriptor: "≤ 300 kg GVW",   enabled: false, maxWeightKg: 300,   defaultPrice: 300 },
  { key: "car",         label: "Car / SUV / Van",       descriptor: "≤ 3,500 kg GVW", enabled: false, maxWeightKg: 3500,  defaultPrice: 1500 },
  { key: "pickup",      label: "Pickup / AUV",          descriptor: "≤ 3,500 kg GVW", enabled: false, maxWeightKg: 3500,  defaultPrice: 1800 },
  { key: "light_truck", label: "Light Truck / Elf",     descriptor: "3.5 – 7 tons",   enabled: false, maxWeightKg: 7000,  defaultPrice: 3500 },
  { key: "heavy_truck", label: "Heavy Truck / Trailer", descriptor: "7+ tons",        enabled: false, maxWeightKg: 12000, defaultPrice: 6500 },
  { key: "bus",         label: "Bus / Minibus",         descriptor: "≤ 12 m length",  enabled: false, maxLengthM: 12,     defaultPrice: 5000 },
];

export const defaultPassengerTypes: PassengerType[] = [
  { key: "senior",  label: "Senior Citizen",                discountPct: 20,  requiredDoc: "OSCA ID / Senior Citizen ID" },
  { key: "pwd",     label: "Person with Disability (PWD)",  discountPct: 20,  requiredDoc: "PWD ID (national or LGU-issued)" },
  { key: "student", label: "Student",                       discountPct: 10,  requiredDoc: "Valid school ID" },
  { key: "infant",  label: "Infant",                        discountPct: 100, requiredDoc: "Birth certificate or PSA copy", isInfant: true },
];

export const STEP_COPY: Record<1 | 2 | 3, string> = {
  1: "Enter the vessel's basic details and capacity",
  2: "Set vehicle class limits and define passenger fare categories",
  3: "Review the configuration before registering this vessel",
};

export default function AddVesselModal({ open, onClose, onCreate }: Props) {
  const { active } = useShippingLine();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reachedReview, setReachedReview] = useState(false);

  // Step 1 — Identity + Capacity + Status
  const [values, setValues] = useState({
    name: "",
    type: "RoRo" as Vessel["type"],
    imo: "",
    passengers: "",
    vehicleSlots: "",
    status: "Active" as Vessel["status"],
    lineId: active.id,
  });

  // Step 2 — Vehicle classes + Passenger types + Add-ons
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>(defaultVehicleClasses);
  const [passengerTypes, setPassengerTypes] = useState<PassengerType[]>(defaultPassengerTypes);
  const [addOns, setAddOns] = useState<AddOn[]>(defaultAddOns);

  const [submitting, setSubmitting] = useState(false);

  const isPassengerOnly = passengerOnlyTypes.includes(values.type);

  const resetAll = () => {
    setStep(1);
    setReachedReview(false);
    setValues({ name: "", type: "RoRo", imo: "", passengers: "", vehicleSlots: "", status: "Active", lineId: active.id });
    setVehicleClasses(defaultVehicleClasses);
    setPassengerTypes(defaultPassengerTypes);
    setAddOns(defaultAddOns);
  };

  const handleClose = () => {
    if (submitting) return;
    resetAll();
    onClose();
  };

  const step1Valid =
    values.name.trim().length > 0 &&
    values.imo.length === 7 &&
    values.passengers.length > 0 &&
    (isPassengerOnly || values.vehicleSlots.length > 0);

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

    // Submission is only valid on step 3 after the user has reached and acknowledged the review.
    // Any submit firing from step 1 or 2 (e.g. an accidental Enter keypress) is ignored — the
    // user must explicitly click "Register vessel" on the review step to publish.
    if (step !== 3) return;
    if (!reachedReview) return;
    if (!step1Valid) {
      setStep(1);
      setReachedReview(false);
      return;
    }

    setSubmitting(true);
    const v: Omit<Vessel, "id"> = {
      name: values.name.trim(),
      type: values.type,
      imo: values.imo.trim(),
      passengers: parseInt(values.passengers, 10),
      vehicleSlots: isPassengerOnly ? null : parseInt(values.vehicleSlots, 10),
      status: values.status,
      location: values.status === "Active" ? "At port" : values.status,
      vehicleClasses: isPassengerOnly ? [] : vehicleClasses.filter(c => c.enabled),
      passengerTypes,
    };
    onCreate?.(v);
    showToast(`${v.name} added to ${active.name}`);
    setSubmitting(false);
    resetAll();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-2xl">
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Prevent stray Enter keypresses on steps 1 & 2 from submitting the form.
          // Advancement requires an explicit Next / Review click.
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
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Add new vessel</h2>
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
                  onChange={(k, v) => setValues(prev => ({ ...prev, [k]: v }))}
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
                <VesselCatalogStep
                  isPassengerOnly={isPassengerOnly}
                  vehicleClasses={vehicleClasses}
                  setVehicleClasses={setVehicleClasses}
                  passengerTypes={passengerTypes}
                  setPassengerTypes={setPassengerTypes}
                  addOns={addOns}
                  setAddOns={setAddOns}
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
                  addOns={addOns}
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
                {submitting ? "Adding" : "Register vessel"}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────────  STEP INDICATOR  ─────────────────────────
   Thin re-export over the shared Stepper so every dialog renders the
   same active/done/upcoming shapes. Kept here to avoid touching the
   call sites in AddVesselModal / EditVesselModal.                       */

import SharedStepper from "@/components/Stepper";

const VESSEL_STEPS = [
  { id: "1", label: "Identity & capacity" },
  { id: "2", label: "Classes & fares" },
  { id: "3", label: "Review" },
];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return <SharedStepper steps={VESSEL_STEPS} currentIdx={current - 1} />;
}

/* ─────────────────────────  STEP 2  ───────────────────────── */

export function Step2(props: {
  isPassengerOnly: boolean;
  vehicleClasses: VehicleClass[];
  setVehicleClasses: (v: VehicleClass[]) => void;
  passengerTypes: PassengerType[];
  setPassengerTypes: (v: PassengerType[]) => void;
}) {
  const { isPassengerOnly, vehicleClasses, setVehicleClasses, passengerTypes, setPassengerTypes } = props;

  const [addingClass, setAddingClass] = useState(false);
  const [addingPassenger, setAddingPassenger] = useState(false);

  const toggleClass = (key: string) =>
    setVehicleClasses(vehicleClasses.map(c => (c.key === key ? { ...c, enabled: !c.enabled } : c)));

  const updateClass = (key: string, patch: Partial<VehicleClass>) =>
    setVehicleClasses(vehicleClasses.map(c => (c.key === key ? { ...c, ...patch } : c)));

  const updatePassenger = (key: string, patch: Partial<PassengerType>) =>
    setPassengerTypes(passengerTypes.map(p => (p.key === key ? { ...p, ...patch } : p)));

  const addClass = (label: string, descriptor: string, maxWeightKg?: number, maxLengthM?: number) => {
    if (!label.trim()) return;
    const key = `custom-${Date.now()}`;
    const auto =
      !descriptor.trim()
        ? maxWeightKg
          ? `≤ ${maxWeightKg.toLocaleString()} kg`
          : maxLengthM
            ? `≤ ${maxLengthM} m`
            : "Custom limits"
        : descriptor.trim();
    setVehicleClasses([
      ...vehicleClasses,
      { key, label: label.trim(), descriptor: auto, enabled: true, maxWeightKg, maxLengthM },
    ]);
    setAddingClass(false);
  };

  const addPassenger = (label: string, discount: string, doc: string) => {
    if (!label.trim()) return;
    const key = `custom-${Date.now()}`;
    setPassengerTypes([
      ...passengerTypes,
      { key, label: label.trim(), discountPct: parseInt(discount || "0", 10), requiredDoc: doc.trim() },
    ]);
    setAddingPassenger(false);
  };

  const removeClass = (key: string) =>
    setVehicleClasses(vehicleClasses.filter(c => c.key !== key));

  const removePassenger = (key: string) =>
    setPassengerTypes(passengerTypes.filter(p => p.key !== key));

  const enabledCount = vehicleClasses.filter(c => c.enabled).length;

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 220, damping: 26, mass: 0.7, delay: i * 0.04 },
  });

  const isCustom = (key: string) => key.startsWith("custom-");

  return (
    <div className="px-6 py-5">
      {!isPassengerOnly && (
        <motion.section {...stagger(0)} className="mb-7">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Vehicle classes
              </div>
              <p className="mt-1 text-[11.5px] text-slate-500">
                Tap a class to include it. Expand a row to set weight or size limits.
              </p>
            </div>
            <span className="text-[11px] tabular-nums text-slate-400">
              <span className="font-medium text-slate-700">{enabledCount}</span> of {vehicleClasses.length} included
            </span>
          </div>

          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {vehicleClasses.map(cls => (
              <VehicleClassRow
                key={cls.key}
                cls={cls}
                onToggle={() => toggleClass(cls.key)}
                onChange={(patch) => updateClass(cls.key, patch)}
                onRemove={isCustom(cls.key) ? () => removeClass(cls.key) : undefined}
              />
            ))}
            <AnimatePresence initial={false}>
              {addingClass && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <NewClassRow onSave={addClass} onCancel={() => setAddingClass(false)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!addingClass && (
            <button
              type="button"
              onClick={() => setAddingClass(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add custom vehicle type
            </button>
          )}
        </motion.section>
      )}

      <motion.section {...stagger(1)}>
        <div className="mb-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Passenger types
          </div>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Discount rates and required documents for each fare category. These appear when pricing a departure.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_64px_1.5fr] gap-3 border-b border-slate-100 pb-2 pr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          <span>Category</span>
          <span className="text-right">Discount</span>
          <span>Required document</span>
        </div>

        <div className="divide-y divide-slate-100">
          {passengerTypes.map(pt => (
            <PassengerTypeRow
              key={pt.key}
              pt={pt}
              onChange={patch => updatePassenger(pt.key, patch)}
              onRemove={isCustom(pt.key) ? () => removePassenger(pt.key) : undefined}
            />
          ))}
          <AnimatePresence initial={false}>
            {addingPassenger && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <NewPassengerRow onSave={addPassenger} onCancel={() => setAddingPassenger(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!addingPassenger && (
          <button
            type="button"
            onClick={() => setAddingPassenger(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add passenger type
          </button>
        )}
      </motion.section>
    </div>
  );
}

function VehicleClassRow({
  cls, onToggle, onChange, onRemove,
}: { cls: VehicleClass; onToggle: () => void; onChange: (patch: Partial<VehicleClass>) => void; onRemove?: () => void }) {
  return (
    <div className="group">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-2.5 text-left transition-colors duration-150 ease-out hover:text-slate-900 active:scale-[0.998]"
      >
        <span
          className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-[background-color,border-color] duration-150 ease-out ${
            cls.enabled ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"
          }`}
        >
          {cls.enabled && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
              <path d="M5 12l5 5 9-11" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`text-[13px] tracking-tight ${cls.enabled ? "font-medium text-slate-900" : "font-normal text-slate-700"}`}>
            {cls.label}
          </div>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-slate-500">{cls.descriptor}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label="Remove custom class"
            title="Remove custom class"
            className="grid h-5 w-5 place-items-center rounded-md text-rose-400 ring-1 ring-inset ring-rose-200/70 bg-rose-50/60 transition-[background-color,color,box-shadow,transform] duration-150 ease-out hover:bg-rose-500 hover:text-white hover:ring-rose-500 hover:shadow-[0_4px_10px_-4px_rgba(244,63,94,0.55)] active:scale-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${cls.enabled ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {cls.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-3 pb-3 pl-7 pr-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Max weight</label>
                <SuffixInput
                  value={String(cls.maxWeightKg ?? "")}
                  onChange={(v) => onChange({ maxWeightKg: v ? parseInt(v, 10) : undefined })}
                  placeholder="—"
                  suffix="kg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Max length</label>
                <SuffixInput
                  value={String(cls.maxLengthM ?? "")}
                  onChange={(v) => onChange({ maxLengthM: v ? parseFloat(v) : undefined })}
                  placeholder="—"
                  suffix="m"
                />
              </div>
              {/* Base fare — flows downstream as the Voyages Fares default. */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Base fare</label>
                <SuffixInput
                  value={String(cls.defaultPrice ?? "")}
                  onChange={(v) => onChange({ defaultPrice: v ? parseInt(v.replace(/[^\d]/g, ""), 10) : undefined })}
                  placeholder="—"
                  prefix="₱"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* New class composer — inline row */
function NewClassRow({
  onSave, onCancel,
}: { onSave: (label: string, descriptor: string, maxWeightKg?: number, maxLengthM?: number) => void; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const commit = () =>
    onSave(label, "", weight ? parseInt(weight, 10) : undefined, length ? parseFloat(length) : undefined);
  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 shrink-0 rounded border border-brand-300 bg-brand-50" />
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Class name"
          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] tracking-tight text-slate-900 placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 pl-7 pr-1">
        <div>
          <label className="block text-[11px] font-medium text-slate-500">Max weight</label>
          <SuffixInput value={weight} onChange={setWeight} placeholder="—" suffix="kg" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500">Max length</label>
          <SuffixInput value={length} onChange={setLength} placeholder="—" suffix="m" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 pl-7 pr-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] text-slate-500 transition-[color,transform] duration-150 ease-out hover:text-slate-900 active:scale-95"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={!label.trim()}
          className="text-[12px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function PassengerTypeRow({
  pt, onChange, onRemove,
}: { pt: PassengerType; onChange: (patch: Partial<PassengerType>) => void; onRemove?: () => void }) {
  return (
    <div className="group relative grid grid-cols-[1fr_64px_1.5fr] items-center gap-3 py-2.5 pr-1">
      <div>
        <div className="text-[13px] font-medium tracking-tight text-slate-900">{pt.label}</div>
        {pt.isInfant && (
          <div className="text-[11px] text-emerald-600">Free fare · no seat assigned</div>
        )}
      </div>

      {pt.isInfant ? (
        <div className="text-right text-[12px] text-slate-400">—</div>
      ) : (
        <div className="flex items-center rounded-md border border-slate-200 bg-white transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
          <NumberInput
            value={pt.discountPct}
            onChange={e => onChange({ discountPct: parseInt(e.target.value || "0", 10) })}
            className="w-full bg-transparent px-1.5 py-1 text-right text-[13px] tabular-nums text-slate-900 focus:outline-none"
          />
          <span className="pr-1.5 text-[11px] text-slate-400">%</span>
        </div>
      )}

      <input
        type="text"
        value={pt.requiredDoc}
        onChange={e => onChange({ requiredDoc: e.target.value })}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-700 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove custom passenger type"
          title="Remove custom passenger type"
          className="absolute -right-6 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md text-rose-400 ring-1 ring-inset ring-rose-200/70 bg-rose-50/60 transition-[background-color,color,box-shadow,transform] duration-150 ease-out hover:bg-rose-500 hover:text-white hover:ring-rose-500 hover:shadow-[0_4px_10px_-4px_rgba(244,63,94,0.55)] active:scale-90"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* New passenger composer */
function NewPassengerRow({
  onSave, onCancel,
}: { onSave: (label: string, discount: string, doc: string) => void; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [discount, setDiscount] = useState("");
  const [doc, setDoc] = useState("");
  return (
    <div className="py-2.5 pr-1">
      <div className="grid grid-cols-[1fr_64px_1.5fr] items-center gap-3">
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Category name"
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] tracking-tight text-slate-900 placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave(label, discount, doc); } }}
        />
        <div className="flex items-center rounded-md border border-slate-200 bg-white focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
          <NumberInput
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent px-1.5 py-1 text-right text-[13px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="pr-1.5 text-[11px] text-slate-400">%</span>
        </div>
        <input
          type="text"
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          placeholder="Required document"
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <div className="mt-2 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] text-slate-500 transition-[color,transform] duration-150 ease-out hover:text-slate-900 active:scale-95"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(label, discount, doc)}
          disabled={!label.trim()}
          className="text-[12px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  STEP 3 — REVIEW  ───────────────────────── */

export function Step3Review({
  values, isPassengerOnly, vehicleClasses, passengerTypes, addOns, onEditStep,
}: {
  values: { name: string; type: Vessel["type"]; imo: string; passengers: string; vehicleSlots: string; status: Vessel["status"] };
  isPassengerOnly: boolean;
  vehicleClasses: VehicleClass[];
  passengerTypes: PassengerType[];
  /** Optional — only shown when supplied. Standalone AddVesselModal currently
   *  omits this; the wizard's embedded sub-step provides it. */
  addOns?: import("@/lib/dashboard-data").AddOn[];
  onEditStep: (s: 1 | 2) => void;
}) {
  const typeLabel = typeOptions.find(o => o.value === values.type)?.label ?? values.type;
  const enabledClasses = vehicleClasses.filter(c => c.enabled);

  return (
    <div className="px-6 py-5 space-y-7">
      {/* Identity */}
      <ReviewSection title="Identity & capacity" onEdit={() => onEditStep(1)}>
        <ReviewRow label="Vessel name" value={values.name || "—"} prominent />
        <ReviewRow label="Vessel type" value={typeLabel} />
        <ReviewRow label="IMO number" value={<span className="font-mono">{values.imo || "—"}</span>} />
        <ReviewRow
          label="Passenger capacity"
          value={
            <span>
              <span className="font-medium tabular-nums">{values.passengers || "—"}</span>
              <span className="ml-1 text-[11px] text-slate-400">pax</span>
            </span>
          }
        />
        {!isPassengerOnly && (
          <ReviewRow
            label="Vehicle slots"
            value={
              <span>
                <span className="font-medium tabular-nums">{values.vehicleSlots || "—"}</span>
                <span className="ml-1 text-[11px] text-slate-400">slots</span>
              </span>
            }
          />
        )}
        <ReviewRow
          label="Status"
          value={<span className="font-medium tracking-tight text-slate-900">{values.status}</span>}
        />
      </ReviewSection>

      {/* Vehicle classes */}
      {!isPassengerOnly && (
        <ReviewSection
          title="Vehicle classes"
          meta={`${enabledClasses.length} of ${vehicleClasses.length} included`}
          onEdit={() => onEditStep(2)}
        >
          {enabledClasses.length === 0 ? (
            <p className="py-2 text-[12px] text-slate-500">No vehicle classes included.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {enabledClasses.map(cls => (
                <div key={cls.key} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-[13px] tracking-tight text-slate-900">{cls.label}</span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500">{cls.descriptor}</span>
                </div>
              ))}
            </div>
          )}
        </ReviewSection>
      )}

      {/* Passenger types */}
      <ReviewSection
        title="Passenger fare categories"
        meta={`${passengerTypes.length} configured`}
        onEdit={() => onEditStep(2)}
      >
        <div className="divide-y divide-slate-100">
          {passengerTypes.map(pt => (
            <div key={pt.key} className="grid grid-cols-[1fr_64px_1.5fr] items-center gap-3 py-2">
              <div>
                <div className="text-[13px] font-medium tracking-tight text-slate-900">{pt.label}</div>
                {pt.isInfant && (
                  <div className="text-[11px] text-emerald-600">Free fare · no seat assigned</div>
                )}
              </div>
              <div className="text-right text-[12px] tabular-nums">
                {pt.isInfant ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <span className="font-medium text-slate-900">{pt.discountPct}%</span>
                )}
              </div>
              <div className="truncate text-[12px] text-slate-600">{pt.requiredDoc}</div>
            </div>
          ))}
        </div>
      </ReviewSection>

      {/* Add-ons — only when caller passes the catalog. */}
      {addOns && (
        <ReviewSection
          title="Add-ons"
          meta={`${addOns.filter(a => a.enabled).length} of ${addOns.length} included`}
          onEdit={() => onEditStep(2)}
        >
          {addOns.filter(a => a.enabled).length === 0 ? (
            <p className="py-2 text-[12px] text-slate-500">No add-ons included.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {addOns.filter(a => a.enabled).map(a => (
                <div key={a.key} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium tracking-tight text-slate-900">{a.label}</div>
                    <div className="truncate text-[11px] text-slate-500">{a.descriptor}</div>
                  </div>
                  <span className="font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
                    ₱{a.defaultPrice.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ReviewSection>
      )}
    </div>
  );
}

function ReviewSection({
  title, meta, onEdit, children,
}: { title: string; meta?: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </h3>
          {meta && <span className="text-[11px] tabular-nums text-slate-400">{meta}</span>}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95"
        >
          Edit
        </button>
      </div>
      <div className="border-t border-slate-100">{children}</div>
    </section>
  );
}

function ReviewRow({
  label, value, prominent,
}: { label: string; value: React.ReactNode; prominent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className={`min-w-0 truncate text-right text-[13px] ${prominent ? "font-semibold tracking-tight text-slate-900" : "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────  shared atoms  ───────────────────────── */

function SuffixInput({
  value, onChange, placeholder, suffix, prefix,
}: { value: string; onChange: (v: string) => void; placeholder: string; suffix?: string; prefix?: string }) {
  return (
    <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
      {prefix && <span className="pl-3 text-[11px] font-medium text-slate-400">{prefix}</span>}
      <NumberInput
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent px-3 py-2 text-[13px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      {suffix && <span className="pr-3 text-[11px] font-medium text-slate-400">{suffix}</span>}
    </div>
  );
}
