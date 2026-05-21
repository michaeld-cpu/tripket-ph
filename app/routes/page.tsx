"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import Select from "@/components/Select";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";

// ─────────── Route catalog ───────────
// Each route is a directional origin → destination pair with a nautical-mile distance
// and a typical crossing-duration range. Status drives the pill colour:
//   Active   – running on the regular schedule
//   Inactive – paused but kept on file for re-activation
type RouteStatus = "Active" | "Inactive";
type Route = {
  id: string;
  origin: { code: string; city: string };
  destination: { code: string; city: string };
  distanceNm: number;       // nautical miles
  durationHrs: [number, number]; // [low, high]
  status: RouteStatus;
};

const statusTone: Record<RouteStatus, { pill: string; dot: string }> = {
  Active:   { pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60", dot: "bg-emerald-500" },
  Inactive: { pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/60",     dot: "bg-slate-400"   },
};

// Mock catalog — mirrors the reference, both directions of each pair so dispatchers see
// origin → destination and the return leg as separate rows.
const MOCK_ROUTES: Route[] = [
  { id: "r1",  origin: { code: "CEB", city: "Cebu City" },       destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 42, durationHrs: [3.5, 4],   status: "Active" },
  { id: "r2",  origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "CEB", city: "Cebu City" },      distanceNm: 42, durationHrs: [3.5, 4],   status: "Active" },
  { id: "r3",  origin: { code: "CEB", city: "Cebu City" },       destination: { code: "TAG", city: "Tagbilaran City" },distanceNm: 65, durationHrs: [2, 2.5],   status: "Active" },
  { id: "r4",  origin: { code: "TAG", city: "Tagbilaran City" }, destination: { code: "CEB", city: "Cebu City" },      distanceNm: 65, durationHrs: [2, 2.5],   status: "Active" },
  { id: "r5",  origin: { code: "CEB", city: "Cebu City" },       destination: { code: "ORM", city: "Ormoc City" },     distanceNm: 95, durationHrs: [3.5, 4],   status: "Active" },
  { id: "r6",  origin: { code: "ORM", city: "Ormoc City" },      destination: { code: "CEB", city: "Cebu City" },      distanceNm: 95, durationHrs: [3.5, 4],   status: "Active" },
  { id: "r7",  origin: { code: "CEB", city: "Cebu City" },       destination: { code: "BAC", city: "Bacolod City" },   distanceNm: 80, durationHrs: [4, 5],     status: "Active" },
  { id: "r8",  origin: { code: "BAC", city: "Bacolod City" },    destination: { code: "CEB", city: "Cebu City" },      distanceNm: 80, durationHrs: [4, 5],     status: "Active" },
  { id: "r9",  origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "DAP", city: "Dapitan City" },   distanceNm: 38, durationHrs: [2.5, 3],   status: "Inactive" },
  { id: "r10", origin: { code: "DAP", city: "Dapitan City" },    destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 38, durationHrs: [2.5, 3],   status: "Inactive" },
  { id: "r11", origin: { code: "BAT", city: "Batangas City" },   destination: { code: "CAL", city: "Calapan City" },   distanceNm: 26, durationHrs: [2.5, 3],   status: "Active" },
  { id: "r12", origin: { code: "CAL", city: "Calapan City" },    destination: { code: "BAT", city: "Batangas City" },  distanceNm: 26, durationHrs: [2.5, 3],   status: "Active" },
  { id: "r13", origin: { code: "MNL", city: "Manila" },          destination: { code: "PPS", city: "Puerto Princesa" },distanceNm: 350,durationHrs: [22, 24],  status: "Active" },
  { id: "r14", origin: { code: "PPS", city: "Puerto Princesa" }, destination: { code: "MNL", city: "Manila" },         distanceNm: 350,durationHrs: [22, 24],  status: "Active" },
  { id: "r15", origin: { code: "MNL", city: "Manila" },          destination: { code: "ILO", city: "Iloilo City" },    distanceNm: 250,durationHrs: [18, 20],  status: "Active" },
  { id: "r16", origin: { code: "ILO", city: "Iloilo City" },     destination: { code: "MNL", city: "Manila" },         distanceNm: 250,durationHrs: [18, 20],  status: "Active" },
];

const PAGE_SIZE = 10;

