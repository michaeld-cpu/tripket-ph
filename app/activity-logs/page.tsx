"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import Select from "@/components/Select";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
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

export default function ActivityLogsPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [areaFilter, setAreaFilter] = useState<"all" | AuditArea>("all");
  const [page, setPage] = useState(1);
  // Row click opens the read-only detail modal.
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  // Default to TODAY — auditing is a daily routine for shipping ops.
  const [dateRange, setDateRange] = useState<DateRange>(() => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }));

  useEffect(() => {
    const t = setTimeout(() => setEntries(buildAuditLog()), 180);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { setPage(1); }, [areaFilter, dateRange]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const lo = startOfDay(dateRange.start).getTime();
    const hi = endOfDay(dateRange.end).getTime();
    return entries.filter((e) => {
      const t = e.at.getTime();
      if (t < lo || t > hi) return false;
      if (areaFilter !== "all" && e.area !== areaFilter) return false;
      return true;
    });
  }, [entries, areaFilter, dateRange]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Activity logs" subtitle="All operators" showDateFilter={false} />

      {!entries ? (
        <TableSkeleton rows={12} />
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Logs</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                  <th className="px-5 py-2.5 font-medium">Caused by</th>
                  <th className="px-5 py-2.5 font-medium">Event</th>
                  <th className="px-5 py-2.5 font-medium">Subject</th>
                  <th className="px-5 py-2.5 font-medium">Properties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                      No activity in this range.
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
                      onClick={() => setSelected(e)}
                      className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50/60"
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

                      {/* Subject — the entity touched, with the action beneath. */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="text-[12.5px] font-semibold tracking-tight text-slate-900">{e.target}</div>
                        <div className="text-[11px] text-slate-400">{e.action}</div>
                      </td>

                      {/* Properties — the optional detail payload; italic
                          "Empty" when the event recorded none. */}
                      <td className="px-5 py-3.5 align-middle">
                        {e.detail
                          ? <span className="text-[11.5px] text-slate-600">{e.detail}</span>
                          : <span className="text-[11.5px] italic text-slate-300">Empty</span>}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="logs" />
        </section>
      )}

      <LogDetailsModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─────────── Log details modal ───────────
// Read-only expansion of a single row: who caused it, what happened, to what,
// when, and the raw property payload. No actions — an activity log is a record,
// so the only control is Close.
function LogDetailsModal({ entry, onClose }: { entry: AuditEntry | null; onClose: () => void }) {
  return (
    <Modal open={!!entry} onClose={onClose} maxWidth="max-w-xl">
      {entry && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-5">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Activity log details</h2>
            <p className="mt-0.5 text-[12px] text-brand-600">View complete activity information</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="Actor">
                <span className="text-[13px] text-slate-800">{entry.actor}</span>
              </DetailField>
              <DetailField label="Action">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${actionTone[entry.action]}`}>
                  {entry.action}
                </span>
              </DetailField>
              <DetailField label="Target">
                <span className="text-[13px] text-slate-800">{entry.target}</span>
              </DetailField>
              <DetailField label="Area">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-tight ${areaTone[entry.area]}`}>
                  {entry.area}
                </span>
              </DetailField>
              <DetailField label="Created at">
                <span className="block text-[13px] text-slate-800">
                  {entry.at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="mt-0.5 block text-[12.5px] tabular-nums text-slate-500">{fmtTime(entry.at)}</span>
              </DetailField>
            </div>

            <div className="mt-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Properties</div>
              <div className="mt-1.5 min-h-[140px] rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                {entry.detail
                  ? <p className="text-[12.5px] leading-relaxed text-slate-700">{entry.detail}</p>
                  : <p className="text-[12.5px] text-slate-400">No properties recorded.</p>}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
