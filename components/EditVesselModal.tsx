"use client";
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useToast } from "./ToastContext";
import VesselFormBody, { passengerOnlyTypes, statusOptions } from "./VesselFormBody";

// A vessel is edited as Active or Inactive only; Maintenance/Retired are
// lifecycle states not set from this dialog.
const EDIT_STATUSES = statusOptions.filter(
  (s) => s.value === "Active" || s.value === "Inactive",
);
import {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!vessel || !step1Valid) return;

    setSubmitting(true);
    const updated: Vessel = {
      ...vessel,
      name: values.name.trim(),
      type: values.type,
      imo: values.imo.trim(),
      passengers: parseInt(values.passengers, 10),
      vehicleSlots: isPassengerOnly ? null : parseInt(values.vehicleSlots, 10),
      status: values.status,
      is_enabled: values.status === "Active",
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
      <form onSubmit={handleSubmit}>
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
              <p className="text-[11.5px] text-slate-500">{STEP_COPY[1]}</p>
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

        {/* Body — single identity page. */}
        <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
          <VesselFormBody
            values={values}
            onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
            autoFocusName={false}
            statuses={EDIT_STATUSES}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !step1Valid}
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
          </div>
        </div>
      </form>
    </Modal>
  );
}
