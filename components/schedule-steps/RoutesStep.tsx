"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Routes step — second stop of the Create-Schedule wizard.
 *
 * Answers a single question: *Which directional route does this schedule serve?*
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Origin port         [▼ Cebu City (CEB) ──────────────────]   │
 *   │ Destination port    [▼ Dumaguete City (DGT) ─────────────]   │
 *   │                                                               │
 *   │ ── Origin → Destination preview pill ──────────────────────   │
 *   │                                                               │
 *   │ Distance (nm)       [   42        ]   ← auto-filled, editable │
 *   │ Avg duration        [ 3.5 – 4 hrs ]   ← auto-filled, editable │
 *   │                                                               │
 *   │ ⟲  Create return route        [ toggle ]                      │
 *   │     Adds the opposite leg as a separate record                │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Improvements over the legacy modal:
 *  - Real port catalog with autocomplete-style dropdowns instead of free text.
 *  - Distance and duration auto-fill from a known port-pair lookup, but stay
 *    editable so operators can override per-schedule.
 *  - Live "Origin → Destination" preview pill so the chosen direction is
 *    unmistakable before they hit Continue.
 *  - Inline validation when origin === destination.
 */

export type RouteStatus = "Active" | "Inactive";

export type RoutesValue = {
  originCode: string;
  destinationCode: string;
  distanceNm: string;          // kept as string so the input stays controlled-friendly
  durationLowHrs: string;
  durationHighHrs: string;
  createReturn: boolean;
  /** Operational status. Only surfaced/edited in edit mode; new routes start Active. */
  status?: RouteStatus;
};

export type Port = { code: string; city: string };

// Curated Philippine port catalog — covers every pair that appears in the routes
// page mock so the auto-fill below has data to draw from. Add more as needed.
export const PORTS: Port[] = [
  { code: "CEB", city: "Cebu City" },
  { code: "DGT", city: "Dumaguete City" },
  { code: "TAG", city: "Tagbilaran City" },
  { code: "ORM", city: "Ormoc City" },
  { code: "BAC", city: "Bacolod City" },
  { code: "DAP", city: "Dapitan City" },
  { code: "BAT", city: "Batangas City" },
  { code: "CAL", city: "Calapan City" },
  { code: "MNL", city: "Manila" },
  { code: "PPS", city: "Puerto Princesa" },
  { code: "ILO", city: "Iloilo City" },
];

// Known crossings — keyed "ORIGIN→DEST" so we can suggest distance/duration the
// moment both ports are picked. Direction-agnostic; we normalize on lookup.
type Crossing = { distanceNm: number; durationHrs: [number, number] };
const CROSSINGS: Record<string, Crossing> = {
  "CEB|DGT": { distanceNm: 42,  durationHrs: [3.5, 4] },
  "CEB|TAG": { distanceNm: 65,  durationHrs: [2, 2.5] },
  "CEB|ORM": { distanceNm: 95,  durationHrs: [3.5, 4] },
  "CEB|BAC": { distanceNm: 80,  durationHrs: [4, 5] },
  "DGT|DAP": { distanceNm: 38,  durationHrs: [2.5, 3] },
  "BAT|CAL": { distanceNm: 26,  durationHrs: [2.5, 3] },
  "MNL|PPS": { distanceNm: 350, durationHrs: [22, 24] },
  "MNL|ILO": { distanceNm: 250, durationHrs: [18, 20] },
};
function lookupCrossing(a: string, b: string): Crossing | null {
  if (!a || !b) return null;
  return CROSSINGS[`${a}|${b}`] ?? CROSSINGS[`${b}|${a}`] ?? null;
}

