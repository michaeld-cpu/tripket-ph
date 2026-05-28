"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { fetchDashboardData, type Vessel } from "@/lib/dashboard-data";
import { TableSkeleton } from "@/components/Skeleton";
import RowMenu from "@/components/RowMenu";
import Select from "@/components/Select";
import AddVesselModal from "@/components/AddVesselModal";
import EditVesselModal from "@/components/EditVesselModal";
import DeleteVesselDialog from "@/components/DeleteVesselDialog";
import { useToast } from "@/components/ToastContext";
import Tooltip from "@/components/Tooltip";

const statusDescription: Record<Vessel["status"], string> = {
  Active: "Cleared for service · accepting bookings",
  Inactive: "Temporarily off-schedule · not bookable",
  Maintenance: "In dry dock or repair · returns once cleared",
  Retired: "Removed from fleet · historical record only",
};

const typeTone: Record<Vessel["type"], string> = {
  RoRo: "border border-gray-200 text-gray-600",
  "Fast Craft": "border border-gray-200 text-gray-600",
  "Passenger Ship": "border border-gray-200 text-gray-600",
};

// Unified status palette — uppercase labels, no dots, restrained tones.
// Active uses opaque emerald (the only "healthy / running" signal); attention
// states use brand-orange; off-the-table states get a struck slate.
const statusTone: Record<Vessel["status"], string> = {
  Active:      "bg-emerald-100 text-emerald-800",
  Inactive:    "bg-slate-100 text-slate-500",
  Maintenance: "bg-brand-50 text-brand-700",
  Retired:     "bg-slate-100 text-slate-500",
};

// Mock voyage history per vessel — deterministic, stable across renders.
// Today is 2026-05-19; "last" is in the past, "next" is upcoming. Routes cycle through
// a fixed set so each vessel reads as having a believable pair of voyages.
const MOCK_ROUTES: Array<[string, string]> = [
  ["MNL", "CEB"], ["BAT", "CAL"], ["MNL", "ILO"], ["MNL", "PPS"],
  ["MNL", "CDO"], ["CEB", "DVO"], ["MNL", "BCD"], ["BAT", "ODG"],
];

