"use client";
import { useMemo, useState } from "react";
import { MOCK_FLEET, type FleetVessel } from "@/components/schedule-steps/VesselStep";

/**
 * AssignVesselsEditor — multi-select roster of vessels assigned to a route.
 *
 * Rendered inside the route edit dialog when the row's "Assign vessel"
 * action is invoked. Operators tick the vessels that should sail this
 * route; toggling off an assigned vessel removes it from the route.
 * Concrete dated departures still live in the schedule wizard / voyages
 * page — this editor only manages the roster.
 */

export type AssignVesselsValue = string[]; // selected vessel names

export default function AssignVesselsEditor({
  value,
  onChange,
}: {
  value: AssignVesselsValue;
  onChange: (next: AssignVesselsValue) => void;
}) {
  const fleet = MOCK_FLEET;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fleet;
    return fleet.filter((v) => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q));
  }, [fleet, query]);

  const isOn = (name: string) => value.includes(name);
  const toggle = (name: string) =>
    onChange(isOn(name) ? value.filter((n) => n !== name) : [...value, name]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h4 className="text-[13px] font-semibold tracking-tight text-slate-900">Assigned vessels</h4>
          <span className="font-mono text-[11px] tabular-nums text-slate-400">
            {value.length} of {fleet.length}
          </span>
        </div>
        <p className="hidden text-[11px] text-slate-500 sm:block">Pick one or more vessels that sail this route.</p>
      </div>

      <div className="space-y-2.5 p-3">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-brand-100">
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

        {/* Multi-select grid */}
        <div
          className="grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto rounded-lg bg-slate-50/30 p-2 sm:grid-cols-2"
          style={{ scrollbarGutter: "stable" }}
        >
          {filtered.length === 0 ? (
            <div className="col-span-full grid place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 py-8 text-center text-[12.5px] text-slate-400">
              No vessels match your search.
            </div>
          ) : (
            filtered.map((v) => {
              const on = isOn(v.name);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggle(v.name)}
                  aria-pressed={on}
                  className={
                    "group flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition-all duration-150 " +
                    (on
                      ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/15"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50")
                  }
                >
                  <span
                    aria-hidden
                    className={
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors " +
                      (on
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-slate-300 bg-white text-transparent group-hover:border-slate-400")
                    }
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{v.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                      <span className="font-medium text-slate-600">{v.type}</span>
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
                </button>
              );
            })
          )}
        </div>

        {value.length > 0 && (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              <span className="font-medium text-slate-700">{value.length}</span> selected
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-medium text-slate-400 transition-colors hover:text-rose-500"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export type { FleetVessel };
