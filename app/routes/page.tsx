"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import FiltersDialog, { FiltersButton } from "@/components/FiltersDialog";
import { type DateRange, type OptionalDateRange } from "@/components/DateRangePicker";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import CreateRouteModal from "@/components/CreateRouteModal";
import { loadStore, saveStore } from "@/lib/persisted-store";
import AssignVesselDialog from "@/components/AssignVesselDialog";
import CancelConfirmDialog, { ROUTE_CANCEL_REASONS } from "@/components/CancelConfirmDialog";
import Modal from "@/components/Modal";
import { useToast } from "@/components/ToastContext";
import RouteStatusDialog from "@/components/RouteStatusDialog";
import BulkDisableRoutesDialog from "@/components/BulkDisableRoutesDialog";
import { PORTS, portId, findPort, DEFAULT_ROUTE_ACCOMMODATION_FARES, type RoutesValue } from "@/components/schedule-steps/RoutesStep";
import { getCustomPorts } from "@/lib/custom-ports";
import type { Booking } from "@/lib/bookings-data";

// ─────────── Route catalog ───────────
// Each route is a directional origin → destination pair with a nautical-mile distance
// and a typical crossing-duration range. Status drives the pill colour:
//   Active   – running on the regular schedule
//   Inactive – paused but kept on file for re-activation
// Lifecycle of a leg's trip — distinct from the enabled flag (isEnabled).
type RouteStatus = "Scheduled" | "Departed" | "Cancelled";
type Route = {
  id: string;
  /** Short human-friendly reference code (kept for data; ID column shows 1..n). */
  ref: string;
  origin: { code: string; city: string; name?: string };
  destination: { code: string; city: string; name?: string };
  /** Per-accommodation-tier fares offered on this route (tiers + fare only). */
  accommodationFares?: import("@/components/schedule-steps/RoutesStep").RouteAccommodationFare[];
  /** Flat service fee (₱) for this leg, added on top of fares. */
  serviceFee?: number;
  distanceNm: number;       // nautical miles
  durationHrs: [number, number]; // [low, high]
  /** Scheduled date & time of this leg's departure. */
  scheduleAt: Date;
  /** Actual departure timestamp — set via "Set actual departure". */
  departedAt?: Date;
  /** Trip lifecycle: Scheduled → Departed (or Cancelled). */
  status: RouteStatus;
  /** Why the leg was cancelled, captured at cancellation. Cleared when the
      leg is reinstated via "Mark Scheduled". */
  cancelReason?: string;
  /** Enabled flag (the Active/Inactive toggle), independent of lifecycle.
      Submitted to the API as is_enabled. */
  isEnabled: boolean;
  /** Single assigned vessel on this leg (empty string = unassigned). */
  vessel: string;
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
    originCode: portId(r.origin),
    destinationCode: portId(r.destination),
    distanceNm: String(r.distanceNm),
    // Collapse any stored [low, high] range to its average for the single field.
    durationLowHrs: String((r.durationHrs[0] + r.durationHrs[1]) / 2),
    durationHighHrs: String((r.durationHrs[0] + r.durationHrs[1]) / 2),
    status: r.isEnabled ? "Active" : "Inactive",
    accommodationFares: r.accommodationFares ?? DEFAULT_ROUTE_ACCOMMODATION_FARES,
    serviceFee: r.serviceFee != null ? String(r.serviceFee) : "",
  };
}

