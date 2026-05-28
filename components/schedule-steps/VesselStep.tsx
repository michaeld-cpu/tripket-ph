"use client";
import { useMemo, useRef, useState } from "react";
import { Step2 as VesselClassesAndFaresStep, Step3Review as VesselReviewStep } from "@/components/AddVesselModal";
import { passengerOnlyTypes } from "@/components/VesselFormBody";
import { useShippingLine } from "@/components/ShippingLineContext";
import LinePicker from "@/components/LinePicker";
import type { VehicleClass, PassengerType, AddOn } from "@/lib/dashboard-data";
import AddOnsSection from "@/components/vessel-extras/AddOnsSection";

/**
 * Vessel step — third stop of the Create-Schedule wizard.
 *
 * Answers: *Which ferry is sailing this schedule?*
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Pick the ferry · eyebrow                                     │
 *   │ "Assign a vessel from your fleet, or register a new one."    │
 *   │                                                               │
 *   │ ── Mode toggle: [ From fleet ]  [ Register new ] ─────────── │
 *   │                                                               │
 *   │  ┌── From-fleet picker ──┐    ┌── Register-new form ──┐       │
 *   │  │ scrollable list cards │ OR │ name · type · IMO     │       │
 *   │  └───────────────────────┘    │ capacity · slots       │       │
 *   │                                └───────────────────────┘       │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Improvements over the legacy "Add ferry" dialog:
 *  - Mode toggle so operators can either reuse an existing vessel or define a
 *    new one inline without leaving the wizard.
 *  - Vessel-type as a chip group, not a native select — keeps the visual rhythm
 *    consistent with ScheduleStep's recurrence cards.
 *  - Capacity inputs annotated with a "MARINA-certified" hint exactly like the
 *    legacy screenshot, but with the suffix tucked into the field-group helper
 *    so it never wraps.
 */

// Aligned with the standalone vessels-page schema (lib/dashboard-data.ts → Vessel.type)
// so the wizard's "Register new" flow and the page's "Add ferry" dialog share types.
export type VesselType = "RoRo" | "Fast Craft" | "Passenger Ship";
export type VesselStatus = "Active" | "Inactive" | "Maintenance" | "Retired";

export type VesselValue = {
  mode: "fleet" | "new";
  /** ID of the picked fleet vessel (only meaningful when mode === "fleet"). */
  fleetVesselId: string;
  /** Inline-registration fields — mirror AddVesselModal's full 3-step state. */
  name: string;
  type: VesselType;
  imoNumber: string;
  passengerCapacity: string;
  vehicleSlots: string;
  status: VesselStatus;
  /** Owning shipping line ID. Defaults to the active line at creation time. */
  lineId: string;
  /** Per-vessel catalog defined in AddVesselModal's step 2. */
  vehicleClasses: VehicleClass[];
  passengerTypes: PassengerType[];
  /** Optional add-ons offered by this vessel (extras passengers can buy). */
  addOns: AddOn[];
  /** Which sub-step inside "Register new" is active. Lifted so the outer
   *  wizard footer can drive sub-step navigation with a single Back/Continue. */
  newSubStep: 1 | 2 | 3;
};

export type FleetVessel = {
  id: string;
  name: string;
  type: VesselType;
  passengerCapacity: number;
  vehicleSlots: number;
};

