"use client";
import { useEffect, useState } from "react";
import { useShippingLine } from "@/components/ShippingLineContext";
import { loadCatalog, type LineCatalog } from "@/lib/settings-data";
import NumberInput from "@/components/NumberInput";
import type { VehicleClass, PassengerType, AddOn, AccommodationClass } from "@/lib/dashboard-data";

/**
 * VesselCatalogStep — toggle-only catalog selector for the vessel dialog.
 *
 * The Configurations tab (Settings page) owns the master list of vehicle
 * classes, passenger types, and add-ons per shipping line. This step
 * renders those three lists straight from the catalog — the operator can
 * only include / exclude items, never edit prices, discounts, or required
 * documents. Anything added in Configurations shows up here automatically;
 * anything removed disappears.
 *
 * Vessel state stores the catalog rows it has on, but the catalog is
 * always the source of truth for what's renderable. On mount (and on the
 * `tripket-catalog` storage event, fired when Configurations saves) we
 * re-read the catalog so adds/edits/deletes flow in live.
 */

type Props = {
  isPassengerOnly: boolean;
  /** Accommodation + capacity controls. Optional — only the Add-vessel wizard
   *  drives these; Edit / schedule flows omit them and keep capacity elsewhere. */
  accommodations?: AccommodationClass[];
  setAccommodations?: (next: AccommodationClass[]) => void;
  totalPassengers?: number;
  vehicleSlots?: string;
  setVehicleSlots?: (next: string) => void;
  vehicleClasses: VehicleClass[];
  setVehicleClasses: (next: VehicleClass[]) => void;
  passengerTypes: PassengerType[];
  setPassengerTypes: (next: PassengerType[]) => void;
  addOns: AddOn[];
  setAddOns: (next: AddOn[]) => void;
};

