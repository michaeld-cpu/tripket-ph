"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import Select from "@/components/Select";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import CreateRouteModal from "@/components/CreateRouteModal";
import AssignVesselsEditor from "@/components/AssignVesselsEditor";
import Modal from "@/components/Modal";
import { PORTS, type RoutesValue } from "@/components/schedule-steps/RoutesStep";

// ─────────── Route catalog ───────────
// Each route is a directional origin → destination pair with a nautical-mile distance
// and a typical crossing-duration range. Status drives the pill colour:
//   Active   – running on the regular schedule
//   Inactive – paused but kept on file for re-activation
type RouteStatus = "Active" | "Inactive";
type Route = {
  id: string;
  /** Short human-friendly reference code displayed in the table. */
  ref: string;
  origin: { code: string; city: string };
  destination: { code: string; city: string };
  distanceNm: number;       // nautical miles
  durationHrs: [number, number]; // [low, high]
  status: RouteStatus;
  /** Vessel assignments on this route. A route can run multiple vessels,
      each with its own dated departures. Empty = unassigned. */
  assignments: VesselAssignment[];
};

// One vessel's sailings on a route.
type VesselAssignment = {
  vessel: string;
  /** Concrete dated departures for this vessel, sorted ascending. */
  departures: Date[];
};

// Mints mock departure dates — used until the real schedule-generation
// pipeline feeds dates in. Spreads `count` sailings across the next ~30
// days on a fixed weekday cadence.
// Map a table Route into the wizard-shaped RoutesValue the edit dialog expects.
function routeToValue(r: Route): RoutesValue {
  return {
    originCode: r.origin.code,
    destinationCode: r.destination.code,
    distanceNm: String(r.distanceNm),
    durationLowHrs: String(r.durationHrs[0]),
    durationHighHrs: String(r.durationHrs[1]),
    createReturn: false,
    status: r.status,
  };
}

