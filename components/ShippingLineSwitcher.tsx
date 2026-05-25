"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "@/lib/shipping-lines";
import { useShippingLine } from "./ShippingLineContext";

export function LogoTile({ line, size = 24 }: { line: Line; size?: number }) {
  const [err, setErr] = useState(false);
  const px = `${size}px`;
  if (err) {
    return (
      <span
        style={{ width: px, height: px }}
        className={`grid shrink-0 place-items-center rounded-md ${line.fallbackTint} text-[10px] font-bold text-white`}
      >
        {line.initial}
      </span>
    );
  }
  return (
    <span
      style={{ width: px, height: px }}
      className="grid shrink-0 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-gray-200"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={line.logo}
        alt={line.name}
        onError={() => setErr(true)}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export default function ShippingLineSwitcher() {
  const { active, setActiveId, lines, locked } = useShippingLine();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else setQuery("");
  }, [open]);

  const filtered = useMemo(
    () => lines.filter(l => l.name.toLowerCase().includes(query.toLowerCase())),
    [query, lines]
  );

  // Operator mode — render a static identity badge after all hooks have run,
  // so React sees a consistent hook count when the role flips.
  if (locked) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
        <LogoTile line={active} size={24} />
        <span className="block max-w-[240px] truncate whitespace-nowrap text-left font-medium">{active.name}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <div className="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2">
          <LogoTile line={active} size={24} />
          <span className="block max-w-[240px] truncate whitespace-nowrap text-left font-medium">{active.name}</span>
          <span className="grid h-5 w-5 place-items-center rounded-md bg-gray-100 text-gray-500 group-hover:bg-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
            </svg>
          </span>
        </button>
        <span className="ml-1 h-4 w-px bg-gray-300 opacity-0 group-hover:opacity-100" />
        <button
          onClick={() => setActiveId(lines[0].id)}
          aria-label="Clear"
          className="grid h-5 w-5 place-items-center rounded text-gray-400 opacity-0 hover:text-gray-700 group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Find Shipping Line..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <kbd className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500">Esc</kbd>
          </div>

          <div className="max-h-[360px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No matches</div>
            )}
            {filtered.map(l => {
              const selected = l.id === active.id;
              return (
                <button
                  key={l.id}
                  onClick={() => { setActiveId(l.id); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${
                    selected ? "bg-gray-50" : ""
                  }`}
                >
                  <LogoTile line={l} size={28} />
                  <span className="flex-1 truncate">{l.name}</span>
                  {selected && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-brand-600">
                      <path d="M5 12l5 5 9-11" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <button className="flex w-full items-center gap-3 border-t border-gray-100 px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Shipping Line
          </button>
        </div>
      )}
    </div>
  );
}
