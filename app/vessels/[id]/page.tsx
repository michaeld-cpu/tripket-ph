"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useShippingLine } from "@/components/ShippingLineContext";
import {
  fetchDashboardData,
  type Vessel,
  type VehicleClass,
  type PassengerType,
} from "@/lib/dashboard-data";
import EditVesselModal from "@/components/EditVesselModal";
import DeleteVesselDialog from "@/components/DeleteVesselDialog";
import VoyageCard from "@/components/VoyageCard";
import { loadStore, saveStore } from "@/lib/persisted-store";

// Shared design tokens — one source of truth for chrome / typography across all cards on this page.
const CARD = "overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70";
const SECTION_HEADER = "border-b border-slate-100 px-5 py-3.5";

// Vessel initials — mirrors the helper on the vessels table page so the avatar reads consistently.
function vesselInitials(name: string): string {
  const cleaned = name.replace(/^MV\.?\s+/i, "").trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0 && !/^(of|the|and)$/i.test(w));
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Unified status palette — uppercase labels, no dots, restrained tones.
const statusTone: Record<Vessel["status"], string> = {
  Active:      "bg-emerald-100 text-emerald-800",
  Inactive:    "bg-slate-100 text-slate-500",
  Maintenance: "bg-brand-50 text-brand-700",
  Retired:     "bg-slate-100 text-slate-500",
};

// Live voyage mock — anchored to today's wall clock, deterministic per vessel id.
function useMockVoyage(vessel: Vessel | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!vessel) return null;
  // 4h voyage anchored ~2h45m before now → vessel is ~70% through
  const departed = new Date(now.getTime() - 2.75 * 60 * 60_000);
  const eta = new Date(now.getTime() + 1.5 * 60 * 60_000);
  const total = eta.getTime() - departed.getTime();
  const elapsed = now.getTime() - departed.getTime();
  const progress = Math.min(1, Math.max(0, elapsed / total));
  const remainingMs = eta.getTime() - now.getTime();
  const remainingH = Math.floor(remainingMs / 3_600_000);
  const remainingM = Math.floor((remainingMs % 3_600_000) / 60_000);

  let h = 0;
  for (let i = 0; i < vessel.id.length; i++) h = (h * 31 + vessel.id.charCodeAt(i)) >>> 0;
  const routes: Array<[string, string, string, string]> = [
    ["CEB", "DGT", "Cebu City", "Dumaguete City"],
    ["MNL", "PPS", "Manila",    "Puerto Princesa"],
    ["BAT", "CAL", "Batangas",  "Calapan"],
    ["MNL", "ILO", "Manila",    "Iloilo"],
    ["MNL", "CEB", "Manila",    "Cebu City"],
  ];
  const route = routes[h % routes.length];
  const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return {
    fromCode: route[0],
    toCode: route[1],
    fromCity: route[2],
    toCity: route[3],
    departedLabel: fmt(departed),
    nowLabel: fmt(now),
    etaLabel: fmt(eta),
    remainingLabel: `${remainingH}h ${String(remainingM).padStart(2, "0")}m`,
    progress,
  };
}

