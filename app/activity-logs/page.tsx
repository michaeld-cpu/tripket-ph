"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import Select from "@/components/Select";
import Pagination from "@/components/Pagination";
import DateRangePicker, { type DateRange } from "@/components/DateRangePicker";
import { TableSkeleton } from "@/components/Skeleton";
import {
  buildAuditLog,
  actionTone,
  areaTone,
  type AuditEntry,
  type AuditArea,
} from "@/lib/audit-data";

const PAGE_SIZE = 15;

const AREAS: AuditArea[] = ["Bookings", "Tickets", "Routes", "Vessels", "Schedules", "Users"];

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

// Avatar — brand orange to match the rest of the app (System stays neutral).
function avatarFor(name: string) {
  if (name === "System") return { initials: "SY", cls: "bg-slate-200 text-slate-600" };
  const p = name.trim().split(/\s+/);
  return { initials: ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?", cls: "bg-brand-100 text-brand-600" };
}

export default function AuditLogsPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState<"all" | AuditArea>("all");
  const [page, setPage] = useState(1);

  // Default to TODAY — auditing is a daily routine for shipping ops.
  const [dateRange, setDateRange] = useState<DateRange>(() => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }));

  useEffect(() => {
    const t = setTimeout(() => setEntries(buildAuditLog()), 180);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { setPage(1); }, [query, areaFilter, dateRange]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    const lo = startOfDay(dateRange.start).getTime();
    const hi = endOfDay(dateRange.end).getTime();
    return entries.filter((e) => {
      const t = e.at.getTime();
      if (t < lo || t > hi) return false;
      if (areaFilter !== "all" && e.area !== areaFilter) return false;
      if (q && !`${e.actor} ${e.action} ${e.target} ${e.area} ${e.detail ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, query, areaFilter, dateRange]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Audit logs" subtitle="All operators" showDateFilter={false} />

      {!entries ? (
        <TableSkeleton rows={12} />
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Activity audit</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                <span className="font-medium text-slate-900">{filtered.length}</span> event{filtered.length === 1 ? "" : "s"} in range · platform-wide
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-brand-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search actor, action, or target"
                  className="w-48 bg-transparent placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <Select
                size="sm"
                value={areaFilter}
                onChange={setAreaFilter}
                ariaLabel="Filter by area"
                className="w-32"
                options={[{ value: "all", label: "All areas" }, ...AREAS.map((a) => ({ value: a, label: a }))]}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-5 py-2.5 font-medium">Actor</th>
                  <th className="px-5 py-2.5 font-medium">Action</th>
                  <th className="px-5 py-2.5 font-medium">Target</th>
                  <th className="px-5 py-2.5 font-medium">Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                      No audit events in this range.
                    </td>
                  </tr>
                )}
                {pageRows.map((e, i) => {
                  const av = avatarFor(e.actor);
                  return (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16, delay: i * 0.015, ease: "easeOut" }}
                      className="group transition-colors duration-150 hover:bg-slate-50/60"
                    >
                      {/* When */}
                      <td className="relative whitespace-nowrap px-5 py-3.5 align-middle">
                        <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                        <div className="text-[12.5px] font-medium tabular-nums text-slate-900">{fmtTime(e.at)}</div>
                        <div className="text-[10.5px] tabular-nums text-slate-400">{fmtDateTime(e.at).split(",")[0] ?? ""}</div>
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[9px] font-bold ${av.cls}`}>{av.initials}</span>
                          <span className="truncate text-[12.5px] font-medium tracking-tight text-slate-800">{e.actor}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 align-middle">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${actionTone[e.action]}`}>
                          {e.action}
                        </span>
                      </td>

                      {/* Target + optional detail */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="font-mono text-[12px] font-semibold tabular-nums tracking-[0.02em] text-slate-900">{e.target}</div>
                        {e.detail && <div className="text-[11px] text-slate-400">{e.detail}</div>}
                      </td>

                      {/* Area */}
                      <td className="px-5 py-3.5 align-middle">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-tight ${areaTone[e.area]}`}>
                          {e.area}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="events" />
        </section>
      )}
    </div>
  );
}
