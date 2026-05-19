"use client";
import { motion } from "motion/react";
import Select from "./Select";
import type { Vessel } from "@/lib/dashboard-data";

export const typeOptions = [
  { value: "RoRo" as const,           label: "RoRo (Roll-on / Roll-off)" },
  { value: "Fast Craft" as const,     label: "Fast Craft (Passenger only)" },
  { value: "Passenger Ship" as const, label: "Passenger Ship (Passenger only)" },
];

export const passengerOnlyTypes: Vessel["type"][] = ["Fast Craft", "Passenger Ship"];

export const statusOptions = [
  { value: "Active" as const,      label: "Active",      dot: "bg-emerald-500" },
  { value: "Inactive" as const,    label: "Inactive",    dot: "bg-slate-400"   },
  { value: "Maintenance" as const, label: "Maintenance", dot: "bg-amber-500"   },
  { value: "Retired" as const,     label: "Retired",     dot: "bg-rose-500"    },
];

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tracking-tight text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

const wrapperCls =
  "flex items-center rounded-lg border border-slate-200 bg-white transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100";

type Values = {
  name: string;
  type: Vessel["type"];
  imo: string;
  passengers: string;
  vehicleSlots: string;
  status: Vessel["status"];
};

type Props = {
  values: Values;
  onChange: <K extends keyof Values>(key: K, value: Values[K]) => void;
  autoFocusName?: boolean;
};

export default function VesselFormBody({ values, onChange, autoFocusName = true }: Props) {
  const { name, type, imo, passengers, vehicleSlots, status } = values;
  const isPassengerOnly = passengerOnlyTypes.includes(type);

  // Subtle staggered entrance — Emil's range (30–80ms between siblings)
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 220, damping: 26, mass: 0.7, delay: i * 0.04 },
  });

  return (
    <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
      <motion.div {...stagger(0)}>
        <Field label="Vessel name" required>
          <input
            type="text"
            required
            autoFocus={autoFocusName}
            value={name}
            onChange={e => onChange("name", e.target.value)}
            placeholder="e.g. MV Palawan Breeze"
            className={inputCls}
          />
        </Field>
      </motion.div>

      <motion.div {...stagger(1)} className="grid grid-cols-2 gap-4">
        <Field label="Vessel type" required>
          <Select
            value={type}
            onChange={v => onChange("type", v as Vessel["type"])}
            options={typeOptions}
            ariaLabel="Vessel type"
            className="w-full"
          />
        </Field>
        <Field label="IMO number" required hint="7-digit number from the International Maritime Organization">
          <input
            type="text"
            required
            inputMode="numeric"
            maxLength={7}
            value={imo}
            onChange={e => onChange("imo", e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 9756101"
            className={`${inputCls} font-mono`}
          />
        </Field>
      </motion.div>

      <motion.div {...stagger(2)} className="h-px bg-slate-100/70" />

      <motion.div {...stagger(3)} className={`grid gap-4 ${isPassengerOnly ? "grid-cols-1" : "grid-cols-2"}`}>
        <Field label="Passenger capacity" required hint="MARINA-certified maximum">
          <div className={wrapperCls}>
            <input
              type="number"
              required
              min={1}
              value={passengers}
              onChange={e => onChange("passengers", e.target.value)}
              placeholder="e.g. 420"
              className="w-full bg-transparent px-3 py-2 text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="pr-3 text-xs text-slate-400">pax</span>
          </div>
        </Field>

        {!isPassengerOnly && (
          <Field label="Vehicle slots" required hint="Total vehicle capacity">
            <div className={wrapperCls}>
              <input
                type="number"
                required
                min={0}
                value={vehicleSlots}
                onChange={e => onChange("vehicleSlots", e.target.value)}
                placeholder="e.g. 80"
                className="w-full bg-transparent px-3 py-2 text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <span className="pr-3 text-xs text-slate-400">slots</span>
            </div>
          </Field>
        )}
      </motion.div>

      <motion.div {...stagger(4)} className="h-px bg-slate-100/70" />

      <motion.div {...stagger(5)}>
        <Field label="Status">
          <div className="flex flex-wrap gap-1">
            {statusOptions.map(opt => {
              const selected = opt.value === status;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange("status", opt.value)}
                  className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                    selected
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[13px] font-medium tracking-tight text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </label>
  );
}