// Build a scheduled datetime: today (or +dayOffset) at h:00.
function at(hour: number, dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const statusTone: Record<RouteStatus, string> = {
  Scheduled: "bg-blue-100 text-blue-800",
  Departed:  "bg-amber-100 text-amber-800",
  Cancelled: "bg-rose-100 text-rose-700",
};

// Mock catalog — each row is a dated leg with a schedule time, lifecycle
// status, an enabled flag, and a single assigned vessel.
const MOCK_ROUTES: Route[] = [
  // CEB→DGT 8:00 demo: already departed.
  { id: "r1",  ref: "RT-0001", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 42, durationHrs: [3.5, 4],  scheduleAt: at(8), departedAt: at(8), status: "Departed",  isEnabled: true,  vessel: "MV Filipinas Cebu" },
  { id: "r2",  ref: "RT-0002", origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "CEB", city: "Cebu City" },      distanceNm: 42, durationHrs: [3.5, 4],  scheduleAt: at(14), status: "Scheduled", isEnabled: true,  vessel: "MV Filipinas Cebu" },
  { id: "r3",  ref: "RT-0003", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "TAG", city: "Tagbilaran City" },distanceNm: 65, durationHrs: [2, 2.5],  scheduleAt: at(6),  status: "Scheduled", isEnabled: true,  vessel: "FC Sinulog" },
  { id: "r4",  ref: "RT-0004", origin: { code: "TAG", city: "Tagbilaran City" }, destination: { code: "CEB", city: "Cebu City" },      distanceNm: 65, durationHrs: [2, 2.5],  scheduleAt: at(11), status: "Scheduled", isEnabled: true,  vessel: "FC Sinulog" },
  { id: "r5",  ref: "RT-0005", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "ORM", city: "Ormoc City" },     distanceNm: 95, durationHrs: [3.5, 4],  scheduleAt: at(9),  status: "Scheduled", isEnabled: true,  vessel: "MV Reina del Cielo" },
  { id: "r6",  ref: "RT-0006", origin: { code: "ORM", city: "Ormoc City" },      destination: { code: "CEB", city: "Cebu City" },      distanceNm: 95, durationHrs: [3.5, 4],  scheduleAt: at(16), status: "Scheduled", isEnabled: true,  vessel: "MV Reina del Cielo" },
  { id: "r7",  ref: "RT-0007", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "BAC", city: "Bacolod City" },   distanceNm: 80, durationHrs: [4, 5],    scheduleAt: at(7),  status: "Scheduled", isEnabled: true,  vessel: "MV Visayan Star" },
  { id: "r8",  ref: "RT-0008", origin: { code: "BAC", city: "Bacolod City" },    destination: { code: "CEB", city: "Cebu City" },      distanceNm: 80, durationHrs: [4, 5],    scheduleAt: at(13), status: "Scheduled", isEnabled: true,  vessel: "MV Visayan Star" },
  { id: "r9",  ref: "RT-0009", origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "DAP", city: "Dapitan City" },   distanceNm: 38, durationHrs: [2.5, 3],  scheduleAt: at(10), status: "Scheduled", isEnabled: false, vessel: "MV Reina del Cielo" },
  { id: "r10", ref: "RT-0010", origin: { code: "DAP", city: "Dapitan City" },    destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 38, durationHrs: [2.5, 3],  scheduleAt: at(15), status: "Scheduled", isEnabled: false, vessel: "MV Reina del Cielo" },
  { id: "r11", ref: "RT-0011", origin: { code: "BAT", city: "Batangas City" },   destination: { code: "CAL", city: "Calapan City" },   distanceNm: 26, durationHrs: [2.5, 3],  scheduleAt: at(5),  status: "Scheduled", isEnabled: true,  vessel: "MV Maligaya" },
  { id: "r12", ref: "RT-0012", origin: { code: "CAL", city: "Calapan City" },    destination: { code: "BAT", city: "Batangas City" },  distanceNm: 26, durationHrs: [2.5, 3],  scheduleAt: at(10), status: "Scheduled", isEnabled: true,  vessel: "MV Maligaya" },
  { id: "r13", ref: "RT-0013", origin: { code: "MNL", city: "Manila" },          destination: { code: "PPS", city: "Puerto Princesa" },distanceNm: 350,durationHrs: [22, 24], scheduleAt: at(18), status: "Scheduled", isEnabled: true,  vessel: "2GO Masinloc" },
  { id: "r14", ref: "RT-0014", origin: { code: "PPS", city: "Puerto Princesa" }, destination: { code: "MNL", city: "Manila" },         distanceNm: 350,durationHrs: [22, 24], scheduleAt: at(18), status: "Scheduled", isEnabled: true,  vessel: "2GO Masinloc" },
  { id: "r15", ref: "RT-0015", origin: { code: "MNL", city: "Manila" },          destination: { code: "ILO", city: "Iloilo City" },    distanceNm: 250,durationHrs: [18, 20], scheduleAt: at(20), status: "Scheduled", isEnabled: true,  vessel: "2GO Saint Pope John Paul II" },
  { id: "r16", ref: "RT-0016", origin: { code: "ILO", city: "Iloilo City" },     destination: { code: "MNL", city: "Manila" },         distanceNm: 250,durationHrs: [18, 20], scheduleAt: at(20), status: "Scheduled", isEnabled: true,  vessel: "2GO Saint Pope John Paul II" },
  { id: "r17", ref: "RT-0017", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 42, durationHrs: [3.5, 4],  scheduleAt: at(13), status: "Scheduled", isEnabled: true,  vessel: "FC Sinulog" },
  { id: "r18", ref: "RT-0018", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "ORM", city: "Ormoc City" },     distanceNm: 95, durationHrs: [3.5, 4],  scheduleAt: at(15), status: "Scheduled", isEnabled: true,  vessel: "MV Visayan Star" },
  // Same CEB→DGT leg + vessel as RT-0001, later time — its own dated row.
  { id: "r19", ref: "RT-0019", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 42, durationHrs: [3.5, 4],  scheduleAt: at(16), status: "Scheduled", isEnabled: true,  vessel: "MV Filipinas Cebu" },

  // Earlier departures today — exercise the Departed state and the
  // "Departed at" column, which one row alone barely demonstrates.
  { id: "r20", ref: "RT-0020", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "TAG", city: "Tagbilaran City" },distanceNm: 65, durationHrs: [2, 2.5],  scheduleAt: at(5),  departedAt: at(5),  status: "Departed",  isEnabled: true,  vessel: "FC Sinulog" },
  { id: "r21", ref: "RT-0021", origin: { code: "BAT", city: "Batangas City" },   destination: { code: "CAL", city: "Calapan City" },   distanceNm: 26, durationHrs: [2.5, 3],  scheduleAt: at(6),  departedAt: at(6),  status: "Departed",  isEnabled: true,  vessel: "MV Maligaya" },
  { id: "r22", ref: "RT-0022", origin: { code: "BAC", city: "Bacolod City" },    destination: { code: "ILO", city: "Iloilo City" },    distanceNm: 22, durationHrs: [1, 1.5],  scheduleAt: at(7),  departedAt: at(7),  status: "Departed",  isEnabled: true,  vessel: "MV Visayan Star" },

  // Cancelled legs — the tone this status carries is otherwise never rendered.
  { id: "r23", ref: "RT-0023", origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "DAP", city: "Dapitan City" },   distanceNm: 38, durationHrs: [2.5, 3],  scheduleAt: at(12), status: "Cancelled", isEnabled: true,  vessel: "MV Reina del Cielo" },
  { id: "r24", ref: "RT-0024", origin: { code: "ILO", city: "Iloilo City" },     destination: { code: "BAC", city: "Bacolod City" },   distanceNm: 22, durationHrs: [1, 1.5],  scheduleAt: at(17), status: "Cancelled", isEnabled: true,  vessel: "MV Visayan Star" },

  // Late-evening departures today — fill out the tail of the sort order.
  { id: "r25", ref: "RT-0025", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "BAC", city: "Bacolod City" },   distanceNm: 80, durationHrs: [4, 5],    scheduleAt: at(21), status: "Scheduled", isEnabled: true,  vessel: "MV Reina del Cielo" },
  { id: "r26", ref: "RT-0026", origin: { code: "TAG", city: "Tagbilaran City" }, destination: { code: "CEB", city: "Cebu City" },      distanceNm: 65, durationHrs: [2, 2.5],  scheduleAt: at(22), status: "Scheduled", isEnabled: true,  vessel: "FC Sinulog" },

  // Tomorrow — visible once the date filter is widened past today.
  { id: "r27", ref: "RT-0027", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 42, durationHrs: [3.5, 4],  scheduleAt: at(8, 1),  status: "Scheduled", isEnabled: true,  vessel: "MV Filipinas Cebu" },
  { id: "r28", ref: "RT-0028", origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "CEB", city: "Cebu City" },      distanceNm: 42, durationHrs: [3.5, 4],  scheduleAt: at(14, 1), status: "Scheduled", isEnabled: true,  vessel: "MV Filipinas Cebu" },
  { id: "r29", ref: "RT-0029", origin: { code: "MNL", city: "Manila" },          destination: { code: "PPS", city: "Puerto Princesa" },distanceNm: 350,durationHrs: [22, 24], scheduleAt: at(18, 1), status: "Scheduled", isEnabled: true,  vessel: "2GO Masinloc" },
  { id: "r30", ref: "RT-0030", origin: { code: "BAT", city: "Batangas City" },   destination: { code: "CAL", city: "Calapan City" },   distanceNm: 26, durationHrs: [2.5, 3],  scheduleAt: at(5, 1),  status: "Scheduled", isEnabled: false, vessel: "MV Maligaya" },

  // Yesterday — completed legs, so the sort's descending default has history
  // to fall back to.
  { id: "r31", ref: "RT-0031", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "ORM", city: "Ormoc City" },     distanceNm: 95, durationHrs: [3.5, 4],  scheduleAt: at(9, -1),  departedAt: at(9, -1),  status: "Departed",  isEnabled: true,  vessel: "MV Reina del Cielo" },
  { id: "r32", ref: "RT-0032", origin: { code: "ORM", city: "Ormoc City" },      destination: { code: "CEB", city: "Cebu City" },      distanceNm: 95, durationHrs: [3.5, 4],  scheduleAt: at(16, -1), departedAt: at(16, -1), status: "Departed",  isEnabled: true,  vessel: "MV Reina del Cielo" },
  { id: "r33", ref: "RT-0033", origin: { code: "MNL", city: "Manila" },          destination: { code: "ILO", city: "Iloilo City" },    distanceNm: 250,durationHrs: [18, 20], scheduleAt: at(20, -1), status: "Cancelled", isEnabled: true,  vessel: "2GO Saint Pope John Paul II" },
];

