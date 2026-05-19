"use client";
import { motion } from "motion/react";

type Departure = {
  id: string;
  vessel: string;
  type: "RoRo" | "Fast Craft" | "Ferry";
  operator: string;
  routeFrom: string;
  routeTo: string;
  depart: string;
  arrive: string;
  arriveOffsetDays?: number;
  durationLabel: string;
  ticketsConfirmed: number;
  ticketsPending: number;
};

const typeTone: Record<Departure["type"], string> = {
  RoRo: "border border-slate-200 text-slate-600",
  "Fast Craft": "border border-slate-200 text-slate-600",
  Ferry: "border border-slate-200 text-slate-600",
};

export default function DepartureBoard({ data }: { data: Departure[] }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      {/* Section header */}
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Today's departures</h2>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Apr 8, 2026 · <span className="font-medium text-slate-700">{data.length}</span> sailings scheduled
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]">
          View all
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </header>

      <div className="flex flex-col gap-2">
        {data.map((d, i) => {
          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 22,
                delay: i * 0.05, // 50ms stagger — within Emil's 30–80ms range
              }}
              className="group relative flex items-center gap-5 overflow-hidden rounded-xl bg-white pl-5 pr-5 py-3 ring-1 ring-slate-200/70 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50/60 active:scale-[0.997]"
            >
              {/* Left brand accent */}
              <span className="absolute left-0 top-0 h-full w-[3px] bg-brand-500/70" />

              {/* Time block */}
              <div className="w-44 shrink-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[18px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">{d.depart}</span>
                  {d.durationLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200/70">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      <span className="tabular-nums">{d.durationLabel}</span>
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3 w-3 text-slate-400"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span>arrives <span className="tabular-nums text-slate-700">{d.arrive}</span></span>
                </div>
              </div>

              {/* Route */}
              <div className="w-36 shrink-0">
                <div className="flex items-center gap-2 text-[15px] font-bold tracking-wide text-slate-900">
                  <span className="tabular-nums">{d.routeFrom}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-brand-500"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="tabular-nums">{d.routeTo}</span>
                </div>
              </div>

              {/* Vessel + operator + type pill */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium tracking-tight text-slate-900">{d.vessel}</span>
                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${typeTone[d.type]}`}>{d.type}</span>
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-500">
                  {d.operator} · <span className="font-mono">{d.id}</span>
                </div>
              </div>

              {/* Tickets sold — single glance metric, no progress math */}
              <div className="w-28 shrink-0 text-right">
                <div className="text-[20px] font-semibold leading-none tabular-nums tracking-tight text-slate-900">
                  {d.ticketsConfirmed.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">tickets sold</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
