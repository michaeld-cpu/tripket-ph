"use client";

/**
 * Fares step — fourth stop of the Create-Schedule wizard.
 *
 * An add-item table per section. Accommodation, passenger types, vehicle types
 * and add-ons each start with (or seed) rows the operator edits inline. The UI
 * source of truth is list-based (accommodationRows / passengerRows / vehicle +
 * add-on keyed maps); the legacy keyed price maps + baseFare are derived so
 * ReviewStep and the voyages payload keep working unchanged.
 */

import { useState } from "react";
import Select from "@/components/Select";
import type { VesselValue } from "@/components/schedule-steps/VesselStep";
import type { RoutesValue } from "@/components/schedule-steps/RoutesStep";

export type FareRow = { enabled: boolean; price: string };
/** Vehicle-specific fare row. The vehicle fee always includes 1 driver
 *  seat at no extra charge; `includedCompanions` is how many *additional*
 *  comped seats ride free under the same fee (commonly 0-2). `qtyLimit` is the
 *  max units of this vehicle type per voyage (required, > 0). `description` is
 *  an editable override of the catalog descriptor. */
export type VehicleFareRow = FareRow & { includedCompanions: number; qtyLimit?: string; description?: string };

export type DiscountType = "Fixed" | "Percentage";
/** A passenger-type row. `cls` is the fixed catalog class the operator picks;
 *  `name` is the editable display label (defaults to the class) and the
 *  discount is edited inline. `locked` rows (the two seeded defaults) keep
 *  their class fixed and can't be deleted, but can still be renamed. */
export type PassengerFareRow = {
  id: string;
  /** Catalog class (one of PASSENGER_OPTIONS). */
  cls: string;
  name: string;
  discountType: DiscountType;
  discountValue: string;
  locked?: boolean;
};
/** An accommodation-fare row. `name` empty ⇒ unselected placeholder. */
export type AccommodationRow = {
  id: string;
  name: string;
  capacity: string;
  baseFare: string;
};
/** An add-on row. `name` empty ⇒ unselected placeholder. */
export type AddOnRow = {
  id: string;
  name: string;
  price: string;
};

export type FaresValue = {
  /** Headline base fare — the cheapest priced accommodation row. Derived. */
  baseFare: string;
  /** Accommodation rows (name + capacity + base fare). */
  accommodationRows: AccommodationRow[];
  /** Passenger-type rows (fixed-name + editable discount). */
  passengerRows: PassengerFareRow[];
  /** Add-on rows (name + price). */
  addOnRows: AddOnRow[];
  /** Derived from accommodationRows for backward-compatible consumers. */
  accommodationPrices: Record<string, string>;
  /** Kept for backward compatibility (unused by the new UI). */
  passengerPrices: Record<string, FareRow>;
  /** Keyed by VehicleClass.key. */
  vehiclePrices: Record<string, VehicleFareRow>;
  /** Derived from addOnRows for backward-compatible consumers. */
  addOnPrices: Record<string, FareRow>;
};

// Fixed passenger-type options (independent of the vessel catalog).
const PASSENGER_OPTIONS = ["Regular", "Free", "Student", "Senior Citizen", "PWD", "Child", "Infant"];
// The seeded default rows — always present, undeletable.
function defaultPassengerRows(): PassengerFareRow[] {
  return [
    { id: "pax-regular", cls: "Regular", name: "Regular", discountType: "Percentage", discountValue: "0", locked: true },
    { id: "pax-free", cls: "Free", name: "Free", discountType: "Percentage", discountValue: "100", locked: true },
    { id: "pax-child", cls: "Child", name: "Child (2-11)", discountType: "Percentage", discountValue: "50" },
  ];
}

// Service fee kind, edited on this step; the numeric value lives on
// routes.serviceFee. `serviceFeeType` is UI-local (not persisted downstream).
export type ServiceFeeType = "Fixed" | "Percentage";

// Fixed add-on options (independent of the vessel catalog).
const ADDON_OPTIONS = ["Extra Cabin Bag", "Oversized Luggage", "Fragile Handling", "Travel Insurance"];

