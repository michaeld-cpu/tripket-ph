"use client";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { MOCK_FLEET, vesselTypeLabel } from "@/components/schedule-steps/VesselStep";

/**
 * AssignVesselDialog — pick the single vessel that sails a route leg.
 *
 * A leg carries exactly one vessel, so this is a single-select: choosing a
 * vessel replaces the current one rather than adding to a roster. The header
 * names both the current and the newly picked vessel so the swap is explicit
 * before it's committed — reassigning a leg moves every booking on it.
 *
 * Confirm stays disabled until the selection actually differs from what the
 * leg already has, so the dialog can't be used to "reassign" a no-op.
 */
export default function AssignVesselDialog({
  open,
  currentVessel,
  onClose,
  onAssign,
}: {
  open: boolean;
  /** Vessel currently on the leg; empty string when unassigned. */
  currentVessel: string;
  onClose: () => void;
  onAssign: (vessel: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>(currentVessel);

  // Re-seed each time the dialog opens so a previous session's pick doesn't
  // linger on the next leg.
  useEffect(() => {
    if (open) { setPicked(currentVessel); setQuery(""); }
  }, [open, currentVessel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_FLEET;
    return MOCK_FLEET.filter(
      (v) => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q),
    );
  }, [query]);

  const changed = picked !== "" && picked !== currentVessel;

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex max-h-[85vh] flex-col">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-[19px] font-semibold tracking-tight text-slate-900">Assign Vessel</h2>
          <p className="mt-1.5 text-[13px] text-slate-500">
            Current vessel:{" "}
            <span className="font-semibold text-slate-700">{currentVessel || "Unassigned"}</span>
          </p>
          <p className="text-[13px] text-slate-500">
            New vessel:{" "}
            <span className="font-semibold text-slate-700">{picked || "—"}</span>
          </p>
        </div>

        <div className="flex min-h-0 flex-col gap-3 px-6 py-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-brand-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vessel..."
              className="w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200"
            style={{ scrollbarGutter: "stable" }}
          >
            {filtered.length === 0 ? (
              <div className="grid place-items-center py-12 text-center text-[13px] text-slate-400">
                No vessels match your search.
              </div>
            ) : (
              <ul role="listbox" aria-label="Vessels">
                {filtered.map((v) => {
                  const on = picked === v.name;
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => setPicked(v.name)}
                        className={
                          "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors " +
                          (on ? "bg-brand-50/60" : "hover:bg-slate-50")
                        }
                      >
                        <span className="min-w-0">
                          <span className={"block truncate text-[15px] " + (on ? "font-semibold text-brand-700" : "text-slate-900")}>
                            {v.name}
                          </span>
                          <span className={"mt-0.5 block truncate text-[13px] " + (on ? "text-brand-600" : "text-slate-500")}>
                            {vesselTypeLabel(v.type)}
                          </span>
                        </span>
                        {on && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-brand-600">
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!changed}
            onClick={() => { if (changed) onAssign(picked); }}
            className={
              "rounded-lg px-5 py-2.5 text-[14px] font-semibold text-white transition-colors " +
              (changed ? "bg-brand-600 hover:bg-brand-700" : "cursor-not-allowed bg-brand-300")
            }
          >
            Assign Vessel
          </button>
        </div>
      </div>
    </Modal>
  );
}
