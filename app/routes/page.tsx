"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import Select from "@/components/Select";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import CreateRouteModal from "@/components/CreateRouteModal";
import { PORTS } from "@/components/schedule-steps/RoutesStep";

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

// Unified status palette — uppercase labels, no dots, restrained tones.
// Active uses opaque emerald (running / healthy); Inactive is struck slate.
const statusTone: Record<RouteStatus, string> = {
  Active:   "bg-emerald-100 text-emerald-800",
  Inactive: "bg-slate-50 text-slate-400 line-through decoration-slate-300",
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

  // ── First-route inline form state ──
  // When the catalog is empty we render the Add-route form directly in place of the
  // empty-state placeholder so operators get to work without an extra click.
  const [draft, setDraft] = useState({
    originCode: "",
    originCity: "",
    destCode: "",
    destCity: "",
    distanceNm: "",
    durationLow: "",
    durationHigh: "",
    status: "Active" as RouteStatus,
  });
  const draftValid =
    draft.originCode.trim().length >= 2 &&
    draft.originCity.trim().length > 0 &&
    draft.destCode.trim().length >= 2 &&
    draft.destCity.trim().length > 0 &&
    Number(draft.distanceNm) > 0 &&
    Number(draft.durationLow) > 0 &&
    Number(draft.durationHigh) >= Number(draft.durationLow);

  const submitFirstRoute = () => {
    if (!draftValid) return;
    const newRoute: Route = {
      id: `r-${Date.now()}`,
      origin: { code: draft.originCode.trim().toUpperCase(), city: draft.originCity.trim() },
      destination: { code: draft.destCode.trim().toUpperCase(), city: draft.destCity.trim() },
      distanceNm: Number(draft.distanceNm),
      durationHrs: [Number(draft.durationLow), Number(draft.durationHigh)],
      status: draft.status,
    };
    setRoutes([newRoute]);
  };

  return (
    <div>
      <PageHeader
        title="Routes"
        subtitle={active.name}
        showDateFilter={false}
        right={
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
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
        <section className="relative overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          {/* Decorative backdrop — soft grid + brand glow, anchored top-right so the
              content reads cleanly on the left and the illustration breathes on the right. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(60% 50% at 100% 0%, rgba(249,115,22,0.08) 0%, transparent 60%), linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)",
              backgroundSize: "auto, 28px 28px, 28px 28px",
              backgroundPosition: "0 0, 0 0, 0 0",
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 70%, transparent)",
            }}
          />

          <div className="relative grid gap-10 px-8 py-12 sm:grid-cols-[minmax(0,1fr)_320px] sm:px-12 sm:py-14">
            {/* ── Inline form ── */}
            <form
              onSubmit={(e) => { e.preventDefault(); submitFirstRoute(); }}
              className="max-w-xl"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-700 ring-1 ring-brand-100">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Step 1 · Set up the fleet
              </span>
              <h2 className="mt-4 text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
                Chart your first route
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                No routes detected for{" "}
                <span className="font-medium text-slate-800">{active.name}</span> yet. Fill the
                fields below to create the first one.
              </p>

              {/* Origin / Destination pair */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldGroup label="Origin port">
                  <div className="grid grid-cols-[88px_1fr] gap-2">
                    <Input
                      value={draft.originCode}
                      onChange={(v) => setDraft((d) => ({ ...d, originCode: v.toUpperCase().slice(0, 4) }))}
                      placeholder="CEB"
                      mono
                      ariaLabel="Origin code"
                    />
                    <Input
                      value={draft.originCity}
                      onChange={(v) => setDraft((d) => ({ ...d, originCity: v }))}
                      placeholder="Cebu City"
                      ariaLabel="Origin city"
                    />
                  </div>
                </FieldGroup>
                <FieldGroup label="Destination port">
                  <div className="grid grid-cols-[88px_1fr] gap-2">
                    <Input
                      value={draft.destCode}
                      onChange={(v) => setDraft((d) => ({ ...d, destCode: v.toUpperCase().slice(0, 4) }))}
                      placeholder="DGT"
                      mono
                      ariaLabel="Destination code"
                    />
                    <Input
                      value={draft.destCity}
                      onChange={(v) => setDraft((d) => ({ ...d, destCity: v }))}
                      placeholder="Dumaguete City"
                      ariaLabel="Destination city"
                    />
                  </div>
                </FieldGroup>
              </div>

              {/* Distance + duration + status */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.4fr_1fr]">
                <FieldGroup label="Distance" suffix="nm">
                  <Input
                    value={draft.distanceNm}
                    onChange={(v) => setDraft((d) => ({ ...d, distanceNm: v.replace(/[^\d.]/g, "") }))}
                    placeholder="42"
                    mono
                    ariaLabel="Distance in nautical miles"
                  />
                </FieldGroup>
                <FieldGroup label="Duration" suffix="hrs">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                    <Input
                      value={draft.durationLow}
                      onChange={(v) => setDraft((d) => ({ ...d, durationLow: v.replace(/[^\d.]/g, "") }))}
                      placeholder="3.5"
                      mono
                      ariaLabel="Minimum duration"
                    />
                    <span className="text-[12px] text-slate-400">to</span>
                    <Input
                      value={draft.durationHigh}
                      onChange={(v) => setDraft((d) => ({ ...d, durationHigh: v.replace(/[^\d.]/g, "") }))}
                      placeholder="4"
                      mono
                      ariaLabel="Maximum duration"
                    />
                  </div>
                </FieldGroup>
                <FieldGroup label="Status">
                  <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50/40 p-0.5">
                    {(["Active", "Inactive"] as const).map((s) => {
                      const on = draft.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, status: s }))}
                          className={
                            "rounded-md px-2 py-1.5 text-[12px] font-medium tracking-tight transition-colors " +
                            (on ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60" : "text-slate-500 hover:text-slate-700")
                          }
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </FieldGroup>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={!draftValid}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-[0_4px_12px_-4px_rgba(249,115,22,0.55)] transition-[background-color,transform,box-shadow,opacity] duration-150 ease-out hover:bg-brand-700 hover:shadow-[0_6px_18px_-4px_rgba(249,115,22,0.65)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create route
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ originCode: "", originCity: "", destCode: "", destCity: "", distanceNm: "", durationLow: "", durationHigh: "", status: "Active" })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 ease-out hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </form>

            {/* ── Decorative route illustration ── */}
            <div className="hidden sm:block">
              <div className="relative h-[200px] w-[260px] rounded-xl bg-gradient-to-br from-slate-50 to-white ring-1 ring-slate-200/70">
                <svg viewBox="0 0 260 200" className="absolute inset-0 h-full w-full" aria-hidden>
                  <defs>
                    <linearGradient id="routeLine" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fb923c" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                    <radialGradient id="portGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* dashed sea grid */}
                  <path d="M0 60 H260 M0 100 H260 M0 140 H260" stroke="rgba(15,23,42,0.05)" strokeDasharray="2 6" />

                  {/* port halos */}
                  <circle cx="50" cy="140" r="28" fill="url(#portGlow)" />
                  <circle cx="210" cy="60" r="28" fill="url(#portGlow)" />

                  {/* curved route path */}
                  <path
                    d="M50 140 Q 130 40 210 60"
                    stroke="url(#routeLine)"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="4 5"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.6s" repeatCount="indefinite" />
                  </path>

                  {/* origin pin */}
                  <circle cx="50" cy="140" r="6" fill="#fff" stroke="#f97316" strokeWidth="2.25" />
                  <circle cx="50" cy="140" r="2" fill="#f97316" />

                  {/* destination pin */}
                  <circle cx="210" cy="60" r="6" fill="#fff" stroke="#f97316" strokeWidth="2.25" />
                  <circle cx="210" cy="60" r="2" fill="#f97316" />

                  {/* port labels */}
                  <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10" fill="#94a3b8" letterSpacing="1">
                    <text x="50" y="162" textAnchor="middle">ORIGIN</text>
                    <text x="210" y="42" textAnchor="middle">DESTINATION</text>
                  </g>

                  {/* tiny ship glyph travelling along — visually idle, just adornment */}
                  <g transform="translate(125 80)" fill="#f97316">
                    <path d="M-6 2 L6 2 L4 6 L-4 6 Z" />
                    <rect x="-1" y="-3" width="2" height="5" />
                  </g>
                </svg>
              </div>
            </div>
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
                  <th className="whitespace-nowrap px-5 py-2.5 text-center font-medium">#</th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Origin <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Destination <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
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
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                      No routes match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((r, i) => {
                  const rowNo = (page - 1) * PAGE_SIZE + i + 1;
                  return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                    className="group transition-colors duration-150 hover:bg-slate-50/60"
                  >
                    <td className="relative whitespace-nowrap px-6 py-4 align-middle text-center font-mono text-[12px] tabular-nums text-slate-400">
                      <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                      {rowNo}
                    </td>
                    <td className="px-5 py-3.5"><PortCell {...r.origin} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-slate-300">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                        <PortCell {...r.destination} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[r.status]}`}>
                        {r.status}
                      </span>
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
            origin,
            destination,
            distanceNm: Number(payload.distanceNm) || 0,
            durationHrs: [lo, hi],
            status: "Active",
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
    </div>
  );
}