const DEFAULT_PAGE_SIZE = 10;

function PortCell({ city, name }: { code?: string; city: string; name?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[13.5px] font-medium tracking-tight text-slate-900">{name ?? city}</span>
      {name && <span className="text-[11px] text-slate-400">{city}</span>}
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

// Square checkbox used by the header and every row. Wraps a real <input> so
// keyboard and screen-reader behaviour is native; the visual is drawn on top.
function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        // `indeterminate` isn't an HTML attribute — it has to be set on the
        // node, so drive it through a ref callback.
        ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked; }}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={
          "grid h-4 w-4 place-items-center rounded-[5px] border transition-colors duration-150 " +
          (checked || indeterminate
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-slate-300 bg-white text-transparent hover:border-slate-400")
        }
      >
        {checked ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
            <path d="M5 12l5 5 9-11" />
          </svg>
        ) : indeterminate ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className="h-2.5 w-2.5">
            <path d="M6 12h12" />
          </svg>
        ) : null}
      </span>
    </label>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300">
      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Direction arrow on the column the table is currently sorted by. Only the
// active column renders one, so the arrow doubles as the sort indicator.
function SortArrow({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${dir === "asc" ? "rotate-180" : ""}`}
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

export default function RoutesPage() {
  const { active } = useShippingLine();
  const { showToast } = useToast();
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  // Schedule sort direction — newest first by default, so the most relevant
  // departures lead. Clicking the header toggles it.
  const [scheduleSort, setScheduleSort] = useState<"asc" | "desc">("desc");
  // Voyage lifecycle (Scheduled/Departed/…) from the route's next voyage.
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  // Enabled state — Active / Inactive.
  const [activeFilter, setActiveFilter] = useState<string>("all");
  // Date & time window — defaults to today.
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return { start: d, end: d };
  });
  // Actual-departure window. Unset by default — legs that haven't sailed have
  // no departedAt, so defaulting this to today would hide every Scheduled row.
  const [departedRange, setDepartedRange] = useState<OptionalDateRange>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // Route whose vessel/departure schedule dialog is open (null = closed).
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  // Bulk selection — ids of checked rows. Kept as a Set so the header
  // checkbox and per-row state stay O(1) as the page grows.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Confirmation for the bulk disable — disabling pulls legs off sale, so it
  // asks first, same as the single-route action does.
  const [bulkDisableOpen, setBulkDisableOpen] = useState(false);

  // Route whose vessel is being reassigned via the standalone dialog.
  const [assignRoute, setAssignRoute] = useState<Route | null>(null);
  // Route pending an enable/disable confirmation.
  const [statusRoute, setStatusRoute] = useState<Route | null>(null);
  const router = useRouter();

  // "Manage schedule" → jump to the Voyages page pre-filtered by this route's
  // origin port and (optionally) a specific vessel.
  const goToVoyages = (route: Route, vessel?: string) => {
    const params = new URLSearchParams({ origin: route.origin.code });
    if (vessel) params.set("vessel", vessel);
    router.push(`/voyages?${params.toString()}`);
  };

  // Hydrate from localStorage if the operator has saved edits before;
  // otherwise fall through to the seeded mock and persist that snapshot.
  // A corrupted store falls through too — a stale shape shouldn't brick
  // the page.
  useEffect(() => {
    let cancelled = false;
    setRoutes(null);
    // Bump when MOCK_ROUTES changes so an updated seed re-applies instead of a
    // stale cached copy lingering in localStorage.
    const SEED_VERSION = "2026-08-13-assigned-vessels";
    // The seed dates every leg relative to "today", so a copy persisted on an
    // earlier day carries stale dates — and the date filter (which defaults to
    // today) would hide every row. Re-seed when the cached copy is from another
    // day so the demo data always lands in the visible window.
    const todayKey = new Date().toDateString();
    try {
      const seededVersion = window.localStorage.getItem("tripket.routes-seed-version");
      const seededDay = window.localStorage.getItem("tripket.routes-seed-day");
      const persisted = loadStore<Route[]>("routes", active.id);
      if (persisted && Array.isArray(persisted) && seededVersion === SEED_VERSION && seededDay === todayKey) {
        // Revive Date fields after the JSON round-trip.
        const revived = persisted.map((r) => ({
          ...r,
          scheduleAt: new Date(r.scheduleAt),
          departedAt: r.departedAt ? new Date(r.departedAt) : undefined,
        }));
        if (revived.length > 0) { setRoutes(revived); return; }
      }
    } catch { /* fall through to mock */ }
    const t = setTimeout(() => {
      if (cancelled) return;
      setRoutes(MOCK_ROUTES);
      saveStore("routes", active.id, MOCK_ROUTES);
      try {
        window.localStorage.setItem("tripket.routes-seed-version", SEED_VERSION);
        window.localStorage.setItem("tripket.routes-seed-day", todayKey);
      } catch { /* ignore */ }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [active.id]);

  // Wrap setRoutes so every mutation persists.
  const updateRoutes = (next: (prev: Route[]) => Route[]) => {
    setRoutes(prev => {
      const value = next(prev ?? []);
      saveStore("routes", active.id, value);
      return value;
    });
  };

  // Toggle a route's enabled flag (no deletion — kept on file, re-enableable).
  const toggleRouteStatus = (id: string) =>
    updateRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r)),
    );

  // Disable every selected leg that's still enabled. Legs with confirmed
  // bookings are skipped — the single-route action already refuses those, and
  // a bulk path shouldn't be a way around that guard.
  const bulkDisable = () => {
    const targets = selectedOnPage.filter((r) => r.isEnabled && !hasConfirmed(r));
    const blocked = selectedOnPage.filter((r) => r.isEnabled && hasConfirmed(r)).length;
    const ids = new Set(targets.map((r) => r.id));
    if (ids.size > 0) {
      updateRoutes((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, isEnabled: false } : r)));
    }
    showToast(
      ids.size === 0
        ? "No routes disabled — the selected legs have confirmed bookings or are already disabled."
        : `${ids.size} route${ids.size === 1 ? "" : "s"} disabled` +
          (blocked > 0 ? ` · ${blocked} skipped (confirmed bookings)` : ""),
    );
    setSelected(new Set());
    setBulkDisableOpen(false);
  };

  // Mark the leg's actual departure: stamp departedAt + set status Departed.
  const [departRoute, setDepartRoute] = useState<Route | null>(null);
  const confirmActualDeparture = (id: string, when: Date) =>
    updateRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Departed", departedAt: when } : r)),
    );

  // Undo a departure marked in error — clears the actual departure timestamp
  // along with the status, so the leg reads as never having sailed.
  const markScheduled = (id: string) =>
    updateRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Scheduled", departedAt: undefined, cancelReason: undefined } : r)),
    );

  // Cancel a trip/leg — opens a dialog listing the leg's bookings with a batch
  // "mark refunded" action (refunds happen manually). Completing it sets the
  // route Cancelled and flips the leg's bookings + tickets to Refunded.
  const [cancelRoute, setCancelRoute] = useState<Route | null>(null);
  // Same dialog in refund-only mode, for an already-cancelled leg.
  const [refundRoute, setRefundRoute] = useState<Route | null>(null);

  // Mark every not-yet-refunded booking on this leg (and its tickets)
  // Refunded. Shared by the cancel flow and the standalone "Refund bookings"
  // action, which re-runs it for anything booked after the cancellation.
  // Returns how many bookings it moved so callers can report it.
  const refundLegBookings = (route: Route): number => {
    const o = route.origin.code, d = route.destination.code;
    let moved = 0;
    try {
      const bookings = loadStore<Booking[]>("bookings", active.id);
      if (bookings && Array.isArray(bookings)) {
        const next = bookings.map((b) => {
          // Already-refunded bookings are left alone so the count reflects
          // real work rather than re-reporting settled ones.
          if (b.routeOriginCode !== o || b.routeDestinationCode !== d) return b;
          if (b.status === "Refunded") return b;
          moved++;
          return {
            ...b,
            status: "Refunded" as const,
            paymentStatus: "Refunded" as const,
            tickets: b.tickets.map((t) => ({ ...t, status: "Refunded" as const })),
          };
        });
        if (moved > 0) saveStore("bookings", active.id, next);
      }
    } catch { /* ignore — store may be empty */ }
    return moved;
  };

  // Confirming the cancel dialog marks the route Cancelled with its reason,
  // then hands straight off to the refund dialog so the leg's bookings get
  // settled in the same sitting — cancelling a leg strands paid passengers, so
  // refunding shouldn't be something the admin has to remember separately.
  const completeCancel = (route: Route, reason: string) => {
    updateRoutes((prev) =>
      prev.map((r) => (r.id === route.id ? { ...r, status: "Cancelled" as const, cancelReason: reason } : r)),
    );
    setCancelRoute(null);
    setRefundRoute(route);
  };

  // Standalone refund for an already-cancelled leg — catches bookings that
  // weren't refunded when it was cancelled. Confirmed through the same dialog
  // the cancel flow uses, so the admin sees exactly what's being settled.
  const completeRefund = (route: Route) => {
    const moved = refundLegBookings(route);
    showToast(
      moved > 0
        ? `${moved} booking${moved === 1 ? "" : "s"} marked Refunded`
        : "No bookings left to refund on this leg",
    );
    setRefundRoute(null);
  };

  // Reset to page 1 whenever filters change so users don't land on an empty later page.
  useEffect(() => { setPage(1); }, [originFilter, destinationFilter, lifecycleFilter, activeFilter, dateRange, departedRange, scheduleSort]);
  // Drop the selection whenever the visible set changes — acting on rows the
  // operator can no longer see would be a nasty surprise.
  useEffect(() => {
    setSelected(new Set());
  }, [originFilter, destinationFilter, lifecycleFilter, activeFilter, dateRange, departedRange, scheduleSort, page]);

  // Origin / destination options from the catalog cities, alphabetized.
  const originOptions = useMemo(() => {
    const c = new Set<string>();
    (routes ?? []).forEach((r) => c.add(r.origin.name ?? r.origin.city));
    return [{ value: "all", label: "All origins" }, ...Array.from(c).sort().map((x) => ({ value: x, label: x }))];
  }, [routes]);
  const destinationOptions = useMemo(() => {
    const c = new Set<string>();
    (routes ?? []).forEach((r) => c.add(r.destination.name ?? r.destination.city));
    return [{ value: "all", label: "All destinations" }, ...Array.from(c).sort().map((x) => ({ value: x, label: x }))];
  }, [routes]);

  // Set of "origin-destination" keys that have ≥1 CONFIRMED booking. Admin
  // can't change the vessel or disable a route once a leg has confirmed
  // bookings. Read from the bookings store for the active line.
  const legsWithConfirmed = useMemo(() => {
    const s = new Set<string>();
    try {
      const all = loadStore<Booking[]>("bookings", active.id) ?? [];
      for (const b of all) {
        if (b.status === "Confirmed") s.add(`${b.routeOriginCode}-${b.routeDestinationCode}`);
      }
    } catch { /* empty store */ }
    return s;
  }, [active.id]);
  const hasConfirmed = (r: Route) => legsWithConfirmed.has(`${r.origin.code}-${r.destination.code}`);

  // Count of non-default filters — shown on the Filters button.
  const todayRange = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const isDefaultDate =
    dateRange.start?.getTime() === todayRange.getTime() && dateRange.end?.getTime() === todayRange.getTime();
  const activeFilterCount =
    (originFilter !== "all" ? 1 : 0) +
    (destinationFilter !== "all" ? 1 : 0) +
    (lifecycleFilter !== "all" ? 1 : 0) +
    (activeFilter !== "all" ? 1 : 0) +
    (departedRange ? 1 : 0) +
    (isDefaultDate ? 0 : 1);

  const filtered = useMemo(() => {
    if (!routes) return [];
    return routes.filter((r) => {
      if (activeFilter !== "all" && (activeFilter === "Active") !== r.isEnabled) return false;
      if (originFilter !== "all" && (r.origin.name ?? r.origin.city) !== originFilter) return false;
      if (destinationFilter !== "all" && (r.destination.name ?? r.destination.city) !== destinationFilter) return false;
      if (lifecycleFilter !== "all" && r.status !== lifecycleFilter) return false;
      // Date & time window — match the leg's scheduled day within [start, end].
      if (dateRange.start && dateRange.end) {
        const day = new Date(r.scheduleAt); day.setHours(0, 0, 0, 0);
        const from = new Date(dateRange.start); from.setHours(0, 0, 0, 0);
        const to = new Date(dateRange.end); to.setHours(0, 0, 0, 0);
        if (day < from || day > to) return false;
      }
      // Actual-departure window. Only applies when set — and a leg that never
      // sailed has no departedAt, so it can't fall inside any window.
      if (departedRange) {
        if (!r.departedAt) return false;
        const day = new Date(r.departedAt); day.setHours(0, 0, 0, 0);
        const from = new Date(departedRange.start); from.setHours(0, 0, 0, 0);
        const to = new Date(departedRange.end); to.setHours(0, 0, 0, 0);
        if (day < from || day > to) return false;
      }
      return true;
    })
      // .filter() already returned a fresh array, so sorting in place here
      // doesn't mutate `routes`.
      .sort((a, b) => {
        const delta = a.scheduleAt.getTime() - b.scheduleAt.getTime();
        return scheduleSort === "asc" ? delta : -delta;
      });
  }, [routes, originFilter, destinationFilter, lifecycleFilter, activeFilter, dateRange, departedRange, scheduleSort]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Selection is scoped to the rows currently on screen — a filter or page
  // change shouldn't leave invisible rows queued for a bulk action.
  const selectedOnPage = pageRows.filter((r) => selected.has(r.id));
  const allOnPageSelected = pageRows.length > 0 && selectedOnPage.length === pageRows.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRows.forEach((r) => next.delete(r.id));
      else pageRows.forEach((r) => next.add(r.id));
      return next;
    });

  return (
    <div>
      <PageHeader
        title="Routes"
       
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
            </div>

            {/* With a selection live, the bulk action takes the toolbar slot —
                it's the only thing the operator is here to do at that point. */}
            {selectedOnPage.length > 0 ? (
              <button
                type="button"
                onClick={() => setBulkDisableOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-rose-600 transition-colors duration-150 hover:bg-rose-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M5.6 5.6l12.8 12.8" />
                </svg>
                Disable routes
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-rose-500 px-1.5 font-mono text-[11px] font-bold tabular-nums text-white">
                  {selectedOnPage.length}
                </span>
              </button>
            ) : (
              <FiltersButton onClick={() => setFiltersOpen(true)} activeCount={activeFilterCount} />
            )}
          </div>

          {/* Selection banner — sits between toolbar and table, mirroring the
              row highlight so the count and the highlighted rows read together. */}
          {selectedOnPage.length > 0 && (
            <div className="flex items-center gap-3 border-b border-brand-100 bg-brand-50/60 px-5 py-2.5">
              <SelectCheckbox
                checked={allOnPageSelected}
                indeterminate={someOnPageSelected}
                onChange={toggleAllOnPage}
                label="Select all routes on this page"
              />
              <span className="text-[13px] font-semibold tracking-tight text-slate-800">
                {selectedOnPage.length} route{selectedOnPage.length === 1 ? "" : "s"} selected
              </span>
              <span aria-hidden className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[13px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Table */}
          <div>
            <table className="w-full text-sm">
              {/* Headers give way to the selection banner while rows are
                  checked — the banner already carries the select-all control,
                  so keeping both would duplicate it. */}
              <thead className={selectedOnPage.length > 0 ? "hidden" : undefined}>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="w-10 px-5 py-2.5 font-medium">
                    <SelectCheckbox
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onChange={toggleAllOnPage}
                      label="Select all routes on this page"
                    />
                  </th>
                  <th className="px-5 py-2.5 font-medium">Id</th>
                  <th className="px-5 py-2.5 font-medium">
                    <button
                      type="button"
                      onClick={() => setScheduleSort((d) => (d === "desc" ? "asc" : "desc"))}
                      aria-label={`Sort by schedule, ${scheduleSort === "desc" ? "newest" : "oldest"} first`}
                      className="inline-flex items-center gap-1.5 uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-700"
                    >
                      Schedule
                      <SortArrow dir={scheduleSort} />
                    </button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">Origin</th>
                  <th className="px-5 py-2.5 font-medium">Destination</th>
                  <th className="px-5 py-2.5 font-medium">Vessel</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Departed at</th>
                  <th className="px-5 py-2.5 font-medium text-center">Active</th>
                  <th className="px-5 py-2.5 font-medium">Distance</th>
                  <th className="px-5 py-2.5 font-medium">Duration</th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50/70 px-5 py-2.5 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-5 py-12 text-center text-sm text-slate-400">
                      No routes match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((r, i) => {
                  const isSelected = selected.has(r.id);
                  return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                    onClick={() => toggleOne(r.id)}
                    className={
                      "group cursor-pointer transition-colors duration-150 " +
                      (isSelected ? "bg-brand-50/50" : "hover:bg-slate-50/60")
                    }
                  >
                    {/* The row owns the click, so the checkbox only needs to
                        stop it bubbling — otherwise the two would cancel out. */}
                    <td
                      className="relative w-10 px-5 py-3.5 align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Selected rows keep the accent bar pinned rather than
                          revealing it on hover. */}
                      <span className={
                        "absolute left-0 top-0 h-full w-[3px] origin-top bg-brand-500 transition-transform duration-200 ease-out " +
                        (isSelected ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100")
                      } />
                      <SelectCheckbox
                        checked={isSelected}
                        onChange={() => toggleOne(r.id)}
                        label={`Select route ${r.ref}`}
                      />
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <span className="font-mono text-[12.5px] tabular-nums text-slate-500">{(page - 1) * pageSize + i + 1}</span>
                    </td>
                    <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                      <div className="text-[12.5px] tabular-nums text-slate-900">{fmtDateTime(r.scheduleAt)}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">({fmtWeekday(r.scheduleAt)})</div>
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
                      {r.vessel ? (
                        <span className="text-[13px] font-medium tracking-tight text-slate-900 whitespace-nowrap">{r.vessel}</span>
                      ) : (
                        <span className="text-[12px] text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                      {r.departedAt ? (
                        <span className="text-[12.5px] tabular-nums text-slate-900">{fmtDateTime(r.departedAt)}</span>
                      ) : (
                        <span className="text-[12px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {r.isEnabled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M5 12l5 5L20 7" /></svg>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 align-middle tabular-nums">
                      <span className="font-semibold text-slate-900">{r.distanceNm}</span>
                      <span className="ml-1 text-[11px] text-slate-400">nm</span>
                    </td>
                    <td className="px-5 py-3.5 align-middle tabular-nums">
                      <span className="font-semibold text-slate-900">{(r.durationHrs[0] + r.durationHrs[1]) / 2}</span>
                      <span className="ml-1 text-[11px] text-slate-400">hrs avg</span>
                    </td>
                    <td
                      className="sticky right-0 z-10 bg-white/70 px-5 py-3 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors duration-150 group-hover:bg-slate-50/70"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenu
                        ariaLabel={`Actions for ${r.origin.name ?? r.origin.city} → ${r.destination.name ?? r.destination.city}`}
                        items={[
                          // Departure toggles: a Scheduled leg can be marked
                          // Departed; a Departed one walked back if it was
                          // logged in error; and a Cancelled one reinstated —
                          // both non-Scheduled states return the same way.
                          r.status === "Departed" || r.status === "Cancelled"
                            ? {
                                label: "Mark Scheduled",
                                tone: "warning" as const,
                                onClick: () => markScheduled(r.id),
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                    <path d="M19 12H6M11 6l-6 6 6 6" />
                                  </svg>
                                ),
                              }
                            : {
                                label: "Mark Departed",
                                tone: "success" as const,
                                // Only meaningful while still Scheduled.
                                disabled: r.status !== "Scheduled",
                                onClick: () => setDepartRoute(r),
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                    <path d="M5 12h13M13 6l6 6-6 6" />
                                  </svg>
                                ),
                              },
                          {
                            label: "Assign vessel",
                            // Locked once the leg has confirmed bookings.
                            disabled: r.status !== "Scheduled" || hasConfirmed(r),
                            onClick: () => setAssignRoute(r),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z" />
                                <path d="M5 14V8a1 1 0 0 1 1-1h7l5 4" />
                                <path d="M9 7V4h2" />
                              </svg>
                            ),
                          },
                          r.isEnabled
                            ? {
                                label: "Disable route",
                                danger: true,
                                // Can't disable once the leg has confirmed bookings.
                                disabled: hasConfirmed(r),
                                onClick: () => setStatusRoute(r),
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M5.6 5.6l12.8 12.8" />
                                  </svg>
                                ),
                              }
                            : {
                                label: "Enable route",
                                tone: "success" as const,
                                onClick: () => setStatusRoute(r),
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                ),
                              },
                          {
                            label: r.status === "Cancelled" ? "Cancelled" : "Cancel route",
                            danger: true,
                            disabled: r.status === "Cancelled" || r.status === "Departed",
                            onClick: () => setCancelRoute(r),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M15 9l-6 6M9 9l6 6" />
                              </svg>
                            ),
                          },
                          // Only meaningful once a leg is cancelled — it sweeps
                          // up bookings made before the cancellation that
                          // haven't been refunded yet.
                          ...(r.status === "Cancelled"
                            ? [{
                                label: "Refund bookings",
                                tone: "warning" as const,
                                onClick: () => setRefundRoute(r),
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
                                    <path d="M2.5 10h19" />
                                  </svg>
                                ),
                              }]
                            : []),
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
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage} onPageSizeChange={setPageSize}
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
          const all = [...PORTS, ...getCustomPorts()];
          const origin = findPort(all, payload.originCode);
          const destination = findPort(all, payload.destinationCode);
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
            scheduleAt: at(8),
            status: "Scheduled",
            isEnabled: payload.status !== "Inactive",
            vessel: "",
            accommodationFares: payload.accommodationFares,
            serviceFee: payload.serviceFee ? Number(payload.serviceFee) : undefined,
          };
          updateRoutes((prev) => [newRoute, ...prev]);
        }}
      />

      {/* ── Edit-route dialog ── reuses CreateRouteModal in edit mode. The
          row's "Assign vessel" action opens the same dialog but with the
          assigned-vessels panel rendered alongside the form. */}
      <CreateRouteModal
        open={!!editRoute}
        onClose={() => setEditRoute(null)}
        editValue={editRoute ? routeToValue(editRoute) : null}
        onSave={(payload) => {
          if (!editRoute) return;
          const all = [...PORTS, ...getCustomPorts()];
          const origin = findPort(all, payload.originCode);
          const destination = findPort(all, payload.destinationCode);
          if (!origin || !destination) return;
          const lo = Number(payload.durationLowHrs) || 0;
          const hi = Number(payload.durationHighHrs) || lo;
          const nextVessel = editRoute.vessel;
          updateRoutes((prev) =>
            prev.map((r) =>
              r.id === editRoute.id
                ? {
                    ...r,
                    origin,
                    destination,
                    distanceNm: Number(payload.distanceNm) || 0,
                    durationHrs: [lo, hi],
                    isEnabled: payload.status ? payload.status !== "Inactive" : r.isEnabled,
                    vessel: nextVessel,
                    accommodationFares: payload.accommodationFares ?? r.accommodationFares,
                    serviceFee: payload.serviceFee != null && payload.serviceFee !== "" ? Number(payload.serviceFee) : r.serviceFee,
                  }
                : r
            )
          );
        }}
        editMode="edit"
      />

      <BulkDisableRoutesDialog
        open={bulkDisableOpen}
        count={selectedOnPage.length}
        origin={originFilter === "all" ? null : originFilter}
        destination={destinationFilter === "all" ? null : destinationFilter}
        dateFrom={dateRange.start}
        // The filter matches the whole end day, so show it as inclusive
        // (23:59) rather than the midnight the range actually stores.
        dateTo={dateRange.end ? new Date(new Date(dateRange.end).setHours(23, 59, 0, 0)) : null}
        onClose={() => setBulkDisableOpen(false)}
        onConfirm={bulkDisable}
      />

      <AssignVesselDialog
        open={!!assignRoute}
        currentVessel={assignRoute?.vessel ?? ""}
        onClose={() => setAssignRoute(null)}
        onAssign={(vessel) => {
          if (!assignRoute) return;
          updateRoutes((prev) => prev.map((r) => (r.id === assignRoute.id ? { ...r, vessel } : r)));
          showToast(`Vessel assigned to ${assignRoute.origin.name ?? assignRoute.origin.city} → ${assignRoute.destination.name ?? assignRoute.destination.city}`);
          setAssignRoute(null);
        }}
      />

      <RouteStatusDialog
        open={!!statusRoute}
        label={statusRoute ? `${statusRoute.origin.name ?? statusRoute.origin.city} → ${statusRoute.destination.name ?? statusRoute.destination.city}` : ""}
        mode={statusRoute?.isEnabled ? "disable" : "enable"}
        onClose={() => setStatusRoute(null)}
        onConfirm={() => { if (statusRoute) toggleRouteStatus(statusRoute.id); }}
      />

      <CancelConfirmDialog
        targetRef={cancelRoute ? `${cancelRoute.origin.name ?? cancelRoute.origin.city} → ${cancelRoute.destination.name ?? cancelRoute.destination.city}` : null}
        noun="route"
        reasons={ROUTE_CANCEL_REASONS}
        title="Mark this route as 'Cancelled'?"
        body={
          <>
            Route{" "}
            <span className="font-semibold text-slate-700">
              &lsquo;{cancelRoute ? `${cancelRoute.origin.name ?? cancelRoute.origin.city} → ${cancelRoute.destination.name ?? cancelRoute.destination.city}` : ""}&rsquo;
            </span>{" "}
            will be marked <span className="font-semibold text-rose-600">Cancelled</span>.
            You&rsquo;ll refund its bookings next.
          </>
        }
        confirmLabel="Mark Cancelled"
        dismissLabel="Cancel"
        onClose={() => setCancelRoute(null)}
        onConfirm={(reason) => { if (cancelRoute) completeCancel(cancelRoute, reason); }}
      />

      <CancelRouteDialog
        route={refundRoute}
        lineId={active.id}
        mode="refund"
        onComplete={completeRefund}
        onClose={() => setRefundRoute(null)}
      />

      <SetDepartureDialog
        route={departRoute}
        onConfirm={confirmActualDeparture}
        onClose={() => setDepartRoute(null)}
      />

      <FiltersDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        activeCount={activeFilterCount}
        fields={[
          { kind: "dateRange", key: "date", label: "Schedule", value: dateRange, onChange: setDateRange, defaultValue: { start: todayRange, end: todayRange } },
          { kind: "optionalDateRange", key: "departed", label: "Departed", value: departedRange, onChange: setDepartedRange, defaultValue: null, placeholder: "Select date range" },
          { kind: "select", key: "origin", label: "Origin", value: originFilter, options: originOptions, onChange: setOriginFilter, defaultValue: "all" },
          { kind: "select", key: "destination", label: "Destination", value: destinationFilter, options: destinationOptions, onChange: setDestinationFilter, defaultValue: "all" },
          { kind: "select", key: "lifecycle", label: "Status", value: lifecycleFilter, onChange: setLifecycleFilter, defaultValue: "all",
            options: [
              { value: "all", label: "All statuses" },
              { value: "Scheduled", label: "Scheduled" },
              { value: "Departed", label: "Departed" },
              { value: "Cancelled", label: "Cancelled" },
            ] },
          { kind: "select", key: "active", label: "Active / Inactive", value: activeFilter, onChange: setActiveFilter, defaultValue: "all",
            options: [
              { value: "all", label: "All" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ] },
        ]}
      />
    </div>
  );
}


// Date + time label for the Schedule / Departed-at columns, e.g. "Jun 23, 8:00 AM".
function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// Weekday shown under the schedule date — ferry crews and admins think in
// "the Thursday run", so the day name saves a mental lookup off the date.
function fmtWeekday(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

// ─────────── SetDepartureDialog ───────────
// Confirms the leg's actual departure time (defaults to now) and flips the
// route status to Departed.
function SetDepartureDialog({
  route, onConfirm, onClose,
}: {
  route: Route | null;
  onConfirm: (id: string, when: Date) => void;
  onClose: () => void;
}) {
  const [when, setWhen] = useState("");
  useEffect(() => {
    if (!route) return;
    // Default to now, formatted for <input type="datetime-local">.
    const n = new Date();
    n.setSeconds(0, 0);
    const pad = (x: number) => String(x).padStart(2, "0");
    setWhen(`${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`);
  }, [route]);

  if (!route) return null;
  const legLabel = `${route.origin.name ?? route.origin.city} → ${route.destination.name ?? route.destination.city}`;

  return (
    <Modal open={!!route} onClose={onClose} maxWidth="max-w-md">
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-start gap-4">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">Set actual departure</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              <span className="font-medium text-slate-900">{legLabel}</span> will be marked
              <span className="font-medium text-slate-900"> Departed</span> at the time below.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Actual departure</label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-900 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
        <button type="button" onClick={onClose} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="button"
          disabled={!when}
          onClick={() => { onConfirm(route.id, new Date(when)); onClose(); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark departed
        </button>
      </div>
    </Modal>
  );
}

// ─────────── CancelRouteDialog ───────────
// Lists the bookings under a leg with a single batch "mark refunded" action
// (refunds are manual). Completing flips the bookings/tickets to Refunded and
// cancels the route; closing without completing flags the route Action needed.
function CancelRouteDialog({
  route,
  lineId,
  mode = "cancel",
  onComplete,
  onClose,
}: {
  route: Route | null;
  lineId: string;
  /** "cancel" refunds the leg's bookings and cancels it; "refund" only settles
   *  the bookings, leaving the leg's status alone (it's already Cancelled). */
  mode?: "cancel" | "refund";
  /** Refund all the leg's bookings + cancel cleanly. */
  onComplete: (r: Route) => void;
  /** Plain dismiss — no change. */
  onClose: () => void;
}) {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [bkPage, setBkPage] = useState(1);

  useEffect(() => {
    if (!route) { setBkPage(1); return; }
    setBkPage(1);
    const o = route.origin.code, d = route.destination.code;
    try {
      const all = loadStore<Booking[]>("bookings", lineId) ?? [];
      const found = all.filter((b) => b.routeOriginCode === o && b.routeDestinationCode === d);
      // Demo: if a leg has no bookings in the store, show a few sample ones so
      // the cancel/refund flow is presentable. (Remove for production data.)
      setAllBookings(found.length > 0 ? found : sampleLegBookings(route));
    } catch {
      setAllBookings(sampleLegBookings(route));
    }
  }, [route, lineId]);

  if (!route) return null;

  const isRefund = mode === "refund";
  const legLabel = `${route.origin.name ?? route.origin.city} → ${route.destination.name ?? route.destination.city}`;
  const toRefund = allBookings.filter((b) => b.status !== "Refunded");
  // Cancelling shows the whole manifest for context; refunding an already-
  // cancelled leg shows only what it will actually change.
  const bookings = isRefund ? toRefund : allBookings;
  const totalAmount = toRefund.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPax = bookings.reduce((s, b) => s + (b.pax || 0), 0);

  const PER_PAGE = 12;
  const pageCount = Math.max(1, Math.ceil(bookings.length / PER_PAGE));
  const safePage = Math.min(bkPage, pageCount);
  const pageBookings = bookings.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <Modal open={!!route} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex h-[80vh] max-h-[80vh] flex-col">
        <div className="border-b border-slate-100 px-6 pb-4 pt-6">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className={
                "grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 " +
                (isRefund
                  ? "bg-amber-50 text-amber-600 ring-amber-200/70"
                  : "bg-rose-50 text-rose-600 ring-rose-200/70")
              }
            >
              {isRefund ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                  <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
                  <path d="M2.5 10h19" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">
                {isRefund ? "Refund bookings on this trip?" : "Cancel this trip?"}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                {isRefund ? (
                  <>
                    <span className="font-medium text-slate-900">{legLabel}</span> is already cancelled.
                    The bookings below haven&rsquo;t been refunded yet. Refunds are processed manually —
                    this records them as refunded in the system.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-900">{legLabel}</span> will be cancelled.
                    Refund the bookings below, then confirm. Refunds are processed manually —
                    this records them as refunded in the system.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center text-[12.5px] text-slate-400">
              {isRefund
                ? "No bookings on this leg — nothing left to refund."
                : "No bookings on this leg. The trip can be cancelled cleanly."}
            </div>
          ) : (
            <>
              {/* Summary — bookings · pax · total to refund. */}
              <div className="mb-3 grid grid-cols-3 gap-2">
                <SummaryStat label="Bookings" value={bookings.length.toLocaleString()} />
                <SummaryStat label="Passengers" value={totalPax.toLocaleString()} />
                <SummaryStat label="To refund" value={`₱${totalAmount.toLocaleString()}`} />
              </div>

              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {pageBookings.map((b) => (
                  <div key={b.ref} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium tracking-tight text-slate-900">{b.ticketholder}</div>
                      <div className="font-mono text-[10.5px] text-slate-400">{b.ref} · {b.pax} pax</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-[12px] tabular-nums text-slate-600">₱{(b.amount || 0).toLocaleString()}</span>
                      <span className={
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                        (b.status === "Refunded" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")
                      }>
                        {b.status === "Refunded" ? "Refunded" : "To Refund"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pager — only when more than one page. */}
              {pageCount > 1 && (
                <div className="mt-3 flex items-center justify-between text-[12px] text-slate-500">
                  <span>
                    Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, bookings.length)} of {bookings.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBkPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="px-1 tabular-nums">{safePage} / {pageCount}</span>
                    <button
                      type="button"
                      onClick={() => setBkPage((p) => Math.min(pageCount, p + 1))}
                      disabled={safePage >= pageCount}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            // In refund mode there's nothing to do without unrefunded bookings.
            disabled={isRefund && toRefund.length === 0}
            onClick={() => onComplete(route)}
            className={
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors " +
              (isRefund
                ? (toRefund.length === 0
                    ? "cursor-not-allowed bg-amber-300"
                    : "bg-amber-600 hover:bg-amber-700")
                : "bg-rose-600 hover:bg-rose-700")
            }
          >
            {isRefund
              ? "Mark all refunded"
              : bookings.length === 0 ? "Cancel trip" : "Mark all refunded & cancel"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Compact stat tile for the cancel dialog's summary row.
function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <div className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

// Demo-only — synthesize sample bookings for a leg that has none in the store,
// so the cancel/refund modal is presentable at realistic volume (and the
// pager has something to page through). Remove once real bookings flow in.
function sampleLegBookings(route: Route): Booking[] {
  const first = ["Maria", "Juan", "Andrea", "Mark", "Liza", "Paolo", "Grace", "Noel", "Faith", "Rico", "Ella", "Dan"];
  const last = ["Santos", "dela Cruz", "Reyes", "Villanueva", "Mendoza", "Aquino", "Tan", "Lim", "Cruz", "Garcia"];
  const o = route.origin.code, d = route.destination.code;
  const oc = route.origin.city, dc = route.destination.city;
  const COUNT = 28;
  return Array.from({ length: COUNT }, (_, i) => {
    const pax = 1 + (i % 4);
    return {
      ref: `BK-${o}${d}-${String(i + 1).padStart(3, "0")}`,
      ticketholder: `${first[i % first.length]} ${last[(i * 3) % last.length]}`,
      pax,
      routeOriginCode: o,
      routeDestinationCode: d,
      routeOriginCity: oc,
      routeDestinationCity: dc,
      amount: 850 * pax,
      status: "Confirmed",
      tickets: [],
    } as unknown as Booking;
  });
}