function PortCell({ code, city }: { code: string; city: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[13.5px] font-medium tracking-tight text-slate-900">{city}</span>
      <span className="font-mono text-[11px] tabular-nums tracking-wider text-slate-400">({code})</span>
    </span>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300">
      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RoutesPage() {
  const { active } = useShippingLine();
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RouteStatus>("all");
  const [page, setPage] = useState(1);

  // Fake async fetch so the skeleton + active.id loop reads consistently with vessels/page.
  useEffect(() => {
    let cancelled = false;
    setRoutes(null);
    const t = setTimeout(() => {
      if (!cancelled) setRoutes(MOCK_ROUTES);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [active.id]);

  // Reset to page 1 whenever filters change so users don't land on an empty later page.
  useEffect(() => { setPage(1); }, [query, locationFilter, statusFilter]);

  // Unique locations across the catalog, alphabetized — feeds the filter dropdown.
  const locationOptions = useMemo(() => {
    const cities = new Set<string>();
    (routes ?? []).forEach((r) => {
      cities.add(r.origin.city);
      cities.add(r.destination.city);
    });
    return [{ value: "all", label: "All locations" }, ...Array.from(cities).sort().map((c) => ({ value: c, label: c }))];
  }, [routes]);

  const filtered = useMemo(() => {
    if (!routes) return [];
    const q = query.trim().toLowerCase();
    return routes.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (locationFilter !== "all" && r.origin.city !== locationFilter && r.destination.city !== locationFilter) return false;
      if (q) {
        const hay = `${r.origin.city} ${r.origin.code} ${r.destination.city} ${r.destination.code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [routes, query, locationFilter, statusFilter]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isEmpty = routes !== null && routes.length === 0;

  return (
    <div>
      <PageHeader
        title="Routes"
        subtitle={active.name}
        showDateFilter={false}
        right={
          <button className="btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add route
          </button>
        }
      />

      {!routes ? (
        <TableSkeleton rows={9} />
      ) : isEmpty ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <div className="flex flex-col items-start gap-6 px-8 py-12 sm:px-12 sm:py-16">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-slate-400">
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="18" cy="18" r="2.5" />
              <path d="M8.5 6 17 15M8 17h7" />
            </svg>
            <div className="max-w-md">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">No routes configured yet</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                Define the origin–destination pairs your fleet operates. Each route carries a typical distance,
                crossing duration, and a status so dispatchers know whether it&apos;s running this season.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:scale-[0.97]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add first route
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          {/* Toolbar */}
          <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Configured routes</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span> of {routes.length} routes
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search origin or destination"
                  className="w-52 bg-transparent placeholder:text-gray-400 focus:outline-none"
                />
              </div>

              <Select
                size="sm"
                value={locationFilter}
                onChange={setLocationFilter}
                ariaLabel="Filter by location"
                className="w-44"
                options={locationOptions}
              />

              <Select
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Filter by status"
                className="w-36"
                options={[
                  { value: "all", label: "All status" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
              />
            </div>
          </div>

          {/* Table */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Origin <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Destination <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Distance <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Duration <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="w-10 px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                      No routes match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                    className="group transition-colors duration-150 hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3.5"><PortCell {...r.origin} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-slate-300">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                        <PortCell {...r.destination} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 align-middle tabular-nums">
                      <span className="font-semibold text-slate-900">{r.distanceNm}</span>
                      <span className="ml-1 text-[11px] text-slate-400">nm</span>
                    </td>
                    <td className="px-5 py-3.5 align-middle tabular-nums">
                      <span className="font-semibold text-slate-900">{r.durationHrs[0]}–{r.durationHrs[1]}</span>
                      <span className="ml-1 text-[11px] text-slate-400">hrs</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone[r.status].pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusTone[r.status].dot}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        ariaLabel={`Actions for ${r.origin.code} → ${r.destination.code}`}
                        items={[
                          {
                            label: "Edit route",
                            onClick: () => {
                              // TODO: wire to edit modal once the form lands
                              console.log("edit route", r.id);
                            },
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            ),
                          },
                          {
                            label: "Delete route",
                            danger: true,
                            onClick: () => {
                              // TODO: wire to delete confirm dialog once the dialog lands
                              setRoutes((prev) => prev ? prev.filter((x) => x.id !== r.id) : prev);
                            },
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
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            noun="routes"
          />
        </section>
      )}
    </div>
  );
}