export default function VesselCatalogStep(props: Props) {
  const { isPassengerOnly, accommodations, setAccommodations, totalPassengers, vehicleSlots, setVehicleSlots } = props;
  const { active } = useShippingLine();

  const showCapacity = !!accommodations && !!setAccommodations;
  // Multi-select: a vessel can offer several seating tiers. Total passenger
  // capacity is the sum of all enabled tiers' seats.
  const toggleAccom = (key: string) =>
    setAccommodations?.((accommodations ?? []).map((a) => (a.key === key ? { ...a, enabled: !a.enabled } : a)));
  const setAccomCapacity = (key: string, capacity: number) =>
    setAccommodations?.((accommodations ?? []).map((a) => (a.key === key ? { ...a, capacity } : a)));
  const setAccomFare = (key: string, fare: number) =>
    setAccommodations?.((accommodations ?? []).map((a) => (a.key === key ? { ...a, fare } : a)));

  const [catalog, setCatalog] = useState<LineCatalog | null>(null);

  // Read catalog on mount + whenever the active line changes. Also listen
  // for cross-tab/in-tab storage changes so new entries saved in
  // Configurations appear without remounting the dialog.
  useEffect(() => {
    const read = () => setCatalog(loadCatalog(active.id));
    read();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === `tripket.settings.${active.id}`) read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("tripket:catalog-updated", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tripket:catalog-updated", read);
    };
  }, [active.id]);

  if (!catalog) return null;

  // Vessel state is the source of `enabled` per key. Look up the vessel's
  // saved row by catalog key; if absent, default to off (vehicle/add-on)
  // or included (passenger types — all are included unless the operator
  // explicitly excludes one).
  const classOn = (key: string) => props.vehicleClasses.find((c) => c.key === key)?.enabled ?? false;
  // Max-units and companion seats prefill from the line catalog (Settings →
  // Configurations) and stay editable per-vessel; the vessel's saved override
  // wins once set. `cat` is the catalog row supplying the default.
  const classCapacity = (key: string, cat?: VehicleClass) =>
    props.vehicleClasses.find((c) => c.key === key)?.capacity ?? cat?.capacity;
  const classCompanions = (key: string, cat?: VehicleClass) =>
    props.vehicleClasses.find((c) => c.key === key)?.includedCompanions ?? cat?.includedCompanions ?? 1;
  const classPrice = (key: string, cat?: VehicleClass) =>
    props.vehicleClasses.find((c) => c.key === key)?.defaultPrice ?? cat?.defaultPrice;
  const addOnOn = (key: string) => props.addOns.find((a) => a.key === key)?.enabled ?? false;
  // Add-on price prefills from the line catalog, editable per vessel.
  const addOnPrice = (key: string, cat?: AddOn) =>
    props.addOns.find((a) => a.key === key)?.defaultPrice ?? cat?.defaultPrice;
  const paxOn = (key: string) => {
    const row = props.passengerTypes.find((p) => p.key === key);
    if (!row) return true;
    // is_active defaults to true (legacy rows / not yet toggled).
    return row.is_active !== false;
  };

  const writeClass = (c: VehicleClass, on: boolean) => {
    const saved = props.vehicleClasses.find((x) => x.key === c.key);
    const others = props.vehicleClasses.filter((x) => x.key !== c.key);
    // Preserve any capacity the operator already set when toggling on/off.
    props.setVehicleClasses([...others, { ...c, ...saved, enabled: on }]);
  };
  const writeClassCapacity = (c: VehicleClass, capacity: number | undefined) => {
    const saved = props.vehicleClasses.find((x) => x.key === c.key);
    const others = props.vehicleClasses.filter((x) => x.key !== c.key);
    props.setVehicleClasses([...others, { ...c, ...saved, enabled: true, capacity }]);
  };
  const writeClassPrice = (c: VehicleClass, defaultPrice: number | undefined) => {
    const saved = props.vehicleClasses.find((x) => x.key === c.key);
    const others = props.vehicleClasses.filter((x) => x.key !== c.key);
    props.setVehicleClasses([...others, { ...c, ...saved, enabled: true, defaultPrice }]);
  };
  const writeClassCompanions = (c: VehicleClass, includedCompanions: number) => {
    const saved = props.vehicleClasses.find((x) => x.key === c.key);
    const others = props.vehicleClasses.filter((x) => x.key !== c.key);
    props.setVehicleClasses([
      ...others,
      { ...c, ...saved, enabled: true, includedCompanions: Math.max(0, includedCompanions) },
    ]);
  };
  const writeAddOn = (a: AddOn, on: boolean) => {
    const saved = props.addOns.find((x) => x.key === a.key);
    const others = props.addOns.filter((x) => x.key !== a.key);
    // Preserve any price the operator already overrode when toggling on/off.
    props.setAddOns([...others, { ...a, ...saved, enabled: on }]);
  };
  const writeAddOnPrice = (a: AddOn, defaultPrice: number) => {
    const saved = props.addOns.find((x) => x.key === a.key);
    const others = props.addOns.filter((x) => x.key !== a.key);
    props.setAddOns([...others, { ...a, ...saved, enabled: true, defaultPrice }]);
  };
  const writePax = (p: PassengerType, on: boolean) => {
    const others = props.passengerTypes.filter((x) => x.key !== p.key);
    props.setPassengerTypes([...others, { ...p, is_active: on }]);
  };

  const enabledClasses = catalog.vehicleClasses.filter((c) => classOn(c.key)).length;
  const enabledAddOns  = catalog.addOns.filter((a) => addOnOn(a.key)).length;
  const includedPax    = catalog.passengerTypes.filter((p) => paxOn(p.key)).length;

  const emptyHint = (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-[11.5px] text-slate-400">
      Nothing in the line catalog yet. Add entries in <span className="font-medium text-slate-600">Settings → Configurations</span> to make them available here.
    </div>
  );

  return (
    <div className="space-y-7 px-6 py-5">
      {/* Accommodation — toggle any seating tiers this vessel offers; total
          passenger capacity is the sum of the enabled tiers' seats. */}
      {showCapacity && (
        <section>
        <SectionHeader
          title="Accommodation"
          hint="Toggle the seating tiers this vessel offers, each with its seat count and base fare. The total is the vessel's passenger capacity; fares carry into Voyages as defaults."
          count={`${(totalPassengers ?? 0).toLocaleString()} pax`}
        />
        <div className="divide-y divide-slate-100 border-y border-slate-100">
          {(accommodations ?? []).map((a) => (
            <button
              key={a.key}
              type="button"
              role="switch"
              aria-checked={a.enabled}
              onClick={() => toggleAccom(a.key)}
              className="flex w-full items-center gap-3 py-2.5 text-left"
            >
              <span
                className={
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 " +
                  (a.enabled ? "bg-brand-500" : "bg-slate-300")
                }
              >
                <span
                  aria-hidden
                  className={
                    "block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-transform duration-150 " +
                    (a.enabled ? "translate-x-4" : "translate-x-0")
                  }
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className={"text-[13px] font-semibold tracking-tight " + (a.enabled ? "text-slate-900" : "text-slate-600")}>
                  {a.label}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">{a.descriptor}</div>
              </div>
              {a.enabled && (
                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                  <div className="flex w-[130px] items-center rounded-lg border border-slate-200 bg-white transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
                    <NumberInput
                      min={0}
                      value={a.capacity ? String(a.capacity) : ""}
                      onChange={(e) => setAccomCapacity(a.key, e.target.value ? parseInt(e.target.value, 10) : 0)}
                      placeholder="e.g. 420"
                      className="w-full bg-transparent px-3 py-2 text-right text-[13px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    <span className="pr-3 text-[11px] text-slate-400">seats</span>
                  </div>
                  <div className="flex w-[140px] items-center rounded-lg border border-slate-200 bg-white transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
                    <span className="pl-3 text-[11px] text-slate-400">₱</span>
                    <NumberInput
                      min={0}
                      value={a.fare ? String(a.fare) : ""}
                      onChange={(e) => setAccomFare(a.key, e.target.value ? parseInt(e.target.value, 10) : 0)}
                      placeholder="Base fare"
                      className="w-full bg-transparent px-2 py-2 text-right text-[13px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>
      )}

      {!isPassengerOnly && (
        <section>
          <SectionHeader title="Vehicle classes" hint="Toggle which classes this vessel can carry; set each fare and the quantity it can store. Values prefill from Settings → Configurations and can be overridden here." count={`${enabledClasses} of ${catalog.vehicleClasses.length}`} />
          {catalog.vehicleClasses.length === 0 ? emptyHint : (
            <div className="divide-y divide-slate-100 border-y border-slate-100">
              {catalog.vehicleClasses.map((c) => {
                const on = classOn(c.key);
                const cap = classCapacity(c.key, c);
                const price = classPrice(c.key, c);
                const boxCls = (enabled: boolean) =>
                  "flex w-[110px] items-center rounded-lg border bg-white transition-[border-color,box-shadow,opacity] duration-150 ease-out focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100 " +
                  (enabled ? "border-slate-200 hover:border-slate-300" : "border-slate-100 opacity-50");
                return (
                  <ToggleRow
                    key={c.key}
                    on={on}
                    onToggle={() => writeClass(c, !on)}
                    label={c.label}
                    descriptor={c.descriptor}
                    right={
                      <div className="flex items-center gap-2">
                        {/* Fare — prefilled from Settings → Configurations, editable per vessel. */}
                        <div className={boxCls(on)}>
                          <span className="pl-2.5 text-[11px] text-slate-400">₱</span>
                          <NumberInput
                            min={0}
                            disabled={!on}
                            value={price !== undefined ? String(price) : ""}
                            onChange={(e) => writeClassPrice(c, e.target.value ? parseInt(e.target.value, 10) : undefined)}
                            placeholder="0"
                            className="w-full bg-transparent px-2 py-1.5 text-right text-[12px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className={boxCls(on)}>
                          <NumberInput
                            min={0}
                            disabled={!on}
                            value={cap !== undefined ? String(cap) : ""}
                            onChange={(e) => writeClassCapacity(c, e.target.value ? parseInt(e.target.value, 10) : undefined)}
                            placeholder="0"
                            className="w-full bg-transparent px-2 py-1.5 text-right text-[12px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
                          />
                          <span className="pr-2 text-[10px] text-slate-400">qty</span>
                        </div>
                      </div>
                    }
                    below={
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/70 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium tracking-tight text-slate-700">Includes driver + companion seats</div>
                          <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                            Driver always rides free. Pick how many extra companion seats are bundled into the vehicle fare.
                          </div>
                        </div>
                        <Stepper
                          value={classCompanions(c.key, c)}
                          onChange={(n) => writeClassCompanions(c, n)}
                        />
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      <section>
        <SectionHeader title="Passenger types" hint="Toggle which fare categories this vessel offers. Discounts and required documents come from Settings → Configurations." count={`${includedPax} of ${catalog.passengerTypes.length}`} />
        {catalog.passengerTypes.length === 0 ? emptyHint : (
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {catalog.passengerTypes.map((p) => {
              const on = paxOn(p.key);
              return (
                <ToggleRow
                  key={p.key}
                  on={on}
                  onToggle={() => writePax(p, !on)}
                  label={p.label}
                  descriptor={p.requiredDoc}
                  right={
                    <span className="font-mono text-[11px] tabular-nums text-slate-400">
                      {p.isInfant
                        ? "Free fare"
                        : (p.discountKind ?? "percent") === "flat"
                          ? `₱${(p.discountFlat ?? 0).toLocaleString()} off`
                          : `${p.discountPct}% off`}
                    </span>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Add-ons" hint="Optional extras this vessel offers. Prices prefill from Settings → Configurations and can be overridden here." count={`${enabledAddOns} of ${catalog.addOns.length}`} />
        {catalog.addOns.length === 0 ? emptyHint : (
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {catalog.addOns.map((a) => {
              const on = addOnOn(a.key);
              const price = addOnPrice(a.key, a);
              return (
                <ToggleRow
                  key={a.key}
                  on={on}
                  onToggle={() => writeAddOn(a, !on)}
                  label={a.label}
                  descriptor={a.descriptor}
                  right={
                    <div
                      className={
                        "flex w-[110px] items-center rounded-lg border bg-white transition-[border-color,box-shadow,opacity] duration-150 ease-out focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100 " +
                        (on ? "border-slate-200 hover:border-slate-300" : "border-slate-100 opacity-50")
                      }
                    >
                      <span className="pl-2.5 text-[11px] text-slate-400">₱</span>
                      <NumberInput
                        min={0}
                        disabled={!on}
                        value={price !== undefined ? String(price) : ""}
                        onChange={(e) => writeAddOnPrice(a, e.target.value ? parseInt(e.target.value, 10) : 0)}
                        placeholder="0"
                        className="w-full bg-transparent px-2 py-1.5 text-right text-[12px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
                      />
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, hint, count }: { title: string; hint: string; count: string }) {
  const hasOf = count.includes(" of ");
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
        <p className="mt-1 text-[11.5px] text-slate-500">{hint}</p>
      </div>
      {count && (
        <span className="text-[11px] tabular-nums text-slate-400">
          {hasOf ? (
            <>
              <span className="font-medium text-slate-700">{count.split(" of ")[0]}</span> of {count.split(" of ")[1]}
            </>
          ) : (
            <span className="font-medium text-slate-700">{count}</span>
          )}
        </span>
      )}
    </div>
  );
}

function ToggleRow({
  on, onToggle, label, descriptor, right, below,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  descriptor?: string;
  right?: React.ReactNode;
  /** Optional indented sub-row shown under the main row (e.g. companion seats). */
  below?: React.ReactNode;
}) {
  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={onToggle}
          className={
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 " +
            (on ? "bg-brand-500" : "bg-slate-300")
          }
        >
          <span
            aria-hidden
            className={
              "block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-transform duration-150 " +
              (on ? "translate-x-4" : "translate-x-0")
            }
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className={"text-[13px] font-semibold tracking-tight " + (on ? "text-slate-900" : "text-slate-600")}>
            {label}
          </div>
          {descriptor && <div className="mt-0.5 truncate text-[11px] text-slate-500">{descriptor}</div>}
        </div>
        {right}
      </div>
      {on && below && <div className="mt-2 pl-12">{below}</div>}
    </div>
  );
}

// Compact +/- stepper for the companion-seats control. Prefilled from the line
// catalog (Settings → Configurations) but freely editable per vessel. Driver
// rides free on top of this, so it counts only the extra bundled helpers.
function Stepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label="Decrease companions"
        className="grid h-7 w-7 place-items-center text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M5 12h14" /></svg>
      </button>
      <span className="grid h-7 w-9 place-items-center border-x border-slate-200 font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase companions"
        className="grid h-7 w-7 place-items-center text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}
