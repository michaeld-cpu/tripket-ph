"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AddOn } from "@/lib/dashboard-data";

/**
 * AddOnsSection — vessel-level catalog of optional extras.
 *
 * Lives inside the vessel-creation flow's "Classes & fares" step (sub-step 2
 * of the embedded vessel wizard). Designed to slot in *after* VesselClasses-
 * AndFaresStep without disturbing its layout.
 *
 * The visual rhythm matches Step2's vehicle-class rows so the page reads as
 * one continuous catalog rather than three different patterns.
 */

export const defaultAddOns: AddOn[] = [
  { key: "extraBag",      label: "Extra Cabin Bag",      descriptor: "Beyond included carry-on",       defaultPrice: 150, enabled: false },
  { key: "mealPack",      label: "Onboard Meal Pack",    descriptor: "Hot meal + drink mid-voyage",    defaultPrice: 250, enabled: false },
  { key: "priorityBoard", label: "Priority Boarding",    descriptor: "Skip the gate queue",            defaultPrice: 150, enabled: false },
  { key: "vehicleWash",   label: "Arrival Vehicle Wash", descriptor: "RoRo-only · cleaned on arrival", defaultPrice: 300, enabled: false },
];

export default function AddOnsSection({
  addOns,
  setAddOns,
}: {
  addOns: AddOn[];
  setAddOns: (next: AddOn[]) => void;
}) {
  const [adding, setAdding] = useState(false);

  const toggle = (key: string) =>
    setAddOns(addOns.map((a) => (a.key === key ? { ...a, enabled: !a.enabled } : a)));
  const update = (key: string, patch: Partial<AddOn>) =>
    setAddOns(addOns.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  const remove = (key: string) => setAddOns(addOns.filter((a) => a.key !== key));
  const add = (label: string, descriptor: string, price: number) => {
    if (!label.trim()) return;
    setAddOns([
      ...addOns,
      { key: `custom-${Date.now()}`, label: label.trim(), descriptor: descriptor.trim() || "Custom add-on", defaultPrice: price, enabled: true },
    ]);
    setAdding(false);
  };

  const enabledCount = addOns.filter((a) => a.enabled).length;
  const isCustom = (k: string) => k.startsWith("custom-");

  return (
    <section className="px-6 py-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Add-ons
          </div>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Optional extras passengers can buy on top of their base ticket. Default prices flow into every schedule using this vessel.
          </p>
        </div>
        <span className="text-[11px] tabular-nums text-slate-400">
          <span className="font-medium text-slate-700">{enabledCount}</span> of {addOns.length} included
        </span>
      </div>

      <div className="divide-y divide-slate-100 border-y border-slate-100">
        {addOns.map((a) => (
          <AddOnRow
            key={a.key}
            addOn={a}
            onToggle={() => toggle(a.key)}
            onChange={(patch) => update(a.key, patch)}
            onRemove={isCustom(a.key) ? () => remove(a.key) : undefined}
          />
        ))}
        <AnimatePresence initial={false}>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <NewAddOnRow onSave={add} onCancel={() => setAdding(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add custom add-on
        </button>
      )}
    </section>
  );
}

function AddOnRow({
  addOn,
  onToggle,
  onChange,
  onRemove,
}: {
  addOn: AddOn;
  onToggle: () => void;
  onChange: (patch: Partial<AddOn>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={addOn.enabled}
        onClick={onToggle}
        className={
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 " +
          (addOn.enabled ? "bg-brand-500" : "bg-slate-300")
        }
      >
        <span
          aria-hidden
          className={
            "block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-transform duration-150 " +
            (addOn.enabled ? "translate-x-4" : "translate-x-0")
          }
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className={"text-[13px] font-semibold tracking-tight " + (addOn.enabled ? "text-slate-900" : "text-slate-600")}>
          {addOn.label}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500">{addOn.descriptor}</div>
      </div>

      {/* Default price input */}
      <div
        className={
          "inline-flex h-8 items-center gap-1 rounded-lg border px-2 transition-[border-color,opacity] duration-150 " +
          (addOn.enabled ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50/60 opacity-60")
        }
      >
        <span className="text-[11px] font-medium text-slate-400">₱</span>
        <input
          type="text"
          inputMode="numeric"
          value={String(addOn.defaultPrice)}
          onChange={(e) => onChange({ defaultPrice: Number(e.target.value.replace(/\D/g, "")) || 0 })}
          disabled={!addOn.enabled}
          aria-label={`${addOn.label} default price`}
          className="w-16 bg-transparent text-right font-mono text-[12px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${addOn.label}`}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  );
}

function NewAddOnRow({
  onSave,
  onCancel,
}: {
  onSave: (label: string, descriptor: string, price: number) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [price, setPrice] = useState("");

  return (
    <div className="space-y-2 bg-slate-50/50 py-3 pl-3 pr-3">
      <div className="grid grid-cols-[1fr_1fr_88px] gap-2">
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add-on name"
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] tracking-tight placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <input
          type="text"
          value={descriptor}
          onChange={(e) => setDescriptor(e.target.value)}
          placeholder="Descriptor (optional)"
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] tracking-tight placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <input
          type="text"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
          placeholder="₱ price"
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[12.5px] tabular-nums text-right placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11.5px] font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(label, descriptor, Number(price) || 0)}
          className="rounded-md bg-brand-600 px-2.5 py-1 text-[11.5px] font-medium text-white transition-colors hover:bg-brand-700"
        >
          Add
        </button>
      </div>
    </div>
  );
}
