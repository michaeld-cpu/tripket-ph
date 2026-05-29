"use client";
import { useEffect, useState } from "react";
import { useShippingLine } from "@/components/ShippingLineContext";
import { loadCatalog, type LineCatalog } from "@/lib/settings-data";
import type { VehicleClass, PassengerType, AddOn } from "@/lib/dashboard-data";

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
  vehicleClasses: VehicleClass[];
  setVehicleClasses: (next: VehicleClass[]) => void;
  passengerTypes: PassengerType[];
  setPassengerTypes: (next: PassengerType[]) => void;
  addOns: AddOn[];
  setAddOns: (next: AddOn[]) => void;
};

export default function VesselCatalogStep(props: Props) {
  const { isPassengerOnly } = props;
  const { active } = useShippingLine();

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
  const addOnOn = (key: string) => props.addOns.find((a) => a.key === key)?.enabled ?? false;
  const paxOn = (key: string) => {
    const row = props.passengerTypes.find((p) => p.key === key) as PassengerType | undefined;
    if (!row) return true;
    return !(row as unknown as { _excluded?: boolean })._excluded;
  };

  const writeClass = (c: VehicleClass, on: boolean) => {
    const others = props.vehicleClasses.filter((x) => x.key !== c.key);
    props.setVehicleClasses([...others, { ...c, enabled: on }]);
  };
  const writeAddOn = (a: AddOn, on: boolean) => {
    const others = props.addOns.filter((x) => x.key !== a.key);
    props.setAddOns([...others, { ...a, enabled: on }]);
  };
  const writePax = (p: PassengerType, on: boolean) => {
    const others = props.passengerTypes.filter((x) => x.key !== p.key);
    const row = { ...p } as PassengerType & { _excluded?: boolean };
    if (on) delete (row as { _excluded?: boolean })._excluded;
    else (row as { _excluded?: boolean })._excluded = true;
    props.setPassengerTypes([...others, row]);
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
      {!isPassengerOnly && (
        <section>
          <SectionHeader title="Vehicle classes" hint="Toggle which classes this vessel can carry. Prices and limits are set in Settings → Configurations." count={`${enabledClasses} of ${catalog.vehicleClasses.length}`} />
          {catalog.vehicleClasses.length === 0 ? emptyHint : (
            <div className="divide-y divide-slate-100 border-y border-slate-100">
              {catalog.vehicleClasses.map((c) => {
                const on = classOn(c.key);
                return (
                  <ToggleRow
                    key={c.key}
                    on={on}
                    onToggle={() => writeClass(c, !on)}
                    label={c.label}
                    descriptor={c.descriptor}
                    right={
                      <span className="font-mono text-[11px] tabular-nums text-slate-400">
                        {c.defaultPrice ? `₱ ${c.defaultPrice.toLocaleString()}` : ""}
                      </span>
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
        <SectionHeader title="Add-ons" hint="Optional extras this vessel offers. The default price comes from Settings → Configurations." count={`${enabledAddOns} of ${catalog.addOns.length}`} />
        {catalog.addOns.length === 0 ? emptyHint : (
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {catalog.addOns.map((a) => {
              const on = addOnOn(a.key);
              return (
                <ToggleRow
                  key={a.key}
                  on={on}
                  onToggle={() => writeAddOn(a, !on)}
                  label={a.label}
                  descriptor={a.descriptor}
                  right={
                    <span className="font-mono text-[11px] tabular-nums text-slate-400">
                      ₱ {a.defaultPrice.toLocaleString()}
                    </span>
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
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
        <p className="mt-1 text-[11.5px] text-slate-500">{hint}</p>
      </div>
      <span className="text-[11px] tabular-nums text-slate-400">
        <span className="font-medium text-slate-700">{count.split(" of ")[0]}</span> of {count.split(" of ")[1]}
      </span>
    </div>
  );
}

function ToggleRow({
  on, onToggle, label, descriptor, right,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  descriptor?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
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
  );
}