export default function RoutesStep({
  value,
  onChange,
  hideReturnToggle = false,
  showStatus = false,
  lockPorts = false,
}: {
  value: RoutesValue;
  onChange: (next: RoutesValue) => void;
  /** Hide the "create return route" toggle (e.g. when editing an existing route). */
  hideReturnToggle?: boolean;
  /** Show the Active/Inactive status segmented control (edit mode). */
  showStatus?: boolean;
  /** Render origin + destination as a read-only details card. Used in edit
   *  mode — once a route exists the leg is system-defined and the operator
   *  can only tweak distance/duration/status. */
  lockPorts?: boolean;
}) {
  const origin = PORTS.find((p) => p.code === value.originCode) ?? null;
  const destination = PORTS.find((p) => p.code === value.destinationCode) ?? null;
  const sameOriginDest = !!origin && !!destination && origin.code === destination.code;

  // Auto-fill distance & duration whenever both ports are picked and the user
  // hasn't manually typed values yet. We don't overwrite non-empty fields so
  // operators can override the catalog's defaults per schedule.
  useEffect(() => {
    if (!origin || !destination || sameOriginDest) return;
    const cross = lookupCrossing(origin.code, destination.code);
    if (!cross) return;
    const next = { ...value };
    let touched = false;
    if (!value.distanceNm) { next.distanceNm = String(cross.distanceNm); touched = true; }
    if (!value.durationLowHrs)  { next.durationLowHrs  = String(cross.durationHrs[0]); touched = true; }
    if (!value.durationHighHrs) { next.durationHighHrs = String(cross.durationHrs[1]); touched = true; }
    if (touched) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.code, destination?.code]);

  // Filtered destination list — never offer the origin as a destination option.
  const destinationOptions = useMemo(
    () => PORTS.filter((p) => p.code !== value.originCode),
    [value.originCode],
  );

  const status: RouteStatus = value.status ?? "Active";

  return (
    <div className="space-y-5">
      {lockPorts && origin && destination ? (
        /* Edit mode: ports are system-defined and not editable. Render a
           read-only details card with both ends and the directional arrow. */
        <LockedPortsCard origin={origin} destination={destination} />
      ) : (
        <>
          {/* Origin / Destination selects with the route-line visual sitting between them. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <FieldGroup label="Origin port">
              <PortSelect
                ariaLabel="Origin port"
                value={value.originCode}
                options={PORTS.filter((p) => p.code !== value.destinationCode)}
                placeholder="Select origin"
                onChange={(code) => onChange({ ...value, originCode: code })}
              />
            </FieldGroup>

            {/* Connector — orange dashed arrow that animates when both ports are set. */}
            <div className="hidden pt-5 sm:block">
              <ConnectorArrow active={!!origin && !!destination && !sameOriginDest} />
            </div>

            <FieldGroup label="Destination port">
              <PortSelect
                ariaLabel="Destination port"
                value={value.destinationCode}
                options={destinationOptions}
                placeholder="Select destination"
                onChange={(code) => onChange({ ...value, destinationCode: code })}
              />
            </FieldGroup>
          </div>

          {/* Origin → Destination preview note (or inline error if same port picked). */}
          {sameOriginDest ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-rose-600">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16v.01" />
              </svg>
              <span className="text-[12.5px] tracking-tight text-slate-700">
                <span className="font-semibold text-slate-900">Pick a different destination.</span>{" "}
                <span className="text-slate-500">Origin and destination must be different ports.</span>
              </span>
            </div>
          ) : origin && destination ? (
            <RoutePreview origin={origin} destination={destination} />
          ) : null}
        </>
      )}

      {/* Distance + duration — auto-filled but editable. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.6fr]">
        <FieldGroup label="Distance" suffix="nm">
          <NumberInput
            value={value.distanceNm}
            onChange={(v) => onChange({ ...value, distanceNm: v })}
            placeholder="42"
            ariaLabel="Distance in nautical miles"
          />
        </FieldGroup>
        <FieldGroup label="Average duration" suffix="hours">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <NumberInput
              value={value.durationLowHrs}
              onChange={(v) => onChange({ ...value, durationLowHrs: v })}
              placeholder="3.5"
              ariaLabel="Minimum duration"
            />
            <span className="text-[12px] text-slate-400">to</span>
            <NumberInput
              value={value.durationHighHrs}
              onChange={(v) => onChange({ ...value, durationHighHrs: v })}
              placeholder="4"
              ariaLabel="Maximum duration"
            />
          </div>
        </FieldGroup>
      </div>

      {/* Return-leg toggle — clone of the legacy "Create Return Route" card, refined.
          Hidden when editing an existing route (the return leg is its own record). */}
      {!hideReturnToggle && (
        <ReturnRouteCard
          on={value.createReturn}
          disabled={sameOriginDest || !origin || !destination}
          onToggle={(v) => onChange({ ...value, createReturn: v })}
        />
      )}

      {/* Status — pill toggle matching the edit-vessel dialog's status field
          (plain pills, label above, rendered as the last card). */}
      {showStatus && (
        <div>
          <span className="block pb-1.5 text-[12.5px] font-semibold tracking-tight text-slate-700">Status</span>
          <div className="flex flex-wrap gap-1">
            {(["Active", "Inactive"] as RouteStatus[]).map((opt) => {
              const selected = opt === status;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange({ ...value, status: opt })}
                  className={
                    "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none " +
                    (selected ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700")
                  }
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── Sub-components ───────────

function FieldGroup({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between pb-1.5">
        <span className="text-[12.5px] font-semibold tracking-tight text-slate-700">{label}</span>
        {suffix && <span className="text-[10.5px] font-medium text-slate-400">{suffix}</span>}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[13px] tabular-nums text-slate-900 placeholder:text-slate-300 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
    />
  );
}

// ─────────── PortSelect — searchable port dropdown ───────────
function PortSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
}: {
  value: string;
  options: Port[];
  onChange: (code: string) => void;
  ariaLabel: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((p) => p.code === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((p) => p.city.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [query, options]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={
          "group inline-flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition-[border-color,box-shadow,background-color] duration-150 ease-out " +
          (open
            ? "border-brand-300 ring-2 ring-brand-100 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_-12px_rgba(249,115,22,0.35)]"
            : selected
              ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              : "border-dashed border-slate-300 bg-slate-50/40 hover:border-brand-200 hover:bg-white")
        }
      >
        {/* Leading icon tile — switches from a neutral pin to a brand-tinted
            anchor once a port is selected, so the trigger reads as "filled" at a glance. */}
        <span
          className={
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors " +
            (selected
              ? "bg-brand-50 text-brand-600 ring-1 ring-brand-100"
              : "bg-slate-100 text-slate-400 ring-1 ring-slate-200/70 group-hover:bg-white")
          }
        >
          {selected ? (
            // Anchor — signals "this end of the route is locked in".
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v14" />
              <path d="M5 13a7 7 0 0 0 14 0" />
              <path d="M8 11H5M19 11h-3" />
            </svg>
          ) : (
            // Map pin — empty/awaiting selection.
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          )}
        </span>

        {/* Body — two-line stack when a port is selected (city on top, code chip
            below), single-line placeholder otherwise. Mirrors the way airline
            booking flows display picked airports. */}
        <span className="flex-1 min-w-0">
          {selected ? (
            <span className="flex items-baseline gap-2">
              <span className="truncate text-[14px] font-semibold tracking-tight text-slate-900">
                {selected.city}
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums tracking-[0.08em] text-slate-600 ring-1 ring-slate-200/60">
                {selected.code}
              </span>
            </span>
          ) : (
            <span className="block truncate text-[14px] font-medium tracking-tight text-slate-400">{placeholder}</span>
          )}
          <span className="mt-0.5 block truncate text-[11.5px] text-slate-400">
            {selected ? "Tap to change" : "Search by city or code"}
          </span>
        </span>

        {/* Trailing chevron — subtler when filled so it doesn't fight the chip. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            "h-3.5 w-3.5 shrink-0 transition-transform duration-150 " +
            (open ? "rotate-180 text-brand-500" : "text-slate-400 group-hover:text-slate-600")
          }
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-40 mt-1.5 w-full overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-8px_rgba(15,23,42,0.18)]"
          style={{ animation: "row-menu-in 120ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {/* Search input — reduces friction once the catalog grows. */}
          <div className="mb-1 flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ports…"
              className="w-full bg-transparent text-[12.5px] placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-[12px] text-slate-400">No matching ports.</div>
            ) : (
              filtered.map((p) => {
                const active = p.code === value;
                return (
                  <button
                    key={p.code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => { onChange(p.code); setOpen(false); setQuery(""); }}
                    className={
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors " +
                      (active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100")
                    }
                  >
                    <span className="font-mono text-[11px] tabular-nums tracking-wider text-slate-400">{p.code}</span>
                    <span className="font-medium">{p.city}</span>
                    {active && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto h-3.5 w-3.5">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Soft connector between the two port pickers — a quiet line with a small
// ferry glyph that warms to brand orange once both ends are chosen, so the
// pair reads as joined rather than wired together.
function ConnectorArrow({ active }: { active: boolean }) {
  const tint = active ? "text-brand-500" : "text-slate-300";
  return (
    <span className={"flex items-center gap-1.5 transition-colors " + tint} aria-hidden>
      <span className="h-px w-3 bg-current" />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z" />
        <path d="M5 14V8a1 1 0 0 1 1-1h7l5 4" />
        <path d="M9 7V4h2" />
      </svg>
      <span className="h-px w-3 bg-current" />
    </span>
  );
}

// Read-only details card shown in edit mode — the route's ports are defined
// in the system catalog and can't be reassigned here. The operator can still
// edit distance / duration / status below.
/** Standalone read-only Route card — used in assign mode where the form
 *  fields are intentionally absent. */
export function RouteContextCard({ value }: { value: RoutesValue }) {
  const origin = PORTS.find((p) => p.code === value.originCode);
  const destination = PORTS.find((p) => p.code === value.destinationCode);
  if (!origin || !destination) return null;
  return <LockedPortsCard origin={origin} destination={destination} />;
}

function LockedPortsCard({ origin, destination }: { origin: Port; destination: Port }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-2.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">Route</span>
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-semibold tracking-tight text-slate-900">{origin.city}</div>
          <span className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold tabular-nums tracking-[0.08em] text-slate-600 ring-1 ring-slate-200/60">
            {origin.code}
          </span>
        </div>
        <span aria-hidden className="shrink-0 text-[18px] font-medium text-slate-300">→</span>
        <div className="min-w-0 flex-1 text-right">
          <div className="truncate text-[18px] font-semibold tracking-tight text-slate-900">{destination.city}</div>
          <span className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold tabular-nums tracking-[0.08em] text-slate-600 ring-1 ring-slate-200/60">
            {destination.code}
          </span>
        </div>
      </div>
    </div>
  );
}

// Flat confirmation note that the directional pair is locked in.
function RoutePreview({ origin, destination }: { origin: Port; destination: Port }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-emerald-600">
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span className="text-[12.5px] tracking-tight text-slate-700">
        <span className="font-semibold text-slate-900">Route set.</span>{" "}
        <span className="text-slate-500">
          {origin.city} <span className="font-mono text-[10.5px] tabular-nums text-slate-400">({origin.code})</span>
          {" → "}
          {destination.city} <span className="font-mono text-[10.5px] tabular-nums text-slate-400">({destination.code})</span>
        </span>
      </span>
    </div>
  );
}

// "Create return route" toggle card — matches the visual rhythm of the screenshot
// but inherits the brand palette and ring-treatment used elsewhere in the wizard.
function ReturnRouteCard({
  on,
  disabled,
  onToggle,
}: {
  on: boolean;
  disabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div
      className={
        "flex items-center gap-3 rounded-xl border bg-white p-3 transition-[border-color,background-color] " +
        (disabled
          ? "border-slate-200 opacity-60"
          : on
            ? "border-brand-200 bg-brand-50/40"
            : "border-slate-200 hover:border-slate-300")
      }
    >
      <div
        className={
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg " +
          (on ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200")
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M17 4l4 4-4 4" />
          <path d="M3 8h18" />
          <path d="M7 20l-4-4 4-4" />
          <path d="M21 16H3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold tracking-tight text-slate-900">Create return route</div>
        <div className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
          Adds the opposite direction as a separate route record so the inbound leg gets its own
          schedule, vessel, and fares.
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onToggle(!on)}
        className={
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 " +
          (on ? "bg-brand-500" : "bg-slate-300") +
          (disabled ? " cursor-not-allowed opacity-60" : " cursor-pointer")
        }
      >
        <span
          aria-hidden
          className={
            "block h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-transform duration-150 " +
            (on ? "translate-x-4" : "translate-x-0")
          }
        />
      </button>
    </div>
  );
}