function mockDepartures(count: number, weekdays: number[], hour: number): Date[] {
  if (count === 0) return [];
  const out: Date[] = [];
  const cursor = new Date();
  cursor.setHours(hour, 0, 0, 0);
  let guard = 0;
  while (out.length < count && guard < 60) {
    if (weekdays.includes(cursor.getDay())) out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return out;
}

// Flatten all departures across a route's vessel assignments, sorted
// ascending — used for the "next + N more" summary in the table cell.
function allDepartures(r: Route): Date[] {
  return r.assignments
    .flatMap((a) => a.departures)
    .sort((x, y) => x.getTime() - y.getTime());
}

// Unified status palette — uppercase labels, no dots, restrained tones.
// Active uses opaque emerald (running / healthy); Inactive is struck slate.
const statusTone: Record<RouteStatus, string> = {
  Active:   "bg-emerald-100 text-emerald-800",
  Inactive: "bg-slate-100 text-slate-500",
};

// Mock catalog — mirrors the reference, both directions of each pair so dispatchers see
// origin → destination and the return leg as separate rows.
const MOCK_ROUTES: Route[] = [
  // Multi-vessel routes (r1, r5) demonstrate the assignments model — same
  // route served by more than one vessel, each on its own cadence.
  { id: "r1",  ref: "RT-0001", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 42, durationHrs: [3.5, 4],   status: "Active",   assignments: [
    { vessel: "MV Filipinas Cebu", departures: mockDepartures(13, [1,3,5], 8) },
    { vessel: "FC Sinulog",        departures: mockDepartures(8, [2,4], 13) },
  ] },
  { id: "r2",  ref: "RT-0002", origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "CEB", city: "Cebu City" },      distanceNm: 42, durationHrs: [3.5, 4],   status: "Active",   assignments: [{ vessel: "MV Filipinas Cebu", departures: mockDepartures(13, [1,3,5], 14) }] },
  { id: "r3",  ref: "RT-0003", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "TAG", city: "Tagbilaran City" },distanceNm: 65, durationHrs: [2, 2.5],   status: "Active",   assignments: [{ vessel: "FC Sinulog", departures: mockDepartures(8, [2,4], 6) }] },
  { id: "r4",  ref: "RT-0004", origin: { code: "TAG", city: "Tagbilaran City" }, destination: { code: "CEB", city: "Cebu City" },      distanceNm: 65, durationHrs: [2, 2.5],   status: "Active",   assignments: [{ vessel: "FC Sinulog", departures: mockDepartures(8, [2,4], 11) }] },
  { id: "r5",  ref: "RT-0005", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "ORM", city: "Ormoc City" },     distanceNm: 95, durationHrs: [3.5, 4],   status: "Active",   assignments: [
    { vessel: "MV Reina del Cielo", departures: mockDepartures(21, [1,2,3,4,5], 9) },
    { vessel: "MV Visayan Star",    departures: mockDepartures(8, [6,0], 9) },
  ] },
  { id: "r6",  ref: "RT-0006", origin: { code: "ORM", city: "Ormoc City" },      destination: { code: "CEB", city: "Cebu City" },      distanceNm: 95, durationHrs: [3.5, 4],   status: "Active",   assignments: [{ vessel: "MV Reina del Cielo", departures: mockDepartures(21, [1,2,3,4,5], 16) }] },
  { id: "r7",  ref: "RT-0007", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "BAC", city: "Bacolod City" },   distanceNm: 80, durationHrs: [4, 5],     status: "Active",   assignments: [{ vessel: "MV Visayan Star", departures: mockDepartures(8, [6,0], 7) }] },
  { id: "r8",  ref: "RT-0008", origin: { code: "BAC", city: "Bacolod City" },    destination: { code: "CEB", city: "Cebu City" },      distanceNm: 80, durationHrs: [4, 5],     status: "Active",   assignments: [{ vessel: "MV Visayan Star", departures: mockDepartures(8, [6,0], 13) }] },
  { id: "r9",  ref: "RT-0009", origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "DAP", city: "Dapitan City" },   distanceNm: 38, durationHrs: [2.5, 3],   status: "Inactive", assignments: [] },
  { id: "r10", ref: "RT-0010", origin: { code: "DAP", city: "Dapitan City" },    destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 38, durationHrs: [2.5, 3],   status: "Inactive", assignments: [] },
  { id: "r11", ref: "RT-0011", origin: { code: "BAT", city: "Batangas City" },   destination: { code: "CAL", city: "Calapan City" },   distanceNm: 26, durationHrs: [2.5, 3],   status: "Active",   assignments: [{ vessel: "MV Maligaya", departures: mockDepartures(26, [1,2,3,4,5,6,0], 5) }] },
  { id: "r12", ref: "RT-0012", origin: { code: "CAL", city: "Calapan City" },    destination: { code: "BAT", city: "Batangas City" },  distanceNm: 26, durationHrs: [2.5, 3],   status: "Active",   assignments: [{ vessel: "MV Maligaya", departures: mockDepartures(26, [1,2,3,4,5,6,0], 10) }] },
  { id: "r13", ref: "RT-0013", origin: { code: "MNL", city: "Manila" },          destination: { code: "PPS", city: "Puerto Princesa" },distanceNm: 350,durationHrs: [22, 24],  status: "Active",   assignments: [{ vessel: "2GO Masinloc", departures: mockDepartures(4, [5], 18) }] },
  { id: "r14", ref: "RT-0014", origin: { code: "PPS", city: "Puerto Princesa" }, destination: { code: "MNL", city: "Manila" },         distanceNm: 350,durationHrs: [22, 24],  status: "Active",   assignments: [{ vessel: "2GO Masinloc", departures: mockDepartures(4, [0], 18) }] },
  { id: "r15", ref: "RT-0015", origin: { code: "MNL", city: "Manila" },          destination: { code: "ILO", city: "Iloilo City" },    distanceNm: 250,durationHrs: [18, 20],  status: "Active",   assignments: [{ vessel: "2GO Saint Pope John Paul II", departures: mockDepartures(4, [3], 20) }] },
  { id: "r16", ref: "RT-0016", origin: { code: "ILO", city: "Iloilo City" },     destination: { code: "MNL", city: "Manila" },         distanceNm: 250,durationHrs: [18, 20],  status: "Active",   assignments: [{ vessel: "2GO Saint Pope John Paul II", departures: mockDepartures(4, [6], 20) }] },
];

const PAGE_SIZE = 10;

function PortCell({ code, city }: { code: string; city: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[13.5px] font-medium tracking-tight text-slate-900">{city}</span>
      <span className="font-mono text-[11px] tabular-nums tracking-wider text-slate-400">({code})</span>
    </span>
  );
}