// Mock fleet — in real life this would be hydrated from the same source that
// feeds the vessels page. Kept here as a self-contained constant so the step
// renders without props plumbing.
export const MOCK_FLEET: FleetVessel[] = [
  { id: "v1",  name: "MV Maayo 18",         type: "RoRo",            passengerCapacity: 420, vehicleSlots: 80 },
  { id: "v2",  name: "MV Visayan Star",     type: "RoRo",            passengerCapacity: 280, vehicleSlots: 24 },
  { id: "v3",  name: "FC Sinulog",          type: "Fast Craft",      passengerCapacity: 180, vehicleSlots: 0  },
  { id: "v4",  name: "MV Liberty",          type: "Passenger Ship",  passengerCapacity: 320, vehicleSlots: 0  },
  { id: "v5",  name: "MV Cebu Pacific",     type: "RoRo",            passengerCapacity: 500, vehicleSlots: 95 },
  { id: "v6",  name: "FC Sugbu Express",    type: "Fast Craft",      passengerCapacity: 220, vehicleSlots: 0  },
  { id: "v7",  name: "MV Tagbilaran Pearl", type: "RoRo",            passengerCapacity: 310, vehicleSlots: 28 },
  { id: "v8",  name: "MV Negros Star",      type: "RoRo",            passengerCapacity: 460, vehicleSlots: 88 },
  { id: "v9",  name: "MV Bohol Trader",     type: "RoRo",            passengerCapacity: 380, vehicleSlots: 72 },
  { id: "v10", name: "FC Visayan Jet",      type: "Fast Craft",      passengerCapacity: 200, vehicleSlots: 0  },
  { id: "v11", name: "MV Iloilo Queen",     type: "Passenger Ship",  passengerCapacity: 280, vehicleSlots: 0  },
  { id: "v12", name: "MV Mindanao Sun",     type: "RoRo",            passengerCapacity: 540, vehicleSlots: 110 },
  { id: "v13", name: "MV Palawan Breeze",   type: "RoRo",            passengerCapacity: 260, vehicleSlots: 22 },
  { id: "v14", name: "MV Siquijor Mystic",  type: "RoRo",            passengerCapacity: 340, vehicleSlots: 60 },
  { id: "v15", name: "FC Camotes Flyer",    type: "Fast Craft",      passengerCapacity: 160, vehicleSlots: 0  },
];

export const PASSENGER_ONLY_VESSEL_TYPES: VesselType[] = ["Fast Craft", "Passenger Ship"];
export function vesselHasVehicleDeck(t: VesselType): boolean {
  return !PASSENGER_ONLY_VESSEL_TYPES.includes(t);
}

// Sub-steps inside the wizard's "Register new" mode mirror AddVesselModal's
// three steps so creating a vessel mid-schedule is identical to creating one
// from the standalone Vessels page.
const NEW_SUB_STEPS = [
  { id: 1 as const, label: "Identity",     caption: "Basic details & capacity" },
  { id: 2 as const, label: "Classes & fares", caption: "Vehicle classes & passenger types" },
  { id: 3 as const, label: "Review",       caption: "Confirm vessel registration" },
];