export function initialFaresValue(): FaresValue {
  return {
    baseFare: "",
    accommodationRows: [],
    passengerRows: defaultPassengerRows(),
    addOnRows: [],
    accommodationPrices: {},
    passengerPrices: {},
    vehiclePrices: {},
    addOnPrices: {},
  };
}

// Recompute the derived maps (accommodationPrices, addOnPrices) + baseFare from
// the row lists so downstream consumers keep working.
function derive(v: FaresValue): FaresValue {
  const accommodationPrices: Record<string, string> = {};
  v.accommodationRows.forEach((r) => {
    if (r.name) accommodationPrices[r.name] = r.baseFare;
  });
  const addOnPrices: Record<string, FareRow> = {};
  (v.addOnRows ?? []).forEach((r) => {
    if (r.name) addOnPrices[r.name] = { enabled: true, price: r.price };
  });
  const nums = v.accommodationRows.map((r) => Number(r.baseFare)).filter((n) => n > 0);
  const cheapest = nums.length ? Math.min(...nums) : 0;
  return { ...v, accommodationPrices, addOnPrices, baseFare: cheapest ? String(cheapest) : "" };
}

let ROW_SEQ = 0;
const rowId = (prefix: string) => `${prefix}-${ROW_SEQ++}`;

export default function FaresStep({
  value,
  onChange,
  vessel,
  routes,
  onRoutesChange,
}: {
  value: FaresValue;
  onChange: (next: FaresValue) => void;
  /** The vessel chosen in step 3 — defines what's priceable here. */
  vessel: VesselValue;
  /** Route value — carries the per-leg service fee, edited in its own section. */
  routes: RoutesValue;
  onRoutesChange: (next: RoutesValue) => void;
}) {
  const [serviceFeeType, setServiceFeeType] = useState<ServiceFeeType>("Fixed");

  // Back-compat for stores created before the list fields existed.
  const accommodationRows = value.accommodationRows ?? [];
  // Rows stored before the class column existed carry only `name` — fall back
  // to it so the class select still resolves.
  const passengerRows = (value.passengerRows ?? defaultPassengerRows()).map((r) => (r.cls ? r : { ...r, cls: r.name }));
  const addOnRows = value.addOnRows ?? [];

  const vehicleCatalog = vessel.vehicleClasses;
  const accomTierNames = (vessel.accommodations ?? []).filter((a) => a.enabled);

  const vehicleRows = vehicleCatalog.filter((c) => value.vehiclePrices[c.key]?.enabled);

  const commit = (v: FaresValue) => onChange(derive(v));

  // ── Accommodation ──
  const accomOptions = (currentName: string) =>
    accomTierNames
      .filter((a) => a.label === currentName || !accommodationRows.some((r) => r.name === a.label))
      .map((a) => ({ value: a.label, label: a.label }));
  const addAccommodation = () =>
    commit({ ...value, accommodationRows: [...accommodationRows, { id: rowId("acc"), name: "", capacity: "", baseFare: "" }] });
  const setAccomName = (id: string, name: string) => {
    const cap = accomTierNames.find((a) => a.label === name);
    commit({
      ...value,
      accommodationRows: accommodationRows.map((r) =>
        r.id === id ? { ...r, name, capacity: cap ? String(cap.capacity) : r.capacity, baseFare: r.baseFare || (cap && cap.fare > 0 ? String(cap.fare) : "") } : r,
      ),
    });
  };
  const setAccomField = (id: string, patch: Partial<AccommodationRow>) =>
    commit({ ...value, accommodationRows: accommodationRows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const removeAccom = (id: string) =>
    commit({ ...value, accommodationRows: accommodationRows.filter((r) => r.id !== id) });
  // Can add while there are still unused tiers and no blank row is waiting.
  const hasBlankAccom = accommodationRows.some((r) => !r.name);
  const canAddAccom = !hasBlankAccom && accommodationRows.filter((r) => r.name).length < accomTierNames.length;

  // ── Passenger types ──
  const passengerOptionsFor = (currentCls: string) =>
    PASSENGER_OPTIONS.filter((o) => o === currentCls || !passengerRows.some((r) => r.cls === o)).map((o) => ({ value: o, label: o }));
  const addPassenger = () => {
    const next = PASSENGER_OPTIONS.find((o) => !passengerRows.some((r) => r.cls === o));
    commit({ ...value, passengerRows: [...passengerRows, { id: rowId("pax"), cls: next ?? "", name: next ?? "", discountType: "Fixed", discountValue: "0" }] });
  };
  // Switching class renames the row too, unless the operator already typed a
  // custom label.
  const setPassengerClass = (id: string, cls: string) =>
    commit({
      ...value,
      passengerRows: passengerRows.map((r) => (r.id === id ? { ...r, cls, name: !r.name || r.name === r.cls ? cls : r.name } : r)),
    });
  const setPassenger = (id: string, patch: Partial<PassengerFareRow>) =>
    commit({ ...value, passengerRows: passengerRows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const removePassenger = (id: string) =>
    commit({ ...value, passengerRows: passengerRows.filter((r) => r.id !== id) });
  const canAddPassenger = passengerRows.length < PASSENGER_OPTIONS.length;

  // ── Vehicle types (keyed by vessel catalog) ──
  const vehicleOptions = (currentKey: string) =>
    vehicleCatalog.filter((c) => c.key === currentKey || !value.vehiclePrices[c.key]?.enabled).map((c) => ({ value: c.key, label: c.label }));
  const addVehicle = () => {
    const next = vehicleCatalog.find((c) => !value.vehiclePrices[c.key]?.enabled);
    if (!next) return;
    commit({
      ...value,
      vehiclePrices: {
        ...value.vehiclePrices,
        [next.key]: {
          enabled: true,
          price: value.vehiclePrices[next.key]?.price ?? (next.defaultPrice != null ? String(next.defaultPrice) : ""),
          includedCompanions: value.vehiclePrices[next.key]?.includedCompanions ?? next.includedCompanions ?? 1,
          // Qty limit starts empty → the operator must set a value > 0.
          qtyLimit: value.vehiclePrices[next.key]?.qtyLimit ?? "",
          description: value.vehiclePrices[next.key]?.description ?? next.descriptor,
        },
      },
    });
  };
  const setVehicle = (key: string, patch: Partial<VehicleFareRow>) =>
    commit({ ...value, vehiclePrices: { ...value.vehiclePrices, [key]: { ...value.vehiclePrices[key], ...patch } } });
  const swapVehicle = (fromKey: string, toKey: string) => {
    const prev = value.vehiclePrices[fromKey];
    const toCat = vehicleCatalog.find((c) => c.key === toKey);
    const next = { ...value.vehiclePrices };
    delete next[fromKey];
    next[toKey] = {
      enabled: true,
      price: value.vehiclePrices[toKey]?.price ?? prev?.price ?? (toCat?.defaultPrice != null ? String(toCat.defaultPrice) : ""),
      includedCompanions: value.vehiclePrices[toKey]?.includedCompanions ?? prev?.includedCompanions ?? toCat?.includedCompanions ?? 1,
      qtyLimit: value.vehiclePrices[toKey]?.qtyLimit ?? prev?.qtyLimit ?? "",
      description: value.vehiclePrices[toKey]?.description ?? toCat?.descriptor,
    };
    commit({ ...value, vehiclePrices: next });
  };
  const removeVehicle = (key: string) =>
    commit({ ...value, vehiclePrices: { ...value.vehiclePrices, [key]: { ...value.vehiclePrices[key], enabled: false } } });
  const canAddVehicle = vehicleRows.length < vehicleCatalog.length;

  // ── Add-ons (list-based, with unselected placeholder) ──
  const addOnOptionsFor = (currentName: string) =>
    ADDON_OPTIONS.filter((o) => o === currentName || !addOnRows.some((r) => r.name === o)).map((o) => ({ value: o, label: o }));
  const hasBlankAddOn = addOnRows.some((r) => !r.name);
  const addAddOn = () =>
    commit({ ...value, addOnRows: [...addOnRows, { id: rowId("addon"), name: "", price: "" }] });
  const setAddOn = (id: string, patch: Partial<AddOnRow>) =>
    commit({ ...value, addOnRows: addOnRows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const removeAddOn = (id: string) =>
    commit({ ...value, addOnRows: addOnRows.filter((r) => r.id !== id) });
  const canAddAddOn = !hasBlankAddOn && addOnRows.filter((r) => r.name).length < ADDON_OPTIONS.length;

  // ── Service fee (value on routes; type is UI-local) ──
  const serviceFee = routes.serviceFee ?? "";
  const setServiceFee = (v: string) => onRoutesChange({ ...routes, serviceFee: v.replace(/[^\d]/g, "") });

  const summary = [
    { label: "accommodation", plural: "accommodations", n: accommodationRows.filter((r) => r.name).length },
    { label: "passenger type", plural: "passenger types", n: passengerRows.length },
    { label: "add-on", plural: "add-ons", n: addOnRows.length },
    { label: "vehicle type", plural: "vehicle types", n: vehicleRows.length },
  ];
  // Pricing is ready once at least one accommodation fare is added. (Vehicle
  // qty > 0 is enforced per-row, separately from this banner.)
  const pricingReady = accommodationRows.some((r) => r.name);

  return (
    <div className="space-y-8">
      {/* ── Accommodation fares ── */}
      <Section eyebrow="Accommodation fares" helper="List seating tiers offered, each with its seat count and base fare." onAdd={addAccommodation} canAdd={canAddAccom}>
        {accommodationRows.length === 0 ? (
          <EmptyBox message='No accommodation fares. Click "Add Item" to get started.' />
        ) : (
          <Table columns={["NAME", "CAPACITY", "BASE FARE", ""]} grid="minmax(0,1fr)_120px_120px_36px">
            {accommodationRows.map((r) => (
              <Row key={r.id} grid="minmax(0,1fr)_120px_120px_36px">
                <Select value={r.name} onChange={(v) => setAccomName(r.id, v)} options={accomOptions(r.name)} placeholder="Select Accommodation Fare" ariaLabel="Accommodation fare" className="w-full" size="sm" />
                <NumberField value={r.capacity} onChange={(v) => setAccomField(r.id, { capacity: v })} ariaLabel="Capacity" />
                <NumberField value={r.baseFare} onChange={(v) => setAccomField(r.id, { baseFare: v })} ariaLabel="Base fare" />
                <TrashButton onClick={() => removeAccom(r.id)} ariaLabel="Remove accommodation" />
              </Row>
            ))}
          </Table>
        )}
      </Section>

      {/* ── Passenger types ── */}
      <Section eyebrow="Passenger types" helper="Define which fare categories this vessel offers and discounts." onAdd={addPassenger} canAdd={canAddPassenger}>
        <Table columns={["CLASS", "NAME", "DISCOUNT TYPE", "DISCOUNT VALUE", ""]} grid="150px_minmax(0,1fr)_180px_150px_36px">
          {passengerRows.map((r) => (
            <Row key={r.id} grid="150px_minmax(0,1fr)_180px_150px_36px">
              <Select value={r.cls} onChange={(v) => setPassengerClass(r.id, v)} options={passengerOptionsFor(r.cls)} ariaLabel="Passenger class" className="w-full" size="sm" disabled={r.locked} />
              <TextField value={r.name} onChange={(v) => setPassenger(r.id, { name: v })} ariaLabel="Passenger type name" />
              <Select value={r.discountType} onChange={(v) => setPassenger(r.id, { discountType: v as DiscountType })} options={[{ value: "Fixed", label: "Fixed" }, { value: "Percentage", label: "Percentage" }]} ariaLabel="Discount type" className="w-full" size="sm" />
              <NumberField value={r.discountValue} onChange={(v) => setPassenger(r.id, { discountValue: v })} ariaLabel="Discount value" />
              <TrashButton onClick={() => removePassenger(r.id)} ariaLabel="Remove passenger type" disabled={r.locked} />
            </Row>
          ))}
        </Table>
      </Section>

      {/* ── Vehicle types ── */}
      <Section eyebrow="Vehicle types" helper="Define vehicle types, their base fare, and free passenger allowance per unit." onAdd={addVehicle} canAdd={canAddVehicle}>
        {vehicleRows.length === 0 ? (
          <EmptyBox message='No vehicle types. Click "Add Item" to get started.' />
        ) : (
          <Table columns={["NAME", "DESCRIPTION", "BASE FARE", "QTY LIMIT *", ""]} grid="150px_minmax(0,1fr)_110px_110px_36px">
            {vehicleRows.map((c) => {
              const row = value.vehiclePrices[c.key];
              const qtyInvalid = !(Number(row?.qtyLimit) > 0);
              return (
                <div key={c.key} className="border-t border-slate-100 first:border-t-0">
                  <Row grid="150px_minmax(0,1fr)_110px_110px_36px" bare>
                    <Select value={c.key} onChange={(v) => swapVehicle(c.key, v)} options={vehicleOptions(c.key)} ariaLabel="Vehicle type" className="w-full" size="sm" />
                    <TextField value={row?.description ?? c.descriptor} onChange={(v) => setVehicle(c.key, { description: v })} ariaLabel="Description" />
                    <NumberField value={row?.price ?? ""} onChange={(v) => setVehicle(c.key, { price: v })} ariaLabel="Base fare" />
                    <NumberField value={row?.qtyLimit ?? ""} onChange={(v) => setVehicle(c.key, { qtyLimit: v })} ariaLabel="Qty limit" invalid={qtyInvalid} />
                    <TrashButton onClick={() => removeVehicle(c.key)} ariaLabel="Remove vehicle type" />
                  </Row>
                  {qtyInvalid && (
                    <div className="px-3.5 pb-1 text-center text-[11.5px] font-medium text-rose-600">
                      Please enter a quantity greater than 0 for this vehicle type, or remove the vehicle type.
                    </div>
                  )}
                  <div className="bg-slate-50/70 px-3.5 py-2.5">
                    <CompanionStepper value={row?.includedCompanions ?? 1} onChange={(n) => setVehicle(c.key, { includedCompanions: n })} />
                  </div>
                </div>
              );
            })}
          </Table>
        )}
      </Section>

      {/* ── Add-ons ── */}
      <Section eyebrow="Add-ons" helper="Optional extras offered." onAdd={addAddOn} canAdd={canAddAddOn}>
        {addOnRows.length === 0 ? (
          <EmptyBox message='No add-ons. Click "Add Item" to get started.' />
        ) : (
          <Table columns={["NAME", "PRICE", ""]} grid="minmax(0,1fr)_150px_36px">
            {addOnRows.map((a) => (
              <Row key={a.id} grid="minmax(0,1fr)_150px_36px">
                <Select value={a.name} onChange={(v) => setAddOn(a.id, { name: v })} options={addOnOptionsFor(a.name)} placeholder="Select Add-On" ariaLabel="Add-on" className="w-full" size="sm" />
                <NumberField value={a.price} onChange={(v) => setAddOn(a.id, { price: v })} ariaLabel="Price" />
                <TrashButton onClick={() => removeAddOn(a.id)} ariaLabel="Remove add-on" />
              </Row>
            ))}
          </Table>
        )}
      </Section>

      {/* ── Service fee ── */}
      <section>
        <SectionHeader eyebrow="Service fee" helper="A flat fee added on top of every fare." />
        <div className="grid grid-cols-[minmax(0,1fr)_180px_150px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3">
          <span className="text-[13px] font-semibold tracking-tight text-slate-900">Service fee</span>
          <Select value={serviceFeeType} onChange={(v) => setServiceFeeType(v as ServiceFeeType)} options={[{ value: "Fixed", label: "Fixed" }, { value: "Percentage", label: "Percentage" }]} ariaLabel="Service fee type" className="w-full" size="sm" />
          <div className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
            <span className="text-[12px] font-medium text-slate-400">{serviceFeeType === "Percentage" ? "%" : "₱"}</span>
            <input type="text" inputMode="numeric" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} placeholder="0" aria-label="Service fee" className="w-full bg-transparent text-right font-mono text-[13px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none" />
          </div>
        </div>
      </section>

      {/* ── Summary ── */}
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">Summary</div>
        <ul className="mt-3 space-y-2 text-[13px] text-slate-700">
          {summary.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-900 tabular-nums">{s.n}</span>
              <span>{s.n === 1 ? s.label : s.plural}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Validation banner ── */}
      {!pricingReady && (
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-rose-600">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16v.01" />
          </svg>
          <span className="text-[12.5px] tracking-tight text-slate-700">
            <span className="font-semibold text-slate-900">Add at least one &quot;accommodation&quot;</span>{" "}
            <span className="text-slate-500">to continue pricing setup.</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────── Section (header + Add Item) ───────────
function Section({ eyebrow, helper, onAdd, canAdd, children }: { eyebrow: string; helper: string; onAdd: () => void; canAdd: boolean; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{eyebrow}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{helper}</p>
        </div>
        <AddItemButton onClick={onAdd} disabled={!canAdd} />
      </div>
      {children}
    </section>
  );
}

function SectionHeader({ eyebrow, helper }: { eyebrow: string; helper: string }) {
  return (
    <div className="mb-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{eyebrow}</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{helper}</p>
    </div>
  );
}

function AddItemButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg>
      Add Item
    </button>
  );
}

function EmptyBox({ message }: { message: string }) {
  return <div className="grid min-h-[130px] place-items-center rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-[13px] text-slate-400">{message}</div>;
}

function Table({ columns, grid, children }: { columns: string[]; grid: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500" style={{ gridTemplateColumns: gridCols(grid) }}>
        {columns.map((c, i) => (<span key={i}>{c}</span>))}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ grid, bare, children }: { grid: string; bare?: boolean; children: React.ReactNode }) {
  return (
    <div className={"grid items-center gap-3 px-3.5 py-3 " + (bare ? "" : "border-t border-slate-100 first:border-t-0")} style={{ gridTemplateColumns: gridCols(grid) }}>
      {children}
    </div>
  );
}

function gridCols(spec: string): string {
  return spec.split("_").join(" ");
}

function NumberField({ value, onChange, disabled, ariaLabel, invalid }: { value: string; onChange: (v: string) => void; disabled?: boolean; ariaLabel: string; invalid?: boolean }) {
  return (
    <div className={"inline-flex h-9 w-full items-center rounded-lg border bg-white px-2.5 transition-[border-color,box-shadow,opacity] duration-150 " + (disabled ? "border-slate-200 bg-slate-50 opacity-70" : invalid ? "border-rose-300 focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100" : "border-slate-200 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100")}>
      <input type="text" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" disabled={disabled} aria-label={ariaLabel} className={"w-full bg-transparent text-right font-mono text-[13px] tabular-nums placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed " + (invalid ? "text-rose-600" : "text-slate-900")} />
    </div>
  );
}

function TextField({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <div className="inline-flex h-9 w-full items-center rounded-lg border border-slate-200 bg-white px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} className="w-full bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none" />
    </div>
  );
}

function StaticField({ value }: { value: string }) {
  return <div className="inline-flex h-9 w-full items-center rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700"><span className="truncate">{value}</span></div>;
}

function TrashButton({ onClick, ariaLabel, disabled }: { onClick: () => void; ariaLabel: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
    </button>
  );
}

function CompanionStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const MAX = 4;
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(MAX, value + 1));
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium tracking-tight text-slate-700">Includes driver + companion seats</div>
        <div className="mt-0.5 text-[11px] leading-tight text-slate-500">Driver always rides free. Pick how many extra companion seats are bundled into the vehicle fare.</div>
      </div>
      <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
        <button type="button" onClick={dec} disabled={value <= 0} aria-label="Decrease companions" className="grid h-7 w-7 place-items-center text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M5 12h14" /></svg></button>
        <span className="grid h-7 w-9 place-items-center border-x border-slate-200 font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">{value}</span>
        <button type="button" onClick={inc} disabled={value >= MAX} aria-label="Increase companions" className="grid h-7 w-7 place-items-center text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg></button>
      </div>
    </div>
  );
}