const TODAY = new Date("2026-05-19");

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function relativeLabel(d: Date): string {
  const diff = daysBetween(d, TODAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `in ${diff}d`;
  return `${-diff}d ago`;
}

function vesselVoyages(id: string): {
  last: { from: string; to: string; date: Date };
  next: { from: string; to: string; date: Date };
} {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const routeA = MOCK_ROUTES[h % MOCK_ROUTES.length];
  const routeB = MOCK_ROUTES[(h >> 4) % MOCK_ROUTES.length];
  const lastDate = new Date(TODAY); lastDate.setDate(TODAY.getDate() - (1 + (h % 6)));
  const nextDate = new Date(TODAY); nextDate.setDate(TODAY.getDate() + ((h >> 8) % 10));
  return {
    last: { from: routeA[0], to: routeA[1], date: lastDate },
    next: { from: routeB[0], to: routeB[1], date: nextDate },
  };
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function vesselInitials(name: string): string {
  // Strip "MV " prefix, take first letter of next 1-2 words
  const cleaned = name.replace(/^MV\.?\s+/i, "").trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0 && !/^(of|the|and)$/i.test(w));
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function VesselAvatar({ vessel }: { vessel: Vessel }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-600">
      {vesselInitials(vessel.name)}
    </div>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300">
      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function VesselsPage() {
  const { active } = useShippingLine();
  const { showToast } = useToast();
  const [vessels, setVessels] = useState<Vessel[] | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | Vessel["type"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Vessel["status"]>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editVessel, setEditVessel] = useState<Vessel | null>(null);
  const [deleteVessel, setDeleteVessel] = useState<Vessel | null>(null);
  const [copiedImo, setCopiedImo] = useState<string | null>(null);
  const router = useRouter();

  const handleCopyImo = async (imo: string) => {
    try {
      await navigator.clipboard.writeText(imo);
      setCopiedImo(imo);
      showToast(`IMO ${imo} copied`);
      setTimeout(() => setCopiedImo((c) => (c === imo ? null : c)), 1400);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  useEffect(() => {
    let cancelled = false;
    setVessels(null);
    fetchDashboardData(active.id).then(d => {
      if (!cancelled) setVessels(d.vessels);
    });
    return () => { cancelled = true; };
  }, [active.id]);

  const filtered = useMemo(() => {
    if (!vessels) return [];
    return vessels.filter(v => {
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (query && !v.name.toLowerCase().includes(query.toLowerCase()) && !v.imo.includes(query)) return false;
      return true;
    });
  }, [vessels, query, typeFilter, statusFilter]);

  const isEmpty = vessels !== null && vessels.length === 0;

  return (
    <div>
      <PageHeader
        title="Vessels"
        subtitle={active.name}
        showDateFilter={false}
        right={
          <>
            <button className="btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-500">
                <rect x="3.5" y="5" width="17" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3.5 10h17" />
              </svg>
              Vessels schedules
            </button>
            <button className="btn-primary" onClick={() => setAddOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add vessel
            </button>
          </>
        }
      />

      <AddVesselModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={v => setVessels(prev => prev ? [{ ...v, id: `v${Date.now()}` }, ...prev] : [{ ...v, id: `v${Date.now()}` }])}
      />

      <EditVesselModal
        open={editVessel !== null}
        vessel={editVessel}
        onClose={() => setEditVessel(null)}
        onSave={updated =>
          setVessels(prev => prev ? prev.map(v => v.id === updated.id ? updated : v) : prev)
        }
      />

      <DeleteVesselDialog
        open={deleteVessel !== null}
        vessel={deleteVessel}
        onClose={() => setDeleteVessel(null)}
        onConfirm={(v) => {
          setVessels(prev => prev ? prev.filter(x => x.id !== v.id) : prev);
          showToast(`${v.name} deleted`, "error");
        }}
      />

      {!vessels ? (
        <TableSkeleton rows={9} />
      ) : isEmpty ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <div className="flex flex-col items-start gap-6 px-8 py-12 sm:px-12 sm:py-16">
            {/* Single line-icon, no tile, no gradient */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-slate-400">
              <path d="M12 3v3" />
              <path d="M6 13V8h12v5" />
              <path d="M3 13h18l-1.8 5.2a2 2 0 0 1-1.9 1.3H6.7a2 2 0 0 1-1.9-1.3L3 13Z" />
              <path d="M2.5 21c1.2 0 1.2-1 2.4-1s1.2 1 2.4 1 1.2-1 2.4-1 1.2 1 2.3 1 1.2-1 2.4-1 1.2 1 2.4 1 1.2-1 2.3-1" />
            </svg>

            <div className="max-w-md">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {active.name} has no vessels yet
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                Register your fleet to start scheduling voyages, accepting bookings, and tracking capacity.
                Each vessel needs an IMO number, passenger capacity, and an operational status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:scale-[0.97]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Register first vessel
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Registered vessels</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span> of {vessels.length} vessels
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-brand-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search vessel or IMO"
                  className="w-48 bg-transparent placeholder:text-gray-400 focus:outline-none"
                />
              </div>

              <Select
                size="sm"
                value={typeFilter}
                onChange={setTypeFilter}
                ariaLabel="Filter by type"
                className="w-36"
                options={[
                  { value: "all", label: "All types" },
                  { value: "RoRo", label: "RoRo" },
                  { value: "Fast Craft", label: "Fast Craft" },
                  { value: "Passenger Ship", label: "Passenger Ship" },
                ]}
              />

              <Select
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Filter by status"
                className="w-40"
                options={[
                  { value: "all", label: "All status" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Maintenance", label: "Maintenance" },
                  { value: "Retired", label: "Retired" },
                ]}
              />
            </div>
          </div>

          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">IMO</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Vessel <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Passengers <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Vehicle slots <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">Voyages</th>
                  <th className="w-10 px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">
                      No vessels match your filters.
                    </td>
                  </tr>
                )}
                {filtered.map((v, i) => {
                  const tone = statusTone[v.status];
                  return (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 130,
                        damping: 22,
                        delay: Math.min(i * 0.04, 0.4),
                      }}
                      onClick={() => router.push(`/vessels/${v.id}`)}
                      className="group relative cursor-pointer transition-colors duration-150 ease-out hover:bg-slate-50/60"
                    >
                      <td className="relative px-5 py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                        <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">{v.imo}</span>
                          {copiedImo === v.imo ? (
                            <span aria-label="Copied" className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                <path d="M5 12l5 5 9-11" />
                              </svg>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCopyImo(v.imo)}
                              aria-label={`Copy IMO ${v.imo}`}
                              className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                <rect x="9" y="9" width="11" height="11" rx="2" />
                                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <Tooltip content={statusDescription[v.status]}>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
                            {v.status}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <VesselAvatar vessel={v} />
                          <div className="min-w-0">
                            <Tooltip content={v.name} onlyWhenTruncated>
                              <div className="truncate font-medium tracking-tight text-slate-900">
                                {v.name}
                              </div>
                            </Tooltip>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${typeTone[v.type]}`}>{v.type}</span>
                      </td>
                      <td className="px-5 py-3.5 align-middle tabular-nums">
                        <span className="font-semibold text-slate-900">{v.passengers.toLocaleString()}</span>
                        <span className="ml-1 text-[11px] text-slate-400">pax</span>
                      </td>
                      <td className="px-5 py-3.5 align-middle tabular-nums">
                        <span className="font-semibold text-slate-900">{v.vehicleSlots}</span>
                        <span className="ml-1 text-[11px] text-slate-400">slots</span>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        {(() => {
                          const { last, next } = vesselVoyages(v.id);
                          const rel = relativeLabel(next.date);
                          const imminent = daysBetween(next.date, TODAY) <= 1;
                          return (
                            <div className="leading-tight">
                              <div className="flex items-baseline gap-2">
                                <span className="w-7 shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-emerald-600">Next</span>
                                <span className="font-mono text-[12.5px] font-medium tabular-nums tracking-tight text-slate-900">
                                  {next.from}
                                  <span className="px-0.5 text-slate-300">→</span>
                                  {next.to}
                                </span>
                                <Tooltip content={next.date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}>
                                  <span className={`text-[11px] ${imminent ? "font-medium text-emerald-700" : "text-slate-500"}`}>
                                    {rel}
                                  </span>
                                </Tooltip>
                              </div>
                              <div className="mt-0.5 flex items-baseline gap-2 text-[11px] text-slate-400">
                                <span className="w-7 shrink-0 text-[9.5px] font-medium uppercase tracking-[0.1em] text-slate-300">Last</span>
                                <span className="font-mono tabular-nums">
                                  {last.from}
                                  <span className="px-0.5 text-slate-300">→</span>
                                  {last.to}
                                </span>
                                <Tooltip content={last.date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })} side="bottom">
                                  <span>{fmtDate(last.date)}</span>
                                </Tooltip>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          ariaLabel={`Actions for ${v.name}`}
                          items={[
                            {
                              label: "Edit vessel",
                              onClick: () => setEditVessel(v),
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              ),
                            },
                            {
                              label: "Delete vessel",
                              danger: true,
                              onClick: () => setDeleteVessel(v),
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                  <path d="M10 11v6M14 11v6" />
                                </svg>
                              ),
                            },
                          ]}
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