export default function VesselStep({
  value,
  onChange,
}: {
  value: VesselValue;
  onChange: (next: VesselValue) => void;
}) {
  const fleet = MOCK_FLEET;
  const picked = useMemo(() => fleet.find((v) => v.id === value.fleetVesselId) ?? null, [fleet, value.fleetVesselId]);

  // Sub-step is driven by the outer wizard's footer (single Back/Continue pair),
  // so we read/write it from `value` rather than holding local state. Fall back
  // to 1 if the persisted shape is older and lacks the field.
  const newSubStep: 1 | 2 | 3 = value.newSubStep ?? 1;
  const setNewSubStep = (s: 1 | 2 | 3) => onChange({ ...value, newSubStep: s });
  const isPassengerOnly = passengerOnlyTypes.includes(value.type);

  // Convenience setters for AddVesselModal's sub-component callbacks.
  const setVehicleClasses = (v: VehicleClass[]) => onChange({ ...value, vehicleClasses: v });
  const setPassengerTypes = (v: PassengerType[]) => onChange({ ...value, passengerTypes: v });

  return (
    <div className="space-y-5">
      {/* Mode toggle — segmented control matching the rhythm of the wizard. */}
      <ModeToggle
        mode={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        fleetCount={fleet.length}
      />

      {value.mode === "fleet" ? (
        <FleetPicker
          fleet={fleet}
          selectedId={value.fleetVesselId}
          onSelect={(id) => onChange({ ...value, fleetVesselId: id })}
        />
      ) : (
        // ── Embedded vessel-creation wizard ──
        // Sub-steps + content + sub-footer all sit inside the outer wizard's
        // step 3 body. Identical UX to AddVesselModal, so an operator who's
        // used the Vessels page recognises it immediately.
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white">
          {/* Sub-stepper — quietly distinct from the outer stepper (smaller, no border). */}
          <div className="flex items-center gap-2 px-4 pt-3.5">
            {NEW_SUB_STEPS.map((s, i) => {
              const done = newSubStep > s.id;
              const active = newSubStep === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    // Only let users jump back to completed sub-steps, not forward.
                    if (s.id <= newSubStep) setNewSubStep(s.id);
                  }}
                  className="group flex flex-1 items-center gap-2 text-left"
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-colors " +
                      (done
                        ? "bg-brand-500 text-white"
                        : active
                          ? "bg-white text-brand-700 ring-2 ring-brand-500"
                          : "bg-white text-slate-400 ring-1 ring-slate-200")
                    }
                  >
                    {done ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    ) : (
                      s.id
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={"truncate text-[11.5px] font-semibold tracking-tight " + (active ? "text-slate-900" : done ? "text-slate-600" : "text-slate-400")}>
                      {s.label}
                    </div>
                    <div className="truncate text-[10px] leading-tight text-slate-400">{s.caption}</div>
                  </div>
                  {i < NEW_SUB_STEPS.length - 1 && (
                    <span aria-hidden className="hidden h-px w-3 bg-slate-200 sm:block" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100" />

          {/* Sub-step body */}
          {newSubStep === 1 && (
            <IdentitySubStep value={value} onChange={onChange} isPassengerOnly={isPassengerOnly} />
          )}

          {newSubStep === 2 && (
            <div className="-mt-1 max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              <VesselClassesAndFaresStep
                isPassengerOnly={isPassengerOnly}
                vehicleClasses={value.vehicleClasses}
                setVehicleClasses={setVehicleClasses}
                passengerTypes={value.passengerTypes}
                setPassengerTypes={setPassengerTypes}
              />
              <AddOnsSection
                addOns={value.addOns}
                setAddOns={(next) => onChange({ ...value, addOns: next })}
              />
            </div>
          )}

          {newSubStep === 3 && (
            <div className="-mt-1 max-h-[60vh] overflow-y-auto">
              <VesselReviewStep
                values={{
                  name: value.name,
                  type: value.type,
                  imo: value.imoNumber,
                  passengers: value.passengerCapacity,
                  vehicleSlots: value.vehicleSlots,
                  status: value.status,
                }}
                isPassengerOnly={isPassengerOnly}
                vehicleClasses={value.vehicleClasses}
                passengerTypes={value.passengerTypes}
                addOns={value.addOns}
                onEditStep={(s) => setNewSubStep(s)}
              />
            </div>
          )}

        </div>
      )}

      {/* Footer summary — only appears once a choice is locked in, mirrors the
          "Origin → Destination" preview pill on the Routes step. */}
      {value.mode === "fleet" && picked ? (
        <VesselSummaryPill vessel={picked} />
      ) : value.mode === "new" && value.name.trim() ? (
        <VesselSummaryPill
          vessel={{
            id: "draft",
            name: value.name.trim(),
            type: value.type,
            passengerCapacity: Number(value.passengerCapacity) || 0,
            vehicleSlots: Number(value.vehicleSlots) || 0,
          }}
          draft
        />
      ) : null}
    </div>
  );
}

// ─────────── IdentitySubStep — sub-step 1 of the embedded vessel wizard ───────────
// Same fields and validation hints as VesselFormBody (the standalone "Add ferry"
// dialog), but renders vessel type as a three-card chip group instead of a
// native Select — preferred for this surface because the cards expose both
// the label and the descriptor at-a-glance.
const TYPE_CARDS: { key: VesselType; label: string; sublabel: string }[] = [
  { key: "RoRo",           label: "RoRo",           sublabel: "Roll-on / Roll-off" },
  { key: "Fast Craft",     label: "Fast Craft",     sublabel: "Passenger-only speedboat" },
  { key: "Passenger Ship", label: "Passenger Ship", sublabel: "Passenger-only ferry" },
];

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tracking-tight text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";
const inputWrapCls =
  "flex items-center rounded-lg border border-slate-200 bg-white transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100";

const statusChips: { key: VesselStatus; label: string }[] = [
  { key: "Active",      label: "Active" },
  { key: "Inactive",    label: "Inactive" },
  { key: "Maintenance", label: "Maintenance" },
  { key: "Retired",     label: "Retired" },
];

function IdentitySubStep({
  value, onChange, isPassengerOnly,
}: {
  value: VesselValue;
  onChange: (next: VesselValue) => void;
  isPassengerOnly: boolean;
}) {
  const { locked: lineLocked } = useShippingLine();

  return (
    <div className="space-y-5 px-5 py-5">
      {/* Shipping line — sets the org context. Same dropdown as VesselFormBody. */}
      <Field label="Shipping line" required hint={lineLocked ? "Locked to your assigned line." : "Owning line for this vessel."}>
        <LinePicker value={value.lineId} onChange={(id) => onChange({ ...value, lineId: id })} />
      </Field>

      {/* Vessel name */}
      <Field label="Vessel name" required>
        <input
          type="text"
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. MV Palawan Breeze"
          className={inputCls}
        />
      </Field>

      {/* Vessel type — three-card chip group */}
      <Field label="Vessel type" required>
        <div role="radiogroup" aria-label="Vessel type" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TYPE_CARDS.map((t) => {
            const on = value.type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ ...value, type: t.key })}
                className={
                  "rounded-lg border bg-white px-3 py-2.5 text-left transition-all duration-150 " +
                  (on
                    ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/15"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40")
                }
              >
                <div className={"text-[13px] font-semibold tracking-tight " + (on ? "text-brand-700" : "text-slate-900")}>
                  {t.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{t.sublabel}</div>
              </button>
            );
          })}
        </div>
      </Field>

      {/* IMO number */}
      <Field label="IMO number" required hint="7-digit number from the International Maritime Organization">
        <input
          type="text"
          required
          inputMode="numeric"
          maxLength={7}
          value={value.imoNumber}
          onChange={(e) => onChange({ ...value, imoNumber: e.target.value.replace(/\D/g, "") })}
          placeholder="e.g. 9756101"
          className={`${inputCls} font-mono`}
        />
      </Field>

      <div className="h-px bg-slate-100/70" />

      {/* Passenger capacity + Vehicle slots */}
      <div className={`grid gap-4 ${isPassengerOnly ? "grid-cols-1" : "grid-cols-2"}`}>
        <Field label="Passenger capacity" required hint="MARINA-certified maximum">
          <div className={inputWrapCls}>
            <input
              type="number"
              required
              min={1}
              value={value.passengerCapacity}
              onChange={(e) => onChange({ ...value, passengerCapacity: e.target.value })}
              placeholder="e.g. 420"
              className="w-full bg-transparent px-3 py-2 text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="pr-3 text-xs text-slate-400">pax</span>
          </div>
        </Field>

        {!isPassengerOnly && (
          <Field label="Vehicle slots" required hint="Total vehicle capacity">
            <div className={inputWrapCls}>
              <input
                type="number"
                required
                min={0}
                value={value.vehicleSlots}
                onChange={(e) => onChange({ ...value, vehicleSlots: e.target.value })}
                placeholder="e.g. 80"
                className="w-full bg-transparent px-3 py-2 text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <span className="pr-3 text-xs text-slate-400">slots</span>
            </div>
          </Field>
        )}
      </div>

      <div className="h-px bg-slate-100/70" />

      {/* Status chips */}
      <Field label="Status">
        <div className="flex flex-wrap gap-1">
          {statusChips.map((s) => {
            const on = value.status === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onChange({ ...value, status: s.key })}
                className={
                  "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] " +
                  (on ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700")
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

function Field({
  label, required, hint, children,
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

// ─────────── ModeToggle — segmented "fleet | new" control ───────────
function ModeToggle({
  mode,
  onChange,
  fleetCount,
}: {
  mode: VesselValue["mode"];
  onChange: (m: VesselValue["mode"]) => void;
  fleetCount: number;
}) {
  // One unified container that reads as tabs, not two side-by-side cards.
  // The selected tab gets a brand-orange underline + dark label; the other
  // sits quiet. No inner card/shadow on the active item so it doesn't look
  // like a card-in-card.
  return (
    <div role="tablist" aria-label="Vessel source" className="flex items-center border-b border-slate-200">
      {[
        { key: "fleet" as const, label: "From fleet",   caption: `${fleetCount} ready` },
        { key: "new" as const,   label: "Register new", caption: "Add to fleet" },
      ].map((opt) => {
        const on = mode === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(opt.key)}
            className={
              "relative flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-[13px] font-medium tracking-tight transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300 " +
              (on ? "text-brand-600" : "text-slate-500 hover:text-slate-800")
            }
          >
            <span>{opt.label}</span>
            <span
              className={
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider tabular-nums " +
                (on ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500")
              }
            >
              {opt.caption}
            </span>
            {on && <span aria-hidden className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-brand-500" />}
          </button>
        );
      })}
    </div>
  );
}

// ─────────── FleetPicker — scrollable list of vessel cards ───────────
function FleetPicker({
  fleet,
  selectedId,
  onSelect,
}: {
  fleet: FleetVessel[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fleet;
    return fleet.filter((v) => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q));
  }, [fleet, query]);

  return (
    <div className="space-y-2.5">
      {/* Search input — same chrome as the routes table search. */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-brand-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vessel name or type"
          className="w-full bg-transparent text-[13px] placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <div
        className="grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200/70 bg-slate-50/30 p-2 sm:grid-cols-2"
        style={{ scrollbarGutter: "stable" }}
      >
        {filtered.length === 0 ? (
          <div className="col-span-full grid place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 py-8 text-center text-[12.5px] text-slate-400">
            No vessels match your search.
          </div>
        ) : (
          filtered.map((v) => {
            const on = v.id === selectedId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                aria-pressed={on}
                className={
                  "group flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition-all duration-150 " +
                  (on
                    ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/15"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50")
                }
              >
                <div
                  className={
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg " +
                    (on ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")
                  }
                >
                  <FerryGlyph type={v.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[13.5px] font-semibold tracking-tight text-slate-900">{v.name}</div>
                  {/* Single-line meta — short type label + capacity stats. The
                      previous chip wrapper around the full type label forced
                      line breaks when the card was narrow; this version stays
                      one line and truncates gracefully. */}
                  <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">{vesselTypeShort(v.type)}</span>
                    <span className="text-slate-300">·</span>
                    <span className="tabular-nums">{v.passengerCapacity} pax</span>
                    {v.vehicleSlots > 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="tabular-nums">{v.vehicleSlots} slots</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  aria-hidden
                  className={
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors " +
                    (on
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-slate-300 bg-white text-transparent group-hover:border-slate-400")
                  }
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}


// ─────────── Summary note at the bottom of the step ───────────
function VesselSummaryPill({ vessel, draft = false }: { vessel: FleetVessel; draft?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-emerald-600">
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span className="flex-1 min-w-0 text-[12.5px] tracking-tight text-slate-700">
        <span className="font-semibold text-slate-900">{vessel.name}</span>
        <span className="text-slate-500">
          {" · "}{vesselTypeLabel(vessel.type)}
          {vessel.passengerCapacity > 0 && <> · <span className="font-mono tabular-nums">{vessel.passengerCapacity}</span> pax</>}
          {vessel.vehicleSlots > 0 && <> · <span className="font-mono tabular-nums">{vessel.vehicleSlots}</span> slots</>}
        </span>
      </span>
      {draft && (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Draft
        </span>
      )}
    </div>
  );
}

function vesselTypeLabel(t: VesselType): string {
  // Mirrors VesselFormBody's typeOptions verbatim.
  if (t === "RoRo") return "RoRo (Roll-on / Roll-off)";
  if (t === "Fast Craft") return "Fast Craft (Passenger only)";
  if (t === "Passenger Ship") return "Passenger Ship (Passenger only)";
  return t;
}

/** Short label used inside compact lists (fleet picker, summary chip) where
 *  the parenthesised descriptor would force awkward line breaks. */
function vesselTypeShort(t: VesselType): string {
  return t; // "RoRo" | "Fast Craft" | "Passenger Ship" — already short.
}

// Tiny ferry silhouette — same vibe across the summary pill and fleet cards.
function FerryGlyph({ type }: { type: VesselType }) {
  // Fast Craft gets a pointier prow; everything else uses the boxy RoRo silhouette.
  if (type === "Fast Craft") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M3 16h18l-2 3H5l-2-3Z" />
        <path d="M5 16V11l4-4h6l2 4v5" />
        <path d="M9 11h8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 17h18l-2 3H5l-2-3Z" />
      <rect x="5" y="11" width="14" height="6" rx="1" />
      <path d="M8 11V7h8v4" />
      <path d="M12 7V4" />
    </svg>
  );
}
