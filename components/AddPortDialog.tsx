"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import { PH_CITIES, cityCode, type PHCity } from "@/lib/ph-locations";
import type { Port } from "@/components/schedule-steps/RoutesStep";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (port: Port) => void;
};

/**
 * AddPortDialog — pick a city from a searchable list (across all PH provinces,
 * a stand-in for the backend's province/city data); the port code is generated
 * from the chosen city and shown read-only. Province comes along with the city
 * for context but isn't a separate input.
 */
export default function AddPortDialog({ open, onClose, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PHCity | null>(null);
  const [portName, setPortName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setPicked(null);
      setPortName("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PH_CITIES;
    return PH_CITIES.filter(
      (c) => c.city.toLowerCase().includes(q) || c.province.toLowerCase().includes(q),
    );
  }, [query]);

  // Fixed per-city code — same city always yields the same code, regardless
  // of how many ports already exist in that city.
  const code = picked ? cityCode(picked.city) : "";
  const valid = !!picked && code.length >= 2 && portName.trim() !== "";

  const handleAdd = () => {
    if (!valid || !picked) return;
    onAdd({ code, city: picked.city, name: portName.trim() });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md" layer="top">
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-200/70"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">Add a port</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              Search for the city or municipality, then name the port. The city
              code is generated automatically from your choice.
            </p>
          </div>
        </div>

        <div className="mt-5">
          {/* Searchable city field */}
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            City / Municipality
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={picked ? picked.city : query}
              onChange={(e) => { setPicked(null); setQuery(e.target.value); }}
              placeholder="Search city, municipality, or province…"
              className="w-full bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {picked && (
              <button
                type="button"
                onClick={() => { setPicked(null); setQuery(""); setTimeout(() => inputRef.current?.focus(), 0); }}
                aria-label="Clear selection"
                className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 hover:text-slate-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>

          {/* Results list — only once the operator starts typing. */}
          {!picked && query.trim() !== "" && (
            <div className="mt-1.5 max-h-[200px] overflow-y-auto rounded-md border border-slate-100">
              {results.length === 0 ? (
                <div className="px-3 py-4 text-center text-[12px] text-slate-400">No matching cities.</div>
              ) : (
                results.map((c) => (
                  <button
                    key={`${c.city}|${c.province}`}
                    type="button"
                    onClick={() => { setPicked(c); setPortName(c.city); setTimeout(() => nameRef.current?.focus(), 0); }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{c.city}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{c.province}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {picked && (
            <>
              {/* Port / terminal name — required. */}
              <div className="mt-4">
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                  Port name
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={portName}
                  onChange={(e) => setPortName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && valid) { e.preventDefault(); handleAdd(); } }}
                  placeholder="e.g. Cebu Pier 1"
                  className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">The specific terminal or pier at this city.</p>
              </div>

              {/* Generated, read-only city code. */}
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">City code</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{picked.city} · {picked.province}</div>
                </div>
                <span className="rounded-md bg-white px-2.5 py-1 font-mono text-[13px] font-semibold tracking-[0.12em] text-slate-900 ring-1 ring-slate-200">
                  {code}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!valid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-brand-700 hover:shadow-[0_6px_16px_-6px_rgba(234,88,12,0.55)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100"
        >
          Add port
        </button>
      </div>
    </Modal>
  );
}