// Mock scheduled-departures history per vessel.
// Each row carries a scheduled time AND an actual time — vessels don't always run on time,
// so we compute a deterministic delay (sometimes 0, sometimes 5–40 min late) per row.
function mockSchedule(vesselId: string, routePair: [string, string]) {
  let h = 0;
  for (let i = 0; i < vesselId.length; i++) h = (h * 31 + vesselId.charCodeAt(i)) >>> 0;
  const today = new Date("2026-05-19");
  const addMin = (hhmm: string, mins: number) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    const total = hh * 60 + mm + mins;
    const H = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
    const M = ((total % 60) + 60) % 60;
    return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`;
  };
  const LEN = 10;
  return Array.from({ length: LEN }).map((_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (LEN - 1 - i));
    const isToday = i === LEN - 1;
    const scheduledDep = i % 2 === 0 ? "05:30" : "14:00";
    // Mix of on-time (~40%) and late departures (5–40 min).
    const depDelay = ((h >> (i * 5)) & 0xff) < 100 ? 0 : 5 + ((h >> (i * 5)) % 36);
    const actualDep = addMin(scheduledDep, depDelay);
    // Crossing takes a base duration (90 min) with small ±jitter; arrival inherits dep delay.
    const baseDuration = 90;
    const crossingJitter = ((h >> (i * 7)) % 11) - 5; // -5..+5
    const scheduledArr = addMin(scheduledDep, baseDuration);
    const actualArr = addMin(actualDep, baseDuration + crossingJitter);
    // Arrival delay vs the schedule (can be negative for early; rare but possible).
    const [sH, sM] = scheduledArr.split(":").map(Number);
    const [aH, aM] = actualArr.split(":").map(Number);
    const arrDelay = (aH * 60 + aM) - (sH * 60 + sM);
    return {
      id: `SCH-${vesselId}-${i}`,
      from: routePair[0],
      to: i % 2 === 1 ? "TAG" : routePair[1],
      date: d,
      time: scheduledDep,        // scheduled departure
      actualDep,                  // actual departure
      depDelay,                   // minutes late on departure
      scheduledArr,
      actualArr,
      arrDelay,
      status: isToday ? "Departed" : "Arrived",
      sold: 1 + ((h >> (i * 3)) % 8),
      capacity: 200,
    };
  });
}

// ─────────── Voyage map — MapLibre basemap with overlaid route & animated ship ───────────
// Real-world ferry routes as polylines of ocean waypoints so the ship stays on water,
// not flying across islands. Each entry is a full path [departure, ...sea points, arrival].
type RoutePath = [number, number][]; // lng/lat polyline
const FERRY_ROUTES: Record<string, RoutePath> = {
  // Batangas (Luzon) → Calapan (Mindoro): head south out of Batangas Bay into the
  // open Verde Island Passage, then south-east through clear deep water, then
  // east into Calapan — staying in the strait the whole way.
  // South out of Batangas Bay, bend east north of Verde Island, run along the
  // northern flank of Verde, then south-east past its eastern tip, then south
  // into Calapan from the north.
  "BAT|Calapan": [
    [121.0583, 13.7565], // Batangas Port
    [121.0400, 13.7200],
    [121.0200, 13.6700], // south through open Batangas Bay
    [121.0000, 13.6100], // continue south, clear of Luzon coast
    [120.9900, 13.5500], // deep open water, well south of the peninsula
    [121.0200, 13.5100], // start bending east, far from any land
    [121.0800, 13.4900],
    [121.1400, 13.4700], // east through open Verde Island Passage
    [121.1700, 13.4400],
    [121.1808, 13.4106], // Calapan
  ],
  // Cebu City → Dumaguete: south-west through Tañon Strait (between Negros & Cebu)
  "CEB|Dumaguete City": [
    [123.9036, 10.3157], // Cebu
    [123.7000, 10.1000],
    [123.5200,  9.8500],
    [123.4000,  9.5500],
    [123.3050,  9.3103], // Dumaguete
  ],
  // Manila → Puerto Princesa: south-west across the West Philippine Sea
  "MNL|Puerto Princesa": [
    [120.9842, 14.5995], // Manila Bay
    [120.6500, 14.0000],
    [120.0000, 13.0000],
    [119.4000, 11.5000],
    [119.0000, 10.5000],
    [118.7350,  9.7392], // Puerto Princesa
  ],
  // Manila → Iloilo: south through Sibuyan Sea, west of Mindoro, east of Panay
  "MNL|Iloilo": [
    [120.9842, 14.5995], // Manila
    [120.9000, 14.0000],
    [120.9500, 13.0000],
    [121.4000, 12.0000],
    [122.0000, 11.2000],
    [122.5644, 10.7202], // Iloilo
  ],
  // Manila → Cebu: south through Tablas Strait, then east through Visayan Sea
  "MNL|Cebu City": [
    [120.9842, 14.5995], // Manila
    [121.0500, 13.6000],
    [121.6000, 12.5000],
    [122.5000, 11.7000],
    [123.4000, 10.9000],
    [123.9036, 10.3157], // Cebu
  ],
};

function resolveRoute(fromCode: string, toCity: string): RoutePath {
  const key = `${fromCode}|${toCity}`;
  return FERRY_ROUTES[key] ?? FERRY_ROUTES["BAT|Calapan"];
}

// Walk a lng/lat polyline and return the point at fractional progress t ∈ [0,1].
function pointOnRoute(path: RoutePath, t: number): [number, number] {
  if (path.length < 2) return path[0] ?? [0, 0];
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const dLng = path[i][0] - path[i - 1][0];
    const dLat = path[i][1] - path[i - 1][1];
    const len = Math.hypot(dLng, dLat);
    segLens.push(len);
    total += len;
  }
  const target = Math.max(0, Math.min(1, t)) * total;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (acc + segLens[i] >= target) {
      const f = segLens[i] === 0 ? 0 : (target - acc) / segLens[i];
      const a = path[i], b = path[i + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    acc += segLens[i];
  }
  return path[path.length - 1];
}

// Slice the polyline from the start up to fractional progress t — used to draw the
// traveled-so-far line, faithful to the same waypoint geometry as the full route.
function sliceRoute(path: RoutePath, t: number): RoutePath {
  if (path.length < 2 || t <= 0) return [path[0]];
  if (t >= 1) return path;
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const len = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    segLens.push(len);
    total += len;
  }
  const target = t * total;
  let acc = 0;
  const out: RoutePath = [path[0]];
  for (let i = 0; i < segLens.length; i++) {
    if (acc + segLens[i] >= target) {
      const f = segLens[i] === 0 ? 0 : (target - acc) / segLens[i];
      const a = path[i], b = path[i + 1];
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      return out;
    }
    out.push(path[i + 1]);
    acc += segLens[i];
  }
  return out;
}

function VoyageMap({
  voyage,
  isLive,
}: {
  voyage: ReturnType<typeof useMockVoyage>;
  isLive: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fromMarkerRef = useRef<Marker | null>(null);
  const toMarkerRef   = useRef<Marker | null>(null);
  const shipMarkerRef = useRef<Marker | null>(null);
  const shipLabelRef  = useRef<Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // SVG-projected route — recomputed on map move so it tracks pan/zoom.
  const [projected, setProjected] = useState<{ full: string; traveled: string } | null>(null);

  const route = voyage ? resolveRoute(voyage.fromCode, voyage.toCity) : null;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [122, 12],
      zoom: 6,
      attributionControl: false,
      cooperativeGestures: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => setMapReady(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // When route changes (or map loads): drop endpoint markers and fit bounds.
  // The route lines themselves are drawn as an SVG overlay (see effect below) so they
  // stay full-saturation regardless of the basemap wash applied to the canvas.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !route || !voyage) return;

    const from = route[0];
    const to = route[route.length - 1];
    fromMarkerRef.current?.remove();
    toMarkerRef.current?.remove();
    const fromEl = document.createElement("div");
    fromEl.className = "h-3 w-3 rounded-full bg-brand-500 ring-4 ring-brand-500/20";
    fromMarkerRef.current = new maplibregl.Marker({ element: fromEl }).setLngLat(from).addTo(map);

    const toEl = document.createElement("div");
    toEl.className = "h-3 w-3 rounded-full border-2 border-brand-500 bg-white ring-4 ring-brand-500/20";
    toMarkerRef.current = new maplibregl.Marker({ element: toEl }).setLngLat(to).addTo(map);

    const bounds = route.reduce(
      (b, p) => b.extend(p),
      new maplibregl.LngLatBounds(route[0], route[0]),
    );
    map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 60, right: 60 }, duration: 0 });
  }, [mapReady, voyage?.fromCode, voyage?.toCity]);

  // SVG route overlay — project route lng/lats to screen pixels and rebuild on every map move.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !route || !voyage) {
      setProjected(null);
      return;
    }
    const buildPaths = () => {
      const fullPts = route.map((p) => map.project(p));
      const traveledPts = sliceRoute(route, voyage.progress).map((p) => map.project(p));
      const toD = (pts: { x: number; y: number }[]) =>
        pts.length === 0 ? "" : "M " + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");
      setProjected({ full: toD(fullPts), traveled: toD(traveledPts) });
    };
    buildPaths();
    map.on("move", buildPaths);
    map.on("resize", buildPaths);
    return () => {
      map.off("move", buildPaths);
      map.off("resize", buildPaths);
    };
  }, [mapReady, voyage?.fromCode, voyage?.toCity, voyage?.progress]);

  // Ship marker + label — update position whenever progress changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !route || !voyage || !isLive) {
      shipMarkerRef.current?.remove(); shipMarkerRef.current = null;
      shipLabelRef.current?.remove();  shipLabelRef.current  = null;
      return;
    }
    const shipPos = pointOnRoute(route, voyage.progress);

    if (!shipMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "relative grid place-items-center";
      el.innerHTML = `
        <span class="absolute inline-flex h-6 w-6 rounded-full bg-brand-500 opacity-30 animate-ping"></span>
        <span class="relative h-3.5 w-3.5 rounded-full bg-brand-500 ring-2 ring-white"></span>
      `;
      shipMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(shipPos).addTo(map);
    } else {
      shipMarkerRef.current.setLngLat(shipPos);
    }

    if (!shipLabelRef.current) {
      const el = document.createElement("div");
      el.className = "relative z-[10] whitespace-nowrap rounded-md bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-900 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.18)]";
      el.innerHTML = `
        <span class="inline-flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
          En route
        </span>
        <span class="ml-2 font-normal tabular-nums text-slate-500">${voyage.remainingLabel} remaining</span>
      `;
      shipLabelRef.current = new maplibregl.Marker({ element: el, offset: [0, -38] }).setLngLat(shipPos).addTo(map);
    } else {
      shipLabelRef.current.setLngLat(shipPos);
      const text = shipLabelRef.current.getElement().querySelector("span:last-child");
      if (text) text.textContent = `${voyage.remainingLabel} remaining`;
    }
  }, [mapReady, isLive, voyage?.progress, voyage?.remainingLabel, voyage?.fromCode, voyage?.toCity]);

  return (
    <div className="relative h-[340px] overflow-hidden rounded-2xl bg-[#dde9f2] shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      {/* Canvas fades in once tiles are loaded so there's no bare blur-to-sharp
          pop on refresh — the loading veil below covers the gap. */}
      <div
        ref={containerRef}
        className={
          "voyage-map-canvas absolute inset-0 h-full w-full transition-opacity duration-500 " +
          (mapReady ? "opacity-100" : "opacity-0")
        }
      />

      {/* Loading veil — a calm tinted cover with a small spinner, shown until
          the basemap reports loaded. Replaces the bare placeholder flash. */}
      {!mapReady && (
        <div className="absolute inset-0 z-[3] grid place-items-center bg-[#dde9f2]">
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin text-slate-400" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Loading map…
          </span>
        </div>
      )}
      {/* SVG route overlay — rendered above the basemap canvas (which is filtered) so the
          orange route is unaffected by the basemap desaturation. */}
      {projected && (
        <svg
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
          aria-hidden
        >
          <path
            d={projected.full}
            fill="none"
            stroke="#f97316"
            strokeOpacity="0.4"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 7"
          />
          <path
            d={projected.traveled}
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {/* Scoped filter — desaturates only the basemap canvas, leaving SVG + markers vivid */}
      <style jsx>{`
        .voyage-map-canvas :global(.maplibregl-canvas) {
          filter: saturate(0.55) brightness(1.03) hue-rotate(8deg);
        }
      `}</style>

    </div>
  );
}

export default function VesselDetailPage() {
  const params = useParams<{ id: string }>();
  const { active } = useShippingLine();
  const [vessels, setVessels] = useState<Vessel[] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Same hydration shape as the vessels list page: prefer the persisted
  // store (so edits made anywhere survive a refresh); fall back to the
  // seeded mock the first time the line is opened.
  useEffect(() => {
    let cancelled = false;
    const persisted = loadStore<Vessel[]>("vessels", active.id);
    if (persisted) { setVessels(persisted); return; }
    fetchDashboardData(active.id).then((d) => {
      if (cancelled) return;
      setVessels(d.vessels);
      saveStore("vessels", active.id, d.vessels);
    });
    return () => { cancelled = true; };
  }, [active.id]);

  const updateVessels = (next: (prev: Vessel[]) => Vessel[]) => {
    setVessels(prev => {
      const value = next(prev ?? []);
      saveStore("vessels", active.id, value);
      return value;
    });
  };

  const vessel = vessels?.find((v) => v.id === params.id) ?? null;
  const voyage = useMockVoyage(vessel);
  const isLive = vessel?.status === "Active";

  if (vessels && !vessel) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Link href="/vessels" className="transition-colors duration-150 ease-out hover:text-slate-900">
          Vessels
        </Link>
        <span className="text-slate-300">›</span>
        <span className="truncate text-slate-700">
          {vessel?.name ?? "…"}
        </span>
      </nav>

      {/* Title row — sits above the grid */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/vessels"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </Link>
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
              {vessel?.name ?? <span className="text-slate-300">Loading vessel…</span>}
            </h1>
            {vessel && (
              <p className="text-[12px] text-slate-500">
                {vessel.type} <span className="text-slate-300">·</span>{" "}
                <span className="font-mono">IMO {vessel.imo}</span>
              </p>
            )}
          </div>
        </div>

        {vessel && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Edit
            </button>
          </div>
        )}
      </div>

      {/* ───────────────  MAIN GRID — Shippit-style layout  ─────────────── */}
      {/* LEFT (5/12):  search + Add departure · primary current-voyage card · secondary previous-departure cards */}
      {/* RIGHT (7/12): map up top · vessel + departure detail panels below (2-col grid like the reference) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

        {/* LEFT COLUMN */}
        <div className="space-y-3 lg:col-span-5">
          {/* Section header */}
          {vessel && voyage && (
            <div className="flex items-baseline justify-between px-1 pt-1 pb-0.5">
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Departures</h2>
              <span className="font-mono text-[11.5px] tabular-nums text-slate-400">
                {mockSchedule(vessel.id, [voyage.fromCode, voyage.toCode]).length}
              </span>
            </div>
          )}

          {/* Primary card — current voyage. */}
          {vessel && voyage && isLive && (
            <VoyageCard
              tone="active"
              statusLabel="In Transit"
              vesselName={vessel.name}
              vesselType={vessel.type}
              lineName={active.name}
              dateLabel={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "long", year: "numeric" })}
              fromCode={voyage.fromCode}
              fromCity={voyage.fromCity}
              fromTime={voyage.departedLabel}
              toCode={voyage.toCode}
              toCity={voyage.toCity}
              toTime={voyage.etaLabel}
              durationLabel={voyage.remainingLabel}
              progress={voyage.progress}
            />
          )}

          {/* Secondary cards — past departures. */}
          {vessel && voyage && mockSchedule(vessel.id, [voyage.fromCode, voyage.toCode])
            .filter(s => s.status === "Arrived")
            .map((s) => {
              const arrivalCity = s.to === voyage.toCode ? voyage.toCity : s.to === "TAG" ? "Tagbilaran" : voyage.toCity;
              const dateLabel = s.date.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "long", year: "numeric" });
              return (
                <VoyageCard
                  key={s.id}
                  tone="ghost"
                  statusLabel="Arrived"
                  vesselName={vessel.name}
                  vesselType={vessel.type}
                  lineName={active.name}
                  dateLabel={dateLabel}
                  fromCode={s.from}
                  fromCity={voyage.fromCity}
                  fromTime={s.actualDep}
                  toCode={s.to}
                  toCity={arrivalCity}
                  toTime={s.actualArr}
                  durationLabel={`${Math.floor(90/60)}H ${String(90%60).padStart(2,"0")}M`}
                  progress={1}
                />
              );
            })}
        </div>

        {/* RIGHT COLUMN — map + vessel/departure detail panels.
            Sticky so it stays in view at a glance while the LEFT scrolls independently.
            No internal scroll: all cards must fit within the viewport at a glance. */}
        <div className="space-y-3 lg:col-span-7 lg:sticky lg:top-6 lg:self-start">
          {/* Map */}
          <VoyageMap voyage={voyage} isLive={!!isLive} />

          {/* Vessel + Departure details — stacked panels */}
          {vessel && (
            <div className="space-y-3">
              {/* Vessel — primary reference card */}
              <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)]">
                {/* Identity strip — initials, name, type, status (compact header) */}
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-[12.5px] font-bold tracking-wide text-brand-600">
                    {vesselInitials(vessel.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-slate-900">{vessel.name}</h3>
                      <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[vessel.status]}`}>
                        {vessel.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-slate-500">{vessel.type}</div>
                  </div>
                </div>

                {/* Hero metrics — IMO · Pax · Slots as the focal data */}
                <div className="grid grid-cols-3 divide-x divide-slate-100">
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <rect x="4" y="6" width="16" height="12" rx="2" />
                        <path d="M8 10h8M8 14h5" />
                      </svg>
                      IMO
                    </div>
                    <div className="mt-1.5 truncate font-mono text-[18px] font-semibold tabular-nums tracking-tight text-slate-900">
                      {vessel.imo}
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
                      </svg>
                      Pax
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="font-mono text-[22px] font-semibold leading-none tabular-nums tracking-tight text-slate-900">
                        {vessel.passengers.toLocaleString()}
                      </span>
                      <span className="text-[10.5px] text-slate-400">seats</span>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="M3 17h2l2-6h10l2 6h2" />
                        <circle cx="7.5" cy="17.5" r="1.5" />
                        <circle cx="16.5" cy="17.5" r="1.5" />
                      </svg>
                      Slots
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      {vessel.vehicleSlots !== null ? (
                        <>
                          <span className="font-mono text-[22px] font-semibold leading-none tabular-nums tracking-tight text-slate-900">
                            {vessel.vehicleSlots}
                          </span>
                          <span className="text-[10.5px] text-slate-400">vehicles</span>
                        </>
                      ) : (
                        <span className="text-[18px] font-semibold leading-none text-slate-300">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Passenger types — primary reference card.
                  Falls back to a sensible default set when the vessel doesn't carry its own. */}
              {(() => {
                const DEFAULT_PASSENGER_TYPES: PassengerType[] = [
                  { key: "adult",   label: "Adult",            discountPct: 0,  requiredDoc: "Government-issued ID" },
                  { key: "senior",  label: "Senior citizen",   discountPct: 20, requiredDoc: "Senior citizen ID" },
                  { key: "pwd",     label: "PWD",              discountPct: 20, requiredDoc: "PWD ID" },
                  { key: "student", label: "Student",          discountPct: 20, requiredDoc: "School ID, valid sem" },
                  { key: "child",   label: "Child (3–11)",     discountPct: 50, requiredDoc: "Birth certificate" },
                  { key: "infant",  label: "Infant (under 3)", discountPct: 100, requiredDoc: "Birth certificate", isInfant: true },
                ];
                const list = vessel.passengerTypes && vessel.passengerTypes.length > 0
                  ? vessel.passengerTypes
                  : DEFAULT_PASSENGER_TYPES;
                return (
                <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Passenger types</h3>
                      <p className="mt-0.5 text-[10.5px] text-slate-500">Discounts require valid ID on boarding</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] tabular-nums text-slate-600">{list.length}</span>
                  </div>

                  {/* Two-column grid — compact, with glyph + label + emphasized discount */}
                  <ul className="grid grid-cols-2">
                    {list.map((pt: PassengerType, i) => {
                      const col = i % 2;
                      const row = Math.floor(i / 2);
                      const isFree = pt.isInfant || pt.discountPct === 100;
                      const isBase = pt.discountPct === 0;
                      return (
                        <li
                          key={pt.key}
                          className={`group flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-150 hover:bg-slate-50/60 ${
                            row !== 0 ? "border-t border-slate-100" : ""
                          } ${col === 0 ? "border-r border-slate-100" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12.5px] font-medium tracking-tight text-slate-900">{pt.label}</div>
                            <div className="mt-0.5 truncate text-[10.5px] text-slate-400">
                              {isFree ? "No fare" : isBase ? "Standard fare" : `${pt.discountPct}% off base`}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            {isFree ? (
                              <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700">
                                Free
                              </span>
                            ) : isBase ? (
                              <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-slate-400">Base</span>
                            ) : (
                              <span className="inline-flex items-baseline gap-0.5">
                                <span className="font-mono text-[15px] font-semibold leading-none tabular-nums tracking-tight text-slate-900">
                                  {pt.discountPct}
                                </span>
                                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">% off</span>
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                );
              })()}

              {/* Vehicle classes */}
              {vessel.vehicleSlots !== null && vessel.vehicleClasses && vessel.vehicleClasses.length > 0 && (
                <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Vehicle classes</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] tabular-nums text-slate-600">
                      {vessel.vehicleClasses.filter((c) => c.enabled).length}/{vessel.vehicleClasses.length}
                    </span>
                  </div>
                  <ul>
                    {vessel.vehicleClasses.map((cls: VehicleClass, i) => (
                      <li
                        key={cls.key}
                        className={`grid grid-cols-[14px_1fr_auto] items-center gap-3 px-4 py-1.5 ${
                          i !== 0 ? "border-t border-slate-100" : ""
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 place-items-center rounded border ${
                            cls.enabled
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {cls.enabled && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                              <path d="M5 12l5 5 9-11" />
                            </svg>
                          )}
                        </span>
                        <div className={`min-w-0 text-[13px] tracking-tight ${cls.enabled ? "font-medium text-slate-900" : "text-slate-500"}`}>
                          {cls.label}
                        </div>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400">{cls.descriptor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <EditVesselModal
        open={editOpen}
        vessel={vessel}
        onClose={() => setEditOpen(false)}
        onSave={(updated) => updateVessels((prev) => prev.map((v) => v.id === updated.id ? updated : v))}
      />

      <DeleteVesselDialog
        open={deleteOpen}
        vessel={vessel}
        onClose={() => setDeleteOpen(false)}
        onConfirm={(v) => {
          updateVessels((prev) => prev.filter((x) => x.id !== v.id));
          window.location.href = "/vessels";
        }}
      />
    </div>
  );
}
