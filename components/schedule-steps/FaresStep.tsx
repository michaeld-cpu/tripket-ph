"use client";

/**
 * Fares step — fourth stop of the Create-Schedule wizard.
 *
 * The fare catalog is **derived from the vessel** picked in step 3:
 *   - Passenger types come from `vessel.passengerTypes` (defined when the
 *     vessel was registered).
 *   - Vehicle classes come from `vessel.vehicleClasses`.
 *   - Add-ons come from `vessel.addOns`.
 *
 * This step only handles **per-schedule pricing** on top of that catalog —
 * what the operator pays today might differ from the vessel's defaults
 * (seasonal promos, etc.), so each enabled item gets a toggle and a price
 * input. Disabled rows still appear so operators can see *what's possible*.
 */

import type { VesselValue } from "@/components/schedule-steps/VesselStep";
import type { VehicleClass, PassengerType, AddOn } from "@/lib/dashboard-data";

export type FareRow = { enabled: boolean; price: string };
/** Vehicle-specific fare row. The vehicle fee always includes 1 driver
 *  seat at no extra charge; `includedCompanions` is how many *additional*
 *  comped seats ride free under the same fee (commonly 0-2). */
export type VehicleFareRow = FareRow & { includedCompanions: number };
export type FaresValue = {
  /** Headline Economy / base passenger fare. */
  baseFare: string;
  /** Keyed by PassengerType.key — the vessel-defined catalog. */
  passengerPrices: Record<string, FareRow>;
  /** Keyed by VehicleClass.key. */
  vehiclePrices: Record<string, VehicleFareRow>;
  /** Keyed by AddOn.key. */
  addOnPrices: Record<string, FareRow>;
};

export function initialFaresValue(): FaresValue {
  return {
    // Empty so it seeds from the chosen vessel's accommodation fare on hydrate.
    baseFare: "",
    passengerPrices: {},
    vehiclePrices: {},
    addOnPrices: {},
  };
}

/** Passenger keys that default to enabled in step 4 the first time they're
 *  seen — mandated PH discount tiers operators almost always include. Operators
 *  can still toggle them off after, but the default reflects real-world use. */
const PASSENGER_DEFAULT_ENABLED = new Set<string>(["senior", "pwd", "student"]);

/** Lazily ensure every catalog key has a FareRow entry. Pure — returns a new
 *  FaresValue if rows were added, or the same reference if nothing changed.
 *
 *  Defaults the row's `enabled` flag to reflect intent from prior steps:
 *   - Add-ons / vehicle classes the operator turned on during vessel creation
 *     start ON in step 4 (so toggling once propagates through).
 *   - Senior Citizen / PWD / Student passenger types start ON regardless. */
function hydrate(value: FaresValue, vessel: VesselValue): FaresValue {
  // Seamless handoff: default the base fare from the vessel's accommodation
  // tiers (set in Add Vessel → Capacity & fares). A vessel can offer several
  // tiers, so the headline base fare seeds from the cheapest enabled one. Only
  // seed when the operator hasn't entered a fare yet, so manual edits stick.
  const fares = (vessel.accommodations ?? [])
    .filter((a) => a.enabled && a.fare > 0)
    .map((a) => a.fare);
  const cheapestFare = fares.length ? Math.min(...fares) : undefined;
  const seededBase =
    (!value.baseFare || value.baseFare === "0") && cheapestFare
      ? String(cheapestFare)
      : value.baseFare;

  const next: FaresValue = {
    baseFare: seededBase,
    passengerPrices: { ...value.passengerPrices },
    vehiclePrices: { ...value.vehiclePrices },
    addOnPrices: { ...value.addOnPrices },
  };
  let touched = seededBase !== value.baseFare;
  vessel.passengerTypes.forEach((p) => {
    if (!next.passengerPrices[p.key]) {
      next.passengerPrices[p.key] = {
        enabled: PASSENGER_DEFAULT_ENABLED.has(p.key),
        price: "",
      };
      touched = true;
    }
  });
  vessel.vehicleClasses.forEach((c) => {
    if (!next.vehiclePrices[c.key]) {
      // Pre-fill the price from the vessel's registered base fare for this
      // class (set in Add Vessel → Classes & fares). Falls back to empty
      // when none was provided. Default to 1 included companion (the common
      // PH ferry convention: vehicle fee covers driver + 1 helper).
      next.vehiclePrices[c.key] = {
        enabled: c.enabled,
        price: c.defaultPrice != null ? String(c.defaultPrice) : "",
        // Pre-fill from the vessel's registered companion-seat default (set in
        // Add Vessel → vehicle classes). Falls back to 1 for legacy vessels.
        includedCompanions: c.includedCompanions ?? 1,
      };
      touched = true;
    }
  });
  vessel.addOns.forEach((a) => {
    if (!next.addOnPrices[a.key]) {
      next.addOnPrices[a.key] = { enabled: a.enabled, price: String(a.defaultPrice) };
      touched = true;
    }
  });
  return touched ? next : value;
}