function FieldGroup({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
        {suffix && <span className="text-[10.5px] font-medium text-slate-400">{suffix}</span>}
      </span>
      {children}
    </label>
  );
}

function Input({
  value, onChange, placeholder, mono, ariaLabel,
}: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; ariaLabel?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] tracking-tight text-slate-900 placeholder:text-slate-300 transition-[border-color,box-shadow] duration-150 ease-out focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 " +
        (mono ? "font-mono tabular-nums" : "")
      }
    />
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
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RouteStatus>("all");
  const [page, setPage] = useState(1);
  // Route whose vessel/departure schedule dialog is open (null = closed).
  const [scheduleRoute, setScheduleRoute] = useState<Route | null>(null);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  // When true, the edit dialog is opened via "Assign vessel" — the same
  // dialog, but with the assigned-vessels editor rendered alongside the form.
  const [assignMode, setAssignMode] = useState(false);
  // Draft selection of vessel names while the assign editor is open.
  const [assignDraft, setAssignDraft] = useState<string[]>([]);
  const [deleteRoute, setDeleteRoute] = useState<Route | null>(null);
  const router = useRouter();

  // "Manage schedule" → jump to the Voyages page pre-filtered by this route's
  // origin port and (optionally) a specific vessel.
  const goToVoyages = (route: Route, vessel?: string) => {
    const params = new URLSearchParams({ origin: route.origin.code });
    if (vessel) params.set("vessel", vessel);
    router.push(`/voyages?${params.toString()}`);
  };

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

  return (
    <div>
      <PageHeader
        title="Routes"
        subtitle={active.name}
        showDateFilter={false}
      />

      {!routes ? (
        <TableSkeleton rows={9} />
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
                  <th className="px-5 py-2.5 font-medium">Route ref</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Origin <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Destination <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">Vessel</th>
                  <th className="px-5 py-2.5 font-medium">Departures</th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Distance <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Duration <SortIcon /></button>
                  </th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50 px-5 py-2.5 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-400">
                      No routes match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((r, i) => {
                  return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                    className="group transition-colors duration-150 hover:bg-slate-50/60"
                  >
                    <td className="relative px-5 py-3.5 align-middle">
                      <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                      <RouteRef value={r.ref} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap"><PortCell {...r.origin} /></td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-slate-300">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                        <PortCell {...r.destination} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                      {r.assignments.length === 0 ? (
                        <span className="text-[12px] text-slate-400">Unassigned</span>
                      ) : r.assignments.length === 1 ? (
                        <button
                          type="button"
                          onClick={() => setScheduleRoute(r)}
                          className="text-left text-[13px] font-medium tracking-tight text-slate-900 underline-offset-2 hover:underline whitespace-nowrap"
                        >
                          {r.assignments[0].vessel}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setScheduleRoute(r)}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                        >
                          {r.assignments.length} vessels
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-slate-400">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                      {(() => {
                        const deps = allDepartures(r);
                        if (deps.length === 0) return <span className="text-[12px] text-slate-400">No upcoming</span>;
                        const next = deps[0];
                        return (
                          <button
                            type="button"
                            onClick={() => setScheduleRoute(r)}
                            className="flex items-baseline gap-1.5 whitespace-nowrap text-left"
                          >
                            <span className="text-[12.5px] font-medium tracking-tight text-slate-900 underline-offset-2 hover:underline">
                              {next.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-slate-500">
                              {((next.getHours() + 11) % 12) + 1}:{String(next.getMinutes()).padStart(2, "0")} {next.getHours() < 12 ? "AM" : "PM"}
                            </span>
                            {deps.length > 1 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
                                +{deps.length - 1}
                              </span>
                            )}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 align-middle tabular-nums">
                      <span className="font-semibold text-slate-900">{r.distanceNm}</span>
                      <span className="ml-1 text-[11px] text-slate-400">nm</span>
                    </td>
                    <td className="px-5 py-3.5 align-middle tabular-nums">
                      <span className="font-semibold text-slate-900">{r.durationHrs[0]}–{r.durationHrs[1]}</span>
                      <span className="ml-1 text-[11px] text-slate-400">hrs</span>
                    </td>
                    <td
                      className="sticky right-0 z-10 bg-white px-5 py-3 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] transition-colors duration-150 group-hover:bg-slate-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenu
                        ariaLabel={`Actions for ${r.origin.code} → ${r.destination.code}`}
                        items={[
                          {
                            label: "Edit route",
                            onClick: () => { setAssignMode(false); setEditRoute(r); },
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            ),
                          },
                          {
                            label: "Assign vessel",
                            onClick: () => {
                              setAssignDraft(r.assignments.map((a) => a.vessel));
                              setAssignMode(true);
                              setEditRoute(r);
                            },
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z" />
                                <path d="M5 14V8a1 1 0 0 1 1-1h7l5 4" />
                                <path d="M9 7V4h2" />
                              </svg>
                            ),
                          },
                          {
                            label: "Delete route",
                            danger: true,
                            onClick: () => setDeleteRoute(r),
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

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            noun="routes"
          />
        </section>
      )}

      {/* ── Create-route dialog ── */}
      <CreateRouteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(payload) => {
          // Convert the wizard-shaped RoutesValue into the page's Route shape
          // and prepend it so the new entry sits at the top of the table.
          const origin = PORTS.find((p) => p.code === payload.originCode);
          const destination = PORTS.find((p) => p.code === payload.destinationCode);
          if (!origin || !destination) return;
          const lo = Number(payload.durationLowHrs) || 0;
          const hi = Number(payload.durationHighHrs) || lo;
          const newRoute: Route = {
            id: `r-${Date.now()}`,
            ref: `RT-${String(Date.now()).slice(-4)}`,
            origin,
            destination,
            distanceNm: Number(payload.distanceNm) || 0,
            durationHrs: [lo, hi],
            status: "Active",
            assignments: [],
          };
          setRoutes((prev) => prev ? [newRoute, ...prev] : [newRoute]);
          // If the operator opted in to a return leg, mirror the route.
          if (payload.createReturn) {
            const returnLeg: Route = {
              ...newRoute,
              id: `r-${Date.now() + 1}`,
              origin: destination,
              destination: origin,
            };
            setRoutes((prev) => prev ? [returnLeg, newRoute, ...prev.filter((r) => r.id !== newRoute.id)] : [returnLeg, newRoute]);
          }
        }}
      />

      {/* ── Edit-route dialog ── reuses CreateRouteModal in edit mode. The
          row's "Assign vessel" action opens the same dialog but with the
          assigned-vessels panel rendered alongside the form. */}
      <CreateRouteModal
        open={!!editRoute}
        onClose={() => { setEditRoute(null); setAssignMode(false); }}
        editValue={editRoute ? routeToValue(editRoute) : null}
        onSave={(payload) => {
          if (!editRoute) return;
          const origin = PORTS.find((p) => p.code === payload.originCode);
          const destination = PORTS.find((p) => p.code === payload.destinationCode);
          if (!origin || !destination) return;
          const lo = Number(payload.durationLowHrs) || 0;
          const hi = Number(payload.durationHighHrs) || lo;
          // In assign mode reconcile the assignments roster with the draft:
          // kept vessels retain their existing departures; new vessels start
          // with an empty departure list; removed vessels drop out.
          const nextAssignments = assignMode
            ? assignDraft.map((name) => {
                const prev = editRoute.assignments.find((a) => a.vessel === name);
                return prev ?? { vessel: name, departures: [] };
              })
            : editRoute.assignments;
          setRoutes((prev) =>
            prev
              ? prev.map((r) =>
                  r.id === editRoute.id
                    ? {
                        ...r,
                        origin,
                        destination,
                        distanceNm: Number(payload.distanceNm) || 0,
                        durationHrs: [lo, hi],
                        status: payload.status ?? r.status,
                        assignments: nextAssignments,
                      }
                    : r
                )
              : prev
          );
        }}
        editMode={assignMode ? "assign" : "edit"}
        editExtra={assignMode && editRoute ? (
          <AssignVesselsEditor value={assignDraft} onChange={setAssignDraft} />
        ) : null}
      />

      <DeleteRouteDialog
        route={deleteRoute}
        onClose={() => setDeleteRoute(null)}
        onConfirm={(r) => setRoutes((prev) => (prev ? prev.filter((x) => x.id !== r.id) : prev))}
      />

      <RouteScheduleDialog route={scheduleRoute} onClose={() => setScheduleRoute(null)} />
    </div>
  );
}

// ─────────── RouteRef ───────────
// Route reference code with a copy-to-clipboard affordance. The icon stays
// quiet until row hover, then flips to a check for a beat on copy.
function RouteRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger the row's edit click
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }).catch(() => {});
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{value}</span>
      {copied ? (
        <span aria-label="Copied" className="grid h-5 w-5 place-items-center rounded text-emerald-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M5 12l5 5 9-11" />
          </svg>
        </span>
      ) : (
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${value}`}
          className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        </button>
      )}
    </span>
  );
}

// ─────────── DeleteRouteDialog ───────────
// Lightweight confirm — the row menu is now the only delete path, so it must
// guard against accidental removal. Mirrors DeleteVesselDialog's visuals
// without the type-to-confirm friction (a route is lower-stakes than a vessel).
function DeleteRouteDialog({
  route,
  onClose,
  onConfirm,
}: {
  route: Route | null;
  onClose: () => void;
  onConfirm: (r: Route) => void;
}) {
  const assignedCount = route?.assignments.length ?? 0;
  return (
    <Modal open={!!route} onClose={onClose} maxWidth="max-w-md">
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-start gap-4">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">Delete this route?</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              {route ? (
                <>
                  <span className="font-medium text-slate-900">
                    {route.origin.city} ({route.origin.code}) → {route.destination.city} ({route.destination.code})
                  </span>{" "}
                  will be removed from your catalog.
                  {assignedCount > 0 && (
                    <> Its {assignedCount} vessel assignment{assignedCount === 1 ? "" : "s"} and their departures will be unlinked.</>
                  )}{" "}
                  This cannot be undone.
                </>
              ) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { if (route) { onConfirm(route); onClose(); } }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-rose-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
        >
          Delete route
        </button>
      </div>
    </Modal>
  );
}

// ─────────── AssignedVesselsSummary ───────────
// Read-only roster of the vessels sailing a route, shown in the edit dialog.
// Departures are managed in the RouteScheduleDialog — the "Manage" link hands
// off there rather than duplicating that editor here.
function AssignedVesselsSummary({ route, onManage }: { route: Route; onManage: (vessel?: string) => void }) {
  const { assignments } = route;
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
        <div className="flex items-baseline gap-2">
          <h4 className="text-[13px] font-semibold tracking-tight text-slate-900">Assigned vessels</h4>
          <span className="font-mono text-[11px] tabular-nums text-slate-400">{assignments.length}</span>
        </div>
        <button
          type="button"
          onClick={() => onManage()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium text-brand-700 transition-colors duration-150 hover:bg-brand-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300"
        >
          Manage schedule
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      {assignments.length === 0 ? (
        <div className="px-4 pb-3.5 text-[12px] text-slate-400">
          No vessels assigned yet. Use Manage schedule to add one.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 px-4 pb-2">
          {assignments.map((a) => {
            const cadence = derivewWeekdayCadence(a.departures);
            return (
              <li key={a.vessel}>
                <button
                  type="button"
                  onClick={() => onManage(a.vessel)}
                  className="group flex w-full items-center gap-2.5 rounded-lg py-2.5 text-left transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z" />
                      <path d="M5 14V8a1 1 0 0 1 1-1h7l5 4" />
                      <path d="M9 7V4h2" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium tracking-tight text-slate-900">{a.vessel}</span>
                    {cadence && <span className="block truncate text-[11px] text-slate-400">{cadence}</span>}
                  </span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-slate-500">
                    {a.departures.length} departure{a.departures.length === 1 ? "" : "s"}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─────────── RouteScheduleDialog ───────────
// Shows every vessel assigned to a route + that vessel's dated departures.
// Filterable by vessel. Fixed body height so the dialog never resizes when
// the filter changes (avoids the layout-shift / masking issue).
function RouteScheduleDialog({
  route,
  onClose,
}: {
  route: Route | null;
  onClose: () => void;
}) {
  const [vesselFilter, setVesselFilter] = useState<string>("all");

  // Reset the filter whenever a different route opens.
  useEffect(() => { setVesselFilter("all"); }, [route?.id]);

  const vesselOptions = useMemo(() => {
    if (!route) return [{ value: "all", label: "All vessels" }];
    return [
      { value: "all", label: "All vessels" },
      ...route.assignments.map((a) => ({ value: a.vessel, label: a.vessel })),
    ];
  }, [route]);

  const visible = useMemo(() => {
    if (!route) return [];
    return route.assignments.filter((a) => vesselFilter === "all" || a.vessel === vesselFilter);
  }, [route, vesselFilter]);

  // The earliest upcoming departure across all visible assignments — used to
  // tag the single "Next" sailing so the operator's eye lands on it.
  const nextDeparture = useMemo(() => {
    const all = visible.flatMap((a) => a.departures).filter((d) => d.getTime() >= Date.now());
    return all.length ? all.reduce((min, d) => (d < min ? d : min)) : null;
  }, [visible]);

  const totalDepartures = useMemo(
    () => visible.reduce((s, a) => s + a.departures.length, 0),
    [visible],
  );

  if (!route) return null;

  const fmtTime = (d: Date) =>
    `${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;

  return (
    <Modal open={!!route} onClose={onClose} maxWidth="max-w-2xl">
      {/* Fixed height — body scrolls internally so the dialog box stays the
          same size regardless of the vessel filter. */}
      <div className="flex h-[760px] max-h-[90vh] flex-col">
        {/* Header — boarding-pass style route headline. */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <span className="font-mono text-[11px] font-semibold tabular-nums tracking-[0.08em] text-slate-400">{route.ref}</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[17px] font-bold uppercase tabular-nums tracking-[0.04em] text-slate-900">{route.origin.code}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-300">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <span className="font-mono text-[17px] font-bold uppercase tabular-nums tracking-[0.04em] text-slate-900">{route.destination.code}</span>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">{route.origin.city} → {route.destination.city}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Filter + summary row */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <Select
            size="sm"
            value={vesselFilter}
            onChange={setVesselFilter}
            ariaLabel="Filter by vessel"
            className="flex-1"
            options={vesselOptions}
          />
          <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-slate-500">
            {totalDepartures} departure{totalDepartures === 1 ? "" : "s"}
          </span>
        </div>

        {/* Vessel → departures list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {visible.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[12.5px] text-slate-400">
              No vessels assigned to this route.
            </div>
          ) : (
            <div className="space-y-6">
              {visible.map((a) => {
                const cadence = derivewWeekdayCadence(a.departures);
                return (
                  <div key={a.vessel}>
                    {/* Vessel group header — icon tile + name + cadence chip,
                        with the departure count tucked to the right. */}
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M3 18c1.5 0 2-1 4-1s2.5 1 4 1 2-1 4-1 2.5 1 4 1" />
                          <path d="M5 18V9l7-4 7 4v9" />
                          <path d="M9 13h6" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{a.vessel}</h3>
                          {cadence && (
                            <span className="hidden shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-slate-500 sm:inline">
                              {cadence}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {a.departures.length} departure{a.departures.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>

                    {a.departures.length === 0 ? (
                      <p className="mt-2 pl-[42px] text-[12px] text-slate-400">No upcoming departures.</p>
                    ) : (
                      <ul className="mt-2.5 grid grid-cols-2 gap-1.5 pl-[42px]">
                        {a.departures.map((d, i) => {
                          const isNext = nextDeparture != null && d.getTime() === nextDeparture.getTime();
                          const isPast = d.getTime() < Date.now();
                          return (
                            <li
                              key={i}
                              className={
                                "flex items-baseline justify-between rounded-md px-2.5 py-1.5 text-[12px] " +
                                (isNext
                                  ? "bg-brand-50"
                                  : isPast
                                    ? "bg-transparent"
                                    : "bg-slate-50")
                              }
                            >
                              <span className="flex items-center gap-1.5">
                                <span className={"font-medium tracking-tight " + (isPast ? "text-slate-400" : "text-slate-900")}>
                                  {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                </span>
                                {isNext && (
                                  <span className="rounded bg-brand-500 px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] text-white">
                                    Next
                                  </span>
                                )}
                              </span>
                              <span className={"font-mono tabular-nums " + (isPast ? "text-slate-300" : "text-slate-500")}>
                                {fmtTime(d)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Derive a compact weekday-cadence label ("Mon · Wed · Fri") from a list of
// departures — gives the operator the recurring pattern at a glance. Returns
// null when there's nothing meaningful to show.
function derivewWeekdayCadence(departures: Date[]): string | null {
  if (departures.length === 0) return null;
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const present = new Set(departures.map((d) => d.getDay()));
  // Order Mon→Sun for readability.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days = order.filter((dow) => present.has(dow)).map((dow) => short[dow]);
  if (days.length === 0 || days.length === 7) return days.length === 7 ? "Daily" : null;
  return days.join(" · ");
}