export default function FaresStep({
  value,
  onChange,
  vessel,
}: {
  value: FaresValue;
  onChange: (next: FaresValue) => void;
  /** The vessel chosen in step 3 — defines what's priceable here. */
  vessel: VesselValue;
}) {
  const hydrated = hydrate(value, vessel);
  if (hydrated !== value) {
    // Hydrate during render is safe because setState short-circuits if shallow
    // equal — but to be tidy, just notify the parent of the new shape.
    queueMicrotask(() => onChange(hydrated));
  }

  // Resolve the picked vessel's catalogs (skip disabled vessel-level items so
  // the schedule can't price something the vessel doesn't offer).
  const passengers = vessel.passengerTypes;
  const vehicles = vessel.vehicleClasses.filter((c) => c.enabled);
  const addOns = vessel.addOns;

  const baseFare = Number(hydrated.baseFare) || 0;

  // Auto-derive discounted passenger prices from baseFare * (1 - discountPct/100)
  const computedPrice = (p: PassengerType): number => {
    if (p.isInfant) return 0;
    if (p.discountPct === 0) return baseFare;
    return Math.round(baseFare * (1 - p.discountPct / 100));
  };

  // ── Setters ──
  const setBase = (v: string) => onChange({ ...hydrated, baseFare: v.replace(/[^\d]/g, "") });
  const setPassenger = (key: string, patch: Partial<FareRow>) =>
    onChange({
      ...hydrated,
      passengerPrices: { ...hydrated.passengerPrices, [key]: { ...hydrated.passengerPrices[key], ...patch } },
    });
  const setVehicle = (key: string, patch: Partial<VehicleFareRow>) =>
    onChange({
      ...hydrated,
      vehiclePrices: { ...hydrated.vehiclePrices, [key]: { ...hydrated.vehiclePrices[key], ...patch } },
    });
  const setAddOn = (key: string, patch: Partial<FareRow>) =>
    onChange({
      ...hydrated,
      addOnPrices: { ...hydrated.addOnPrices, [key]: { ...hydrated.addOnPrices[key], ...patch } },
    });

  const enabledPassengerCount = passengers.filter((p) => hydrated.passengerPrices[p.key]?.enabled).length;
  const enabledAddOnCount = addOns.filter((a) => hydrated.addOnPrices[a.key]?.enabled).length;

  const vesselHasVehicles =
    (vessel.type !== "Fast Craft" && vessel.type !== "Passenger Ship") && vehicles.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Vessel-context banner ── */}
      <VesselContext vessel={vessel} />

      {/* ── Base fare — single flat row, no gradients or eyebrows ── */}
      <Section
        eyebrow="Base fare"
        helper="Economy / standard fare. Discounted tiers derive from this."
      >
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
          <span className="flex-1 text-[13px] font-semibold tracking-tight text-slate-900">
            Economy
          </span>
          <div className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
            <span className="text-[12px] font-medium text-slate-400">₱</span>
            <input
              type="text"
              inputMode="numeric"
              value={hydrated.baseFare}
              onChange={(e) => setBase(e.target.value)}
              placeholder="0"
              aria-label="Economy base fare"
              className="w-20 bg-transparent text-right font-mono text-[13px] font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </label>
      </Section>

      {/* ── Passenger fares ── */}
      <Section
        eyebrow="Passenger fares"
        helper={`From the vessel catalog (${passengers.length} ${passengers.length === 1 ? "type" : "types"}). Toggle to include in this schedule.`}
      >
        {passengers.length === 0 ? (
          <EmptyCatalog message="This vessel has no passenger types yet. Add some in step 3 → Classes & fares." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {passengers.map((p, i) => {
              const row = hydrated.passengerPrices[p.key];
              if (!row) return null;
              const auto = !p.isInfant && p.discountPct > 0;
              const displayPrice = row.price || (auto ? String(computedPrice(p)) : "");
              return (
                <FareRowItem
                  key={p.key}
                  first={i === 0}
                  enabled={row.enabled}
                  onToggle={(v) => setPassenger(p.key, { enabled: v })}
                  label={p.label}
                  sublabel={
                    p.isInfant
                      ? p.requiredDoc
                      : p.discountPct > 0
                        ? `${p.discountPct}% off base · ${p.requiredDoc}`
                        : p.requiredDoc
                  }
                  priceInput={
                    p.isInfant ? (
                      <span className={"text-[12.5px] font-semibold tracking-tight " + (row.enabled ? "text-emerald-600" : "text-slate-300")}>
                        Free
                      </span>
                    ) : (
                      <PriceField
                        value={displayPrice}
                        placeholder={auto ? `${computedPrice(p)}` : "0"}
                        disabled={!row.enabled}
                        onChange={(v) => setPassenger(p.key, { price: v })}
                        ariaLabel={`${p.label} price`}
                        autoHint={auto && !row.price && row.enabled}
                      />
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Vehicle fares ── */}
      {vesselHasVehicles && (
        <Section
          eyebrow="Vehicle fares"
          helper={`From the vessel catalog (${vehicles.length} ${vehicles.length === 1 ? "class" : "classes"} enabled).`}
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {vehicles.map((c, i) => {
              const row = hydrated.vehiclePrices[c.key];
              if (!row) return null;
              return (
                <FareRowItem
                  key={c.key}
                  first={i === 0}
                  enabled={row.enabled}
                  onToggle={(v) => setVehicle(c.key, { enabled: v })}
                  label={c.label}
                  sublabel={c.descriptor}
                  priceInput={
                    <PriceField
                      value={row.price}
                      placeholder="0"
                      disabled={!row.enabled}
                      onChange={(v) => setVehicle(c.key, { price: v })}
                      ariaLabel={`${c.label} price`}
                    />
                  }
                  extraRow={
                    <CompanionStepper
                      value={row.includedCompanions}
                      onChange={(n) => setVehicle(c.key, { includedCompanions: n })}
                    />
                  }
                />
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Add-ons ── */}
      <Section
        eyebrow="Add-ons"
        helper={`From the vessel catalog (${addOns.length} available). Defaults inherit from the vessel — override per-schedule if needed.`}
      >
        {addOns.length === 0 ? (
          <EmptyCatalog message="This vessel has no add-ons yet. Add some in step 3 → Classes & fares." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {addOns.map((a, i) => {
              const row = hydrated.addOnPrices[a.key];
              if (!row) return null;
              return (
                <FareRowItem
                  key={a.key}
                  first={i === 0}
                  enabled={row.enabled}
                  onToggle={(v) => setAddOn(a.key, { enabled: v })}
                  label={a.label}
                  sublabel={a.descriptor}
                  priceInput={
                    <PriceField
                      value={row.price || String(a.defaultPrice)}
                      placeholder={String(a.defaultPrice)}
                      disabled={!row.enabled}
                      onChange={(v) => setAddOn(a.key, { price: v })}
                      ariaLabel={`${a.label} price`}
                    />
                  }
                />
              );
            })}
          </div>
        )}
      </Section>

      <SummaryStrip
        baseFare={baseFare}
        enabledPassengers={enabledPassengerCount}
        enabledAddOns={enabledAddOnCount}
      />
    </div>
  );
}

// ─────────── Vessel context banner ───────────
function VesselContext({ vessel }: { vessel: VesselValue }) {
  const name =
    vessel.mode === "fleet"
      ? `Fleet vessel · ${vessel.fleetVesselId || "not selected"}`
      : vessel.name.trim() || "Unnamed vessel";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-400">
        <path d="M3 17h18l-2 3H5l-2-3Z" />
        <rect x="5" y="11" width="14" height="6" rx="1" />
        <path d="M8 11V7h8v4" />
      </svg>
      <span className="text-[12px] tracking-tight text-slate-600">
        Pricing the catalog from{" "}
        <span className="font-semibold text-slate-900">{name}</span>
        <span className="text-slate-400"> · {vessel.type}</span>
      </span>
    </div>
  );
}

// ─────────── Section header ───────────
function Section({ eyebrow, helper, children }: { eyebrow: string; helper: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{eyebrow}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{helper}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyCatalog({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-[12px] text-slate-500">
      {message}
    </div>
  );
}

// ─────────── Row, toggle, price field ───────────
function FareRowItem({
  first, enabled, onToggle, label, sublabel, priceInput, extraRow,
}: {
  first: boolean;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  label: string;
  sublabel?: string;
  priceInput: React.ReactNode;
  /** Optional secondary row rendered under the main line (e.g. vehicle
   *  companion stepper). Indents to align under the label column. */
  extraRow?: React.ReactNode;
}) {
  return (
    <div
      className={
        "transition-colors duration-150 " +
        (first ? "" : "border-t border-slate-100 ") +
        (enabled ? "bg-brand-50/40" : "bg-white")
      }
    >
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <Toggle on={enabled} onChange={onToggle} ariaLabel={`Toggle ${label}`} />
        <div className="flex-1 min-w-0">
          <div className={"text-[13px] font-semibold tracking-tight " + (enabled ? "text-slate-900" : "text-slate-700")}>
            {label}
          </div>
          {sublabel && <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{sublabel}</div>}
        </div>
        <div className="shrink-0">{priceInput}</div>
      </div>
      {extraRow && enabled && (
        <div className="border-t border-dashed border-slate-200/80 px-3.5 py-2 pl-[3.25rem]">
          {extraRow}
        </div>
      )}
    </div>
  );
}

// Stepper for "free companion seats" bundled into a vehicle fare. Driver is
// always implicitly included (1 free seat), so this only counts the
// *additional* helpers — typical PH defaults are 0-2.
function CompanionStepper({
  value, onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const MAX = 4;
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(MAX, value + 1));
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium tracking-tight text-slate-700">Includes driver + companion seats</div>
        <div className="mt-0.5 text-[11px] leading-tight text-slate-500">
          Driver always rides free. Pick how many extra companion seats are bundled into the vehicle fare.
        </div>
      </div>
      <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
        <button
          type="button"
          onClick={dec}
          disabled={value <= 0}
          aria-label="Decrease companions"
          className="grid h-7 w-7 place-items-center text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M5 12h14"/></svg>
        </button>
        <span className="grid h-7 w-9 place-items-center border-x border-slate-200 font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= MAX}
          aria-label="Increase companions"
          className="grid h-7 w-7 place-items-center text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, ariaLabel }: { on: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      className={
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 " +
        (on ? "bg-brand-500" : "bg-slate-300")
      }
    >
      <span
        aria-hidden
        className={
          "block h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-transform duration-150 " +
          (on ? "translate-x-4" : "translate-x-0")
        }
      />
    </button>
  );
}

function PriceField({
  value, onChange, placeholder, disabled, ariaLabel, autoHint,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  ariaLabel: string;
  autoHint?: boolean;
}) {
  return (
    <div
      className={
        "inline-flex h-9 items-center gap-1 rounded-lg border bg-white px-2.5 transition-[border-color,box-shadow,opacity] duration-150 " +
        (disabled
          ? "border-slate-200 bg-slate-50 opacity-60"
          : "border-slate-200 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100")
      }
    >
      <span className="text-[12px] font-medium text-slate-400">₱</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-20 bg-transparent text-right font-mono text-[13px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
      />
      {autoHint && (
        <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
          Auto
        </span>
      )}
    </div>
  );
}

// ─────────── Footer summary ───────────
function SummaryStrip({
  baseFare,
  enabledPassengers,
  enabledAddOns,
}: {
  baseFare: number;
  enabledPassengers: number;
  enabledAddOns: number;
}) {
  if (enabledPassengers === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-rose-600">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16v.01" />
        </svg>
        <span className="text-[12.5px] tracking-tight text-slate-700">
          <span className="font-semibold text-slate-900">Enable at least one passenger type.</span>{" "}
          <span className="text-slate-500">Required to continue.</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-emerald-600">
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span className="flex-1 text-[12.5px] tracking-tight text-slate-700">
        <span className="font-semibold text-slate-900">
          {enabledPassengers} passenger {enabledPassengers === 1 ? "type" : "types"}
          {enabledAddOns > 0 && <> · {enabledAddOns} add-{enabledAddOns === 1 ? "on" : "ons"}</>}
        </span>
        {baseFare > 0 && (
          <>
            <span className="text-slate-300"> · </span>
            <span className="text-slate-500">Base </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">₱{baseFare.toLocaleString()}</span>
          </>
        )}
      </span>
    </div>
  );
}
