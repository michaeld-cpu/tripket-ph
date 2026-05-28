"use client";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import DateRangePicker, { type DateRange } from "@/components/DateRangePicker";
import CountUp from "@/components/CountUp";
import {
  deriveBookings,
  statusLabel,
  statusTone,
  ticketStatusTone,
  type Booking,
  type BookingStatus,
  type TicketStatus,
} from "@/lib/bookings-data";
import { loadScopedVoyages } from "@/lib/line-scope";
import TicketBookingsChart from "@/components/TicketBookingsChart";

// ─────────── Reports tab + section vocabulary ───────────
// One page, tabbed sections. The data backbone is the same as bookings +
// tickets: hydrate from `tripket.voyages` and pipe through `deriveBookings`.
// All aggregations apply the page-level date range to keep numbers honest.
type Tab = "overview" | "routes" | "vessels" | "voyages" | "tickets" | "bookings";

const TABS: { id: Tab; label: string; help: string; soon?: boolean }[] = [
  { id: "overview", label: "Overview", help: "Headline metrics + revenue trend." },
  { id: "routes",   label: "Routes",   help: "Per-route performance.", soon: true },
  { id: "vessels",  label: "Vessels",  help: "Per-vessel performance.", soon: true },
  { id: "voyages",  label: "Voyages",  help: "Per-voyage performance — each sailing's load + revenue.", soon: true },
  { id: "tickets",  label: "Tickets",  help: "Ticket lifecycle + class mix.", soon: true },
  { id: "bookings", label: "Bookings", help: "Booking status mix + cancellation/refund report.", soon: true },
];

export default function ReportsPage() {
  const { active, locked } = useShippingLine();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  // Default to the trailing 30 days so the page lands with a meaningful
  // window without the operator picking one first.
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  }));

  // Hydrate from the same localStorage backbone as bookings/tickets, then
  // blend in synthesized historical bookings so the charts have meaningful
  // shape across the date range. The synthetic data lives only inside this
  // page — the bookings/tickets pages still see only the real records.
  useEffect(() => {
    try {
      const voyages = loadScopedVoyages(active.id, locked);
      const real = deriveBookings(voyages);
      const synthetic = synthesizeBackfillBookings(real);
      const t = setTimeout(() => setBookings([...real, ...synthetic]), 180);
      return () => clearTimeout(t);
    } catch {
      setBookings([]);
    }
  }, [active.id, locked]);

  // Bookings inside the active date range — used by every aggregation below.
  const inRange = useMemo(
    () => (bookings ?? []).filter((b) => b.bookingDate >= dateRange.start && b.bookingDate <= dateRange.end),
    [bookings, dateRange]
  );

  return (
    <div>
      <PageHeader title="Reports" subtitle={active.name} showDateFilter={false} />

      {/* Toolbar — underline tabs on the left (ElevenLabs-style: flat, no
          pill chrome), date-range filter on the right. The active tab carries
          a brand-orange underline so the eye lands on it without the visual
          weight of a filled button. */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center gap-6">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={on}
                title={t.help}
                className={
                  "relative -mb-px px-1 pb-3 text-[13px] font-medium tracking-tight transition-colors duration-150 " +
                  (on
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-700")
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {t.label}
                  {t.soon && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Soon
                    </span>
                  )}
                </span>
                {on && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand-500" />}
              </button>
            );
          })}
        </div>
        <div className="pb-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {!bookings ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {tab === "overview"
            ? <OverviewTab bookings={inRange} dateRange={dateRange} />
            : <ComingSoonTab />}
        </>
      )}
    </div>
  );
}

// ─────────── Overview ───────────
function ComingSoonTab() {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-white text-center ring-1 ring-slate-200/70">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-500">
        {/* Goofy face — winking eye + tongue out :P */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
          <circle cx="12" cy="12" r="9" />
          {/* left eye open, right eye winking */}
          <path d="M8 10h.01" />
          <path d="M14.5 10c.5-.6 1.5-.6 2 0" />
          {/* mouth with tongue sticking out */}
          <path d="M8 14.5c1 1 2.5 1.5 4 1.5" />
          <path d="M12 16c.7 0 1.4.6 1.4 1.4 0 .8-.7 1.6-1.4 1.6s-1.4-.8-1.4-1.6" />
        </svg>
      </span>
      <p className="mt-3 text-[13.5px] font-medium text-slate-500">Coming soon hehe bleeeee :P</p>
    </section>
  );
}

function OverviewTab({ bookings, dateRange }: { bookings: Booking[]; dateRange: DateRange }) {
  const kpis = useMemo(() => computeKpis(bookings), [bookings]);
  const trend = useMemo(() => buildDailyTrend(bookings, dateRange), [bookings, dateRange]);
  const bookingStatusMix = useMemo(() => bucketBookingStatus(bookings), [bookings]);
  const ticketStatusMix  = useMemo(() => bucketTicketStatus(bookings), [bookings]);
  const friction = useMemo(() => computeFriction(bookings), [bookings]);

  // Pax + vehicle bookings per period — feeds the dashboard's existing
  // TicketBookingsChart so the Reports page reuses the proven visualisation.
  const ticketBookingsData = useMemo(() => buildTicketBookingsSeries(bookings, dateRange), [bookings, dateRange]);
  // Bucket the daily trend the same way the ticket-bookings series does so
  // the revenue bar chart never gets crowded at half-card width.
  const revenueBars = useMemo(() => buildRevenueBuckets(bookings, dateRange), [bookings, dateRange]);

  // Capacity / efficiency metrics — load factor is the operational health
  // signal that pairs naturally with raw Volume + Revenue.
  const capacity = useMemo(() => computeCapacity(bookings), [bookings]);

  return (
    <div className="space-y-4">
      {/* KPI summary band — three operational lenses (Volume · Revenue ·
          Capacity). Each cell carries a single supporting context line so
          the numbers read in relation to something, not in isolation. */}
      <KpiBand
        cells={[
          {
            label: "Volume",
            primary: { value: kpis.bookings, label: "Bookings" },
            secondary: { value: kpis.passengers, label: "Passengers", caption: `${avg(kpis.passengers, kpis.bookings)} pax / booking` },
          },
          {
            label: "Revenue",
            primary: { value: kpis.revenue, prefix: "₱", label: "Total revenue" },
            secondary: { value: friction.refunded, label: "Refunded bookings", caption: `₱${friction.refundRev.toLocaleString()} returned` },
          },
          {
            label: "Capacity",
            primary: { value: Number(capacity.loadFactor.toFixed(1)), suffix: "%", label: "Avg load factor" },
            secondary: { value: capacity.voyages, label: "Voyages active", caption: `${capacity.routes} route${capacity.routes === 1 ? "" : "s"}` },
          },
        ]}
      />

      {/* Charts row — Ticket bookings + Revenue bars side by side. The
          ticket-bookings chart pads its series with empty leading + trailing
          buckets so the dashboard component's edge-anchored labels don't
          crash into the data dots at half-card width. */}
      <div className="grid grid-cols-2 gap-4">
        <TicketBookingsChart data={padSeriesEdges(ticketBookingsData)} showTotal={false} />
        <RevenueBarChart data={revenueBars} />
      </div>

      {/* Weekday demand profile — surfaces which days of the week pull the
          most traffic. Helps with staffing + crewing decisions without
          duplicating any dimensional tab. */}
      <WeekdayDemandCard bookings={bookings} />
    </div>
  );
}

// ─────────── Routes ───────────
// Comprehensive per-route analytics: every route in the operator's network
// shows up, ranked by revenue, with prior-period deltas + a status flag so
// the eye lands on outliers. Modelled after Stripe / Shopify dimensional
// dashboards — period comparison, sortable columns, status badges.
type RouteSort = "revenue" | "bookings" | "pax" | "loadFactor" | "delta";

function RoutesTab({
  bookings,
  allBookings,
  dateRange,
}: {
  bookings: Booking[];
  allBookings: Booking[];
  dateRange: DateRange;
}) {
  const [sort, setSort] = useState<RouteSort>("revenue");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Compute the prior period of equal length so we have a comparison base.
  const priorRange = useMemo(() => {
    const len = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - len - 86_400_000),
      end: new Date(dateRange.start.getTime() - 86_400_000),
    };
  }, [dateRange]);
  const priorBookings = useMemo(
    () => allBookings.filter((b) => b.bookingDate >= priorRange.start && b.bookingDate <= priorRange.end),
    [allBookings, priorRange]
  );

  // Aggregate every route across both periods so we can compute deltas.
  const rows = useMemo(() => {
    const aggregate = (src: Booking[]) => {
      const m = new Map<string, { bookings: number; pax: number; revenue: number; cancelled: number; voyages: Set<string> }>();
      src.forEach((b) => {
        const key = `${b.routeOriginCode}→${b.routeDestinationCode}`;
        const e = m.get(key) ?? { bookings: 0, pax: 0, revenue: 0, cancelled: 0, voyages: new Set<string>() };
        e.bookings += 1;
        e.pax += b.pax;
        e.revenue += b.amount;
        if (b.status === "Cancelled" || b.status === "Refunded") e.cancelled += 1;
        const dd = new Date(b.departureDate); dd.setHours(0, 0, 0, 0);
        e.voyages.add(`${b.vesselName}|${dd.toISOString()}`);
        m.set(key, e);
      });
      return m;
    };
    const cur = aggregate(bookings);
    const prv = aggregate(priorBookings);

    // Identity index — used to render the route label.
    const identity = new Map<string, { origin: string; destination: string; originCity: string; destinationCity: string }>();
    [...bookings, ...priorBookings].forEach((b) => {
      const key = `${b.routeOriginCode}→${b.routeDestinationCode}`;
      if (!identity.has(key)) identity.set(key, {
        origin: b.routeOriginCode,
        destination: b.routeDestinationCode,
        originCity: b.routeOriginCity,
        destinationCity: b.routeDestinationCity,
      });
    });

    const keys = new Set<string>([...cur.keys(), ...prv.keys()]);
    return Array.from(keys).map((k) => {
      const c = cur.get(k);
      const p = prv.get(k);
      const id = identity.get(k)!;
      const revenue = c?.revenue ?? 0;
      const priorRevenue = p?.revenue ?? 0;
      const pax = c?.pax ?? 0;
      const bookingsCount = c?.bookings ?? 0;
      const voyages = c?.voyages.size ?? 0;
      const cancelled = c?.cancelled ?? 0;
      const loadFactor = voyages
        ? Math.min(100, (pax / voyages / TYPICAL_VOYAGE_CAPACITY) * 100)
        : 0;
      // Percentage change vs prior period; null when the route had no
      // prior-period activity (so we don't render misleading "+∞%").
      const delta = priorRevenue > 0
        ? ((revenue - priorRevenue) / priorRevenue) * 100
        : revenue > 0 ? null : 0;
      // Status flag — surfaces outliers at a glance without the operator
      // having to scan deltas.
      const status: "Surging" | "Healthy" | "Declining" | "Inactive" | "New" =
        bookingsCount === 0 ? "Inactive"
        : priorRevenue === 0 ? "New"
        : delta !== null && delta >= 20 ? "Surging"
        : delta !== null && delta <= -15 ? "Declining"
        : "Healthy";
      return {
        key: k,
        route: `${id.originCity} (${id.origin}) → ${id.destinationCity} (${id.destination})`,
        origin: id.origin,
        destination: id.destination,
        bookings: bookingsCount,
        pax,
        revenue,
        priorRevenue,
        voyages,
        cancelled,
        loadFactor,
        delta,
        status,
      };
    });
  }, [bookings, priorBookings]);

  // Apply current sort.
  const sortedRows = useMemo(() => {
    const arr = rows.slice();
    arr.sort((a, b) => {
      const get = (r: typeof rows[number]) =>
        sort === "revenue" ? r.revenue
        : sort === "bookings" ? r.bookings
        : sort === "pax" ? r.pax
        : sort === "loadFactor" ? r.loadFactor
        : (r.delta ?? -Infinity);
      const av = get(a), bv = get(b);
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return arr;
  }, [rows, sort, sortDir]);

  // KPI strip — summarize the dimension itself.
  const kpis = useMemo(() => {
    const active = rows.filter((r) => r.bookings > 0).length;
    const surging = rows.filter((r) => r.status === "Surging" || r.status === "New").length;
    const declining = rows.filter((r) => r.status === "Declining").length;
    const inactive = rows.filter((r) => r.status === "Inactive").length;
    return { total: rows.length, active, surging, declining, inactive };
  }, [rows]);

  const toggleSort = (col: RouteSort) => {
    if (sort === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSort(col); setSortDir("desc"); }
  };

  return (
    <div className="space-y-4">
      {/* Dimension KPI strip — summarizes the route portfolio itself. */}
      <div
        className="grid overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 divide-x divide-slate-100"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      >
        <DimKpi label="Routes active"    value={kpis.active}    caption={`of ${kpis.total} total`} />
        <DimKpi label="Surging routes"   value={kpis.surging}   caption="≥ +20% revenue vs prior period" tone="emerald" />
        <DimKpi label="Declining routes" value={kpis.declining} caption="≤ −15% revenue vs prior period" tone="rose" />
        <DimKpi label="Inactive routes"  value={kpis.inactive}  caption="no bookings in this range"        tone="slate" />
      </div>

      {/* Comparison chart — top routes this period vs the previous one,
          rendered as a two-series stacked-style horizontal bar so the eye
          immediately sees direction-of-change per route. */}
      <ComparisonBarsCard
        title="Top routes — this period vs prior"
        subtitle={`${dateRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${dateRange.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })} vs prior ${Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / 86_400_000) + 1} days`}
        items={rows
          .slice()
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8)
          .map((r) => ({
            label: `${r.origin} → ${r.destination}`,
            current: r.revenue,
            prior: r.priorRevenue,
          }))}
        prefix="₱"
      />

      {/* Full sortable table — every route, with deltas + status flags. */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
        <div className="flex items-baseline justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">All routes</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Sortable. Deltas compare to the prior {Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / 86_400_000) + 1}-day window.</p>
          </div>
        </div>
        {sortedRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">No routes have activity in either period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[10.5px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Route</th>
                  <SortableTh align="right" current={sort} dir={sortDir} col="bookings" onToggle={toggleSort}>Bookings</SortableTh>
                  <SortableTh align="right" current={sort} dir={sortDir} col="pax"      onToggle={toggleSort}>Pax</SortableTh>
                  <SortableTh align="right" current={sort} dir={sortDir} col="revenue"  onToggle={toggleSort}>Revenue</SortableTh>
                  <SortableTh align="right" current={sort} dir={sortDir} col="delta"    onToggle={toggleSort}>Δ vs prior</SortableTh>
                  <SortableTh align="right" current={sort} dir={sortDir} col="loadFactor" onToggle={toggleSort}>Load factor</SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((r) => (
                  <tr key={r.key} className="hover:bg-slate-50/60">
                    <td className="px-5 py-2.5"><RouteStatusBadge status={r.status} /></td>
                    <td className="px-5 py-2.5 text-[13px] font-semibold tracking-tight text-slate-900">{r.route}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-900">{r.bookings.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-700">{r.pax.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">₱{r.revenue.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right"><DeltaCell delta={r.delta} /></td>
                    <td className="px-5 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-700">
                      {r.voyages === 0 ? "—" : `${r.loadFactor.toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// Sortable column header — flips direction on repeat click, swaps target
// column on a different column click.
function SortableTh({
  children, col, current, dir, onToggle, align = "left",
}: {
  children: React.ReactNode;
  col: RouteSort;
  current: RouteSort;
  dir: "desc" | "asc";
  onToggle: (col: RouteSort) => void;
  align?: "left" | "right";
}) {
  const active = current === col;
  return (
    <th className={`px-5 py-2.5 font-medium ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onToggle(col)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-slate-900 ${active ? "text-slate-900" : "text-slate-500"}`}
      >
        {children}
        <span className="text-[9px]">{active ? (dir === "desc" ? "↓" : "↑") : "↕"}</span>
      </button>
    </th>
  );
}

// Performance flag badge — surfaces outliers at a glance.
function RouteStatusBadge({ status }: { status: "Surging" | "Healthy" | "Declining" | "Inactive" | "New" }) {
  const tone: Record<typeof status, string> = {
    Surging:   "bg-emerald-100 text-emerald-800",
    Healthy:   "bg-slate-100 text-slate-600",
    Declining: "bg-rose-50 text-rose-700",
    Inactive:  "bg-slate-50 text-slate-400",
    New:       "bg-sky-50 text-sky-700",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tone[status]}`}>
      {status}
    </span>
  );
}

// Delta cell — colored ▲/▼ pill against the prior period, or "—" / "New"
// when there's no comparable history.
function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="font-mono text-[11.5px] tabular-nums text-sky-600">New</span>;
  if (delta === 0) return <span className="font-mono text-[11.5px] tabular-nums text-slate-400">—</span>;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[11.5px] tabular-nums ${up ? "text-emerald-700" : "text-rose-700"}`}>
      <span>{up ? "▲" : "▼"}</span>
      <span>{Math.abs(delta).toFixed(1)}%</span>
    </span>
  );
}

// Dimension KPI cell — used by Routes (and reusable for other dimensional
// tabs later). Color tones reserved for status-tied metrics so the eye
// jumps to outliers.
function DimKpi({
  label, value, caption, tone = "slate",
}: {
  label: string;
  value: number;
  caption: string;
  tone?: "slate" | "emerald" | "rose";
}) {
  // Value text stays neutral; the tone reads from a pill on the caption row
  // (matching the dashboard KPI cards) rather than coloring the number.
  const pillTone =
    tone === "emerald" ? "text-emerald-700 bg-emerald-50 ring-emerald-200/60"
    : tone === "rose" ? "text-rose-700 bg-rose-50 ring-rose-200/60"
    : null;
  return (
    <div className="px-6 py-5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
        <CountUp value={value} />
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-500">
        {pillTone && (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${pillTone}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={`h-2.5 w-2.5 ${tone === "rose" ? "rotate-180" : ""}`}>
              <path d="M12 19V5" />
              <path d="m6 11 6-6 6 6" />
            </svg>
            {tone === "emerald" ? "Up" : "Down"}
          </span>
        )}
        {caption}
      </div>
    </div>
  );
}

// Comparison bars card — top entries with this-period vs prior-period
// values shown as two adjacent bars per row. Reads as "where am I now vs
// where I was" without needing to compute deltas mentally.
function ComparisonBarsCard({
  title, subtitle, items, prefix = "",
}: {
  title: string;
  subtitle?: string;
  items: { label: string; current: number; prior: number }[];
  prefix?: string;
}) {
  const max = Math.max(1, ...items.flatMap((i) => [i.current, i.prior]));
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-brand-500" />
            <span className="text-slate-600">This period</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-slate-300" />
            <span className="text-slate-600">Prior</span>
          </span>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center text-[12.5px] text-slate-400">No data in the selected range.</div>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((it) => (
            <li key={it.label} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_120px] items-center gap-3 text-[12.5px]">
              <span className="truncate font-medium tracking-tight text-slate-900" title={it.label}>{it.label}</span>
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${(it.current / max) * 100}%` }} />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-300 transition-[width] duration-300" style={{ width: `${(it.prior / max) * 100}%` }} />
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">{prefix}{it.current.toLocaleString()}</div>
                <div className="font-mono text-[11px] tabular-nums text-slate-400">{prefix}{it.prior.toLocaleString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─────────── Vessels ───────────
function VesselsTab({ bookings }: { bookings: Booking[] }) {
  const rows = useMemo(() => {
    const acc = new Map<string, { vessel: string; voyages: Set<string>; bookings: number; pax: number; revenue: number }>();
    bookings.forEach((b) => {
      const voyageKey = `${b.vesselName}|${b.departureDate.toISOString()}`;
      const existing = acc.get(b.vesselName);
      if (existing) {
        existing.bookings += 1;
        existing.pax += b.pax;
        existing.revenue += b.amount;
        existing.voyages.add(voyageKey);
      } else {
        acc.set(b.vesselName, {
          vessel: b.vesselName,
          voyages: new Set([voyageKey]),
          bookings: 1,
          pax: b.pax,
          revenue: b.amount,
        });
      }
    });
    return Array.from(acc.values())
      .map((v) => ({ ...v, voyages: v.voyages.size }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <ChartTableCard
      chart={
        <RankedBarChart
          title="Vessels — top by revenue"
          subtitle={`${rows.length} vessel${rows.length === 1 ? "" : "s"} active in the selected range`}
          items={rows.map((r) => ({ label: r.vessel, value: r.revenue }))}
          prefix="₱"
        />
      }
      breakdown={
        <PerformanceTable
          inset
          title="Vessels — detailed breakdown"
          empty="No vessel activity in the selected range."
          head={["#", "Vessel", "Voyages", "Bookings", "Passengers", "Revenue", "Share"]}
          rows={rows.map((r, i) => [
            <span key="i" className="font-mono text-[12px] tabular-nums text-slate-400">{i + 1}</span>,
            <span key="v" className="text-[13px] font-semibold tracking-tight text-slate-900">{r.vessel}</span>,
            <span key="vy" className="font-mono tabular-nums text-slate-900">{r.voyages}</span>,
            <span key="b" className="font-mono tabular-nums text-slate-900">{r.bookings}</span>,
            <span key="p" className="font-mono tabular-nums text-slate-900">{r.pax}</span>,
            <span key="rev" className="font-mono font-semibold tabular-nums text-slate-900">₱{r.revenue.toLocaleString()}</span>,
            <ShareBar key="s" pct={totalRevenue ? (r.revenue / totalRevenue) * 100 : 0} />,
          ])}
        />
      }
    />
  );
}

// ─────────── Voyages ───────────
// Per-sailing performance. Groups bookings by (vessel, departure date) so
// the operator can scan each individual voyage's load + revenue. Useful
// for spotting underperforming sailings the route/vessel aggregates hide.
function VoyagesTab({ bookings }: { bookings: Booking[] }) {
  const rows = useMemo(() => {
    type Row = {
      key: string;
      vessel: string;
      route: string;
      origin: string;
      destination: string;
      departure: Date;
      bookings: number;
      pax: number;
      revenue: number;
      cancelled: number;
    };
    const acc = new Map<string, Row>();
    bookings.forEach((b) => {
      const dd = new Date(b.departureDate);
      dd.setHours(0, 0, 0, 0);
      const key = `${b.vesselName}|${dd.toISOString()}|${b.routeOriginCode}-${b.routeDestinationCode}`;
      const existing = acc.get(key);
      if (existing) {
        existing.bookings += 1;
        existing.pax += b.pax;
        existing.revenue += b.amount;
        if (b.status === "Cancelled" || b.status === "Refunded") existing.cancelled += 1;
      } else {
        acc.set(key, {
          key,
          vessel: b.vesselName,
          route: `${b.routeOriginCity} → ${b.routeDestinationCity}`,
          origin: b.routeOriginCode,
          destination: b.routeDestinationCode,
          departure: b.departureDate,
          bookings: 1,
          pax: b.pax,
          revenue: b.amount,
          cancelled: b.status === "Cancelled" || b.status === "Refunded" ? 1 : 0,
        });
      }
    });
    return Array.from(acc.values())
      // Newest sailings first — operators usually scan recent voyages.
      .sort((a, b) => b.departure.getTime() - a.departure.getTime());
  }, [bookings]);

  const totalPax = rows.reduce((s, r) => s + r.pax, 0);

  return (
    <ChartTableCard
      chart={
        <RankedBarChart
          title="Voyages — top by revenue"
          subtitle={`${rows.length} voyage${rows.length === 1 ? "" : "s"} · ${totalPax.toLocaleString()} pax`}
          items={rows
            .slice()
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8)
            .map((r) => ({
              label: `${r.origin} → ${r.destination} · ${r.departure.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
              value: r.revenue,
            }))}
          prefix="₱"
        />
      }
      breakdown={
        <PerformanceTable
          inset
          title="Voyages — detailed breakdown"
          empty="No voyages in the selected range."
          head={["#", "Departure", "Vessel", "Route", "Bookings", "Pax", "Revenue", "Load"]}
          rows={rows.map((r, i) => {
            const loadPct = Math.min(100, (r.pax / TYPICAL_VOYAGE_CAPACITY) * 100);
            return [
              <span key="i" className="font-mono text-[12px] tabular-nums text-slate-400">{i + 1}</span>,
              <span key="d" className="text-[12.5px] font-medium tracking-tight text-slate-900">
                {r.departure.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>,
              <span key="v" className="text-[13px] font-semibold tracking-tight text-slate-900">{r.vessel}</span>,
              <span key="r" className="text-[12.5px] font-medium text-slate-700">{r.origin} → {r.destination}</span>,
              <span key="b" className="font-mono tabular-nums text-slate-900">{r.bookings}</span>,
              <span key="p" className="font-mono tabular-nums text-slate-900">{r.pax}</span>,
              <span key="rev" className="font-mono font-semibold tabular-nums text-slate-900">₱{r.revenue.toLocaleString()}</span>,
              <div key="load" className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${loadPct}%` }} />
                </div>
                <span className="font-mono text-[11px] tabular-nums text-slate-500">{loadPct.toFixed(0)}%</span>
              </div>,
            ];
          })}
        />
      }
    />
  );
}

// ─────────── Tickets ───────────
function TicketsTab({ bookings }: { bookings: Booking[] }) {
  const totals = useMemo(() => {
    let issued = 0, paid = 0, cancelled = 0, refunded = 0, pending = 0, comped = 0;
    const classMix: Record<"Economy" | "Tourist" | "Business", number> = { Economy: 0, Tourist: 0, Business: 0 };
    bookings.forEach((b) => b.tickets.forEach((t) => {
      issued += 1;
      classMix[t.fareClass] += 1;
      if (t.comped) comped += 1;
      if (t.status === "Paid") paid += 1;
      else if (t.status === "Cancelled") cancelled += 1;
      else if (t.status === "Refunded") refunded += 1;
      else if (t.status === "Pending") pending += 1;
    }));
    return { issued, paid, cancelled, refunded, pending, comped, classMix };
  }, [bookings]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 divide-x divide-slate-100">
        <KpiCell label="Tickets issued" value={totals.issued} />
        <KpiCell label="Paid"           value={totals.paid} />
        <KpiCell label="Cancelled"      value={totals.cancelled} />
        <KpiCell label="Refunded"       value={totals.refunded} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatusMixCard
          title="Fare class mix"
          slices={(["Economy", "Tourist", "Business"] as const).map((k) => ({
            key: k,
            label: k,
            count: totals.classMix[k],
            tone: k === "Economy" ? "bg-slate-100 text-slate-700" : k === "Tourist" ? "bg-sky-50 text-sky-700" : "bg-brand-50 text-brand-700",
          }))}
        />
        <div className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Comped seats</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Seats bundled free under a vehicle fee.</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold leading-none tracking-tight text-emerald-700 tabular-nums">
              <CountUp value={totals.comped} />
            </span>
            <span className="text-[12px] text-slate-500">
              of {totals.issued} tickets ({totals.issued ? ((totals.comped / totals.issued) * 100).toFixed(1) : "0.0"}%)
            </span>
          </div>
          <ProgressBar pct={totals.issued ? (totals.comped / totals.issued) * 100 : 0} tone="emerald" />
        </div>
      </div>
    </div>
  );
}

// ─────────── Bookings ───────────
function BookingsTab({ bookings }: { bookings: Booking[] }) {
  const mix = useMemo(() => bucketBookingStatus(bookings), [bookings]);
  const vehicleSplit = useMemo(() => {
    let withVehicle = 0, paxOnly = 0;
    bookings.forEach((b) => { if (b.vehicle) withVehicle += 1; else paxOnly += 1; });
    return { withVehicle, paxOnly };
  }, [bookings]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatusMixCard
          title="Booking status mix"
          slices={mix.map((s) => ({ key: s.key, label: statusLabel[s.key], count: s.count, tone: statusTone[s.key] }))}
        />
        <div className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Vehicle split</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Bookings with a vehicle slot vs passenger-only.</p>
          <div className="mt-4 space-y-3 text-[12.5px]">
            <SplitRow label="With vehicle" count={vehicleSplit.withVehicle} total={vehicleSplit.withVehicle + vehicleSplit.paxOnly} tone="brand" />
            <SplitRow label="Passenger only" count={vehicleSplit.paxOnly} total={vehicleSplit.withVehicle + vehicleSplit.paxOnly} tone="slate" />
          </div>
        </div>
      </div>

      <CancellationRefundCard bookings={bookings} />
    </div>
  );
}

// ─────────── Shared cells / atoms ───────────

// ─────────── ChartTableCard ───────────
// Wraps a chart and a breakdown table in one card, separated by a hairline.
// Used by Routes/Vessels (and anything else that benefits from same-data /
// two-views pairing).
function ChartTableCard({ chart, breakdown }: { chart: React.ReactNode; breakdown: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      {chart}
      <div className="border-t border-slate-100">{breakdown}</div>
    </section>
  );
}

// ─────────── RankedBarChart (horizontal bar chart for top-N entries) ───────────
// Pairs with a tabular breakdown below it (ElevenLabs-style). Shows up to
// `limit` entries as labeled brand-orange bars proportional to their value.
function RankedBarChart({
  title,
  subtitle,
  items,
  limit = 8,
  prefix = "",
  suffix = "",
}: {
  title: string;
  subtitle?: string;
  items: { label: string; value: number }[];
  limit?: number;
  prefix?: string;
  suffix?: string;
}) {
  const top = items.slice(0, limit);
  const max = Math.max(1, ...top.map((i) => i.value));
  return (
    <div className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {top.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center text-[12.5px] text-slate-400">No data in the selected range.</div>
      ) : (
        <ul className="mt-5 space-y-2">
          {top.map((it) => {
            const pct = (it.value / max) * 100;
            return (
              <li key={it.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_88px] items-center gap-3 text-[12.5px]">
                <span className="truncate font-medium tracking-tight text-slate-900" title={it.label}>{it.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-right font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
                  {prefix}{it.value.toLocaleString()}{suffix}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─────────── SummaryBand (Fireflies-style headline) ───────────
// A single rounded card with N zones, each containing 2-3 large tone-colored
// ─────────── KpiBand ───────────
// Operational KPI strip. Each cell has a clear hierarchy:
//   eyebrow label (Volume / Revenue / Capacity)
//   ↳ giant primary value + its short label
//   ↳ a quieter secondary stat with its own context caption
// All values stay slate-900 — the eyebrow + caption text provide the
// hierarchy, so we don't need colour tones to differentiate sections.
function KpiBand({
  cells,
}: {
  cells: {
    label: string;
    primary: { value: number; label: string; prefix?: string; suffix?: string };
    secondary: { value: number; label: string; prefix?: string; suffix?: string; caption?: string };
  }[];
}) {
  return (
    <div
      className="grid overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 divide-x divide-slate-100"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((c) => (
        <div key={c.label} className="px-6 py-5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{c.label}</div>

          {/* Primary stat — the headline number. */}
          <div className="mt-3">
            <div className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
              <CountUp value={c.primary.value} prefix={c.primary.prefix} suffix={c.primary.suffix} />
            </div>
            <div className="mt-1 text-[12px] font-medium text-slate-500">{c.primary.label}</div>
          </div>

          {/* Secondary stat — tucked under a hairline so it reads as
              supporting context, not a competing headline. */}
          <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-slate-500">{c.secondary.label}</div>
              {c.secondary.caption && (
                <div className="mt-0.5 text-[10.5px] text-slate-400 tabular-nums">{c.secondary.caption}</div>
              )}
            </div>
            <div className="text-[15px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
              {c.secondary.prefix ?? ""}{c.secondary.value.toLocaleString()}{c.secondary.suffix ?? ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiCell({ label, value, prefix }: { label: string; value: number; prefix?: string }) {
  return (
    <div className="relative px-6 py-5">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
          <CountUp value={value} prefix={prefix} />
        </span>
      </div>
    </div>
  );
}

function ShareBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-slate-500">{pct.toFixed(1)}%</span>
    </div>
  );
}

function ProgressBar({ pct, tone }: { pct: number; tone: "brand" | "emerald" | "slate" }) {
  const toneClass = tone === "brand" ? "bg-brand-500" : tone === "emerald" ? "bg-emerald-500" : "bg-slate-400";
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${toneClass} transition-[width] duration-300`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function SplitRow({ label, count, total, tone }: { label: string; count: number; total: number; tone: "brand" | "slate" }) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-slate-700">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-slate-500">{count} ({pct.toFixed(1)}%)</span>
      </div>
      <ProgressBar pct={pct} tone={tone === "brand" ? "brand" : "slate"} />
    </div>
  );
}

// ─────────── Performance table ───────────
function PerformanceTable({
  title, head, rows, empty, inset = false,
}: {
  title: string;
  head: string[];
  rows: React.ReactNode[][];
  empty: string;
  /** When true, drops the outer card chrome so the table can live inside
   *  a wrapping section (eg. ChartTableCard). */
  inset?: boolean;
}) {
  const outer = inset ? "" : "rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70";
  return (
    <section className={outer}>
      <div className={`px-5 py-4 ${inset ? "" : "border-b border-slate-100"}`}>
        <h2 className={`${inset ? "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400" : "text-base font-semibold tracking-tight text-slate-900"}`}>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                {head.map((h) => (
                  <th key={h} className="whitespace-nowrap px-6 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((cells, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  {cells.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-6 py-4 align-middle">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─────────── Status mix card (segmented bar + legend) ───────────
function StatusMixCard({
  title, slices,
}: {
  title: string;
  slices: { key: string; label: string; count: number; tone: string }[];
}) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-0.5 text-[11px] text-slate-500">{total} total</p>

      {/* Segmented bar — single horizontal strip, segments proportional. */}
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {slices.map((s) => {
          if (s.count === 0) return null;
          const pct = total ? (s.count / total) * 100 : 0;
          // Pick a solid bg from the tone classes (extract `bg-…`).
          const bg = s.tone.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-slate-300";
          return (
            <span
              key={s.key}
              style={{ width: `${pct}%` }}
              className={`h-full ${bg}`}
              title={`${s.label} — ${s.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <ul className="mt-3 space-y-1.5 text-[12.5px]">
        {slices.map((s) => {
          const pct = total ? (s.count / total) * 100 : 0;
          return (
            <li key={s.key} className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${s.tone}`}>
                {s.label}
              </span>
              <span className="font-mono tabular-nums text-slate-500">{s.count} <span className="text-slate-400">({pct.toFixed(1)}%)</span></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────── Cancellation + refund focused report ───────────
// ─────────── WeekdayDemandCard ───────────
// Bookings aggregated by day-of-week across the active range. Each row gets
// a horizontal volume bar so the operator can see weekend / weekday skew at
// a glance. Useful for staffing decisions without competing with the
// dimensional tabs (Routes / Vessels / Voyages).
function WeekdayDemandCard({ bookings }: { bookings: Booking[] }) {
  const rows = useMemo(() => {
    const order = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun
    const labels: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 0: "Sunday" };
    // `leadDaysSum` tallies how many days ahead each booking was made vs its
    // departure; we divide by the bookings count at the end for the average.
    const buckets = new Map<number, { dow: number; bookings: number; pax: number; revenue: number; cancelled: number; leadDaysSum: number; leadCount: number }>();
    order.forEach((dow) => buckets.set(dow, { dow, bookings: 0, pax: 0, revenue: 0, cancelled: 0, leadDaysSum: 0, leadCount: 0 }));
    bookings.forEach((b) => {
      const dow = new Date(b.bookingDate).getDay();
      const e = buckets.get(dow)!;
      e.bookings += 1;
      e.pax += b.pax;
      e.revenue += b.amount;
      if (b.status === "Cancelled" || b.status === "Refunded") e.cancelled += 1;
      const leadMs = b.departureDate.getTime() - b.bookingDate.getTime();
      if (leadMs >= 0) {
        e.leadDaysSum += leadMs / 86_400_000;
        e.leadCount += 1;
      }
    });
    return order.map((dow) => {
      const e = buckets.get(dow)!;
      return {
        label: labels[dow],
        dow: e.dow,
        bookings: e.bookings,
        pax: e.pax,
        revenue: e.revenue,
        cancelled: e.cancelled,
        avgLeadDays: e.leadCount ? e.leadDaysSum / e.leadCount : null,
      };
    });
  }, [bookings]);

  const totalBookings = rows.reduce((s, r) => s + r.bookings, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <div className="flex items-baseline justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Weekday demand</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">When customers book across the selected range.</p>
        </div>
        <span className="text-[11px] tabular-nums text-slate-500">
          {totalBookings} bookings · ₱{totalRevenue.toLocaleString()}
        </span>
      </div>
      {totalBookings === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-400">No bookings in the selected range.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/40 text-left text-[10.5px] uppercase tracking-[0.08em] text-slate-500">
              <th className="px-5 py-2.5 font-medium">Day</th>
              <th className="px-5 py-2.5 text-right font-medium">Bookings</th>
              <th className="px-5 py-2.5 text-right font-medium">Passengers</th>
              <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
              <th className="px-5 py-2.5 text-right font-medium">Avg lead time</th>
              <th className="px-5 py-2.5 text-right font-medium">Cancel rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const cancelRate = r.bookings ? (r.cancelled / r.bookings) * 100 : 0;
              return (
                <tr key={r.label} className="hover:bg-slate-50/60">
                  <td className="px-5 py-2.5 text-[12.5px] font-medium tracking-tight text-slate-900">{r.label}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-900">{r.bookings}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-slate-700">{r.pax}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">₱{r.revenue.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-500">
                    {r.avgLeadDays === null
                      ? "—"
                      : r.avgLeadDays < 1
                        ? "Same day"
                        : `${r.avgLeadDays.toFixed(1)} day${r.avgLeadDays >= 1.5 ? "s" : ""}`}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-500">
                    {cancelRate.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function CancellationRefundCard({ bookings }: { bookings: Booking[] }) {
  const stats = useMemo(() => {
    let cancelled = 0, refunded = 0;
    let cancelRev = 0, refundRev = 0, grossRev = 0;
    bookings.forEach((b) => {
      grossRev += b.amount;
      if (b.status === "Cancelled") { cancelled += 1; cancelRev += b.amount; }
      if (b.status === "Refunded")  { refunded  += 1; refundRev += b.amount; }
    });
    return {
      cancelled, refunded,
      total: bookings.length,
      cancelRev, refundRev, grossRev,
      cancelRate: bookings.length ? (cancelled / bookings.length) * 100 : 0,
      refundRate: bookings.length ? (refunded / bookings.length) * 100 : 0,
      refundShare: grossRev ? (refundRev / grossRev) * 100 : 0,
    };
  }, [bookings]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Cancellations & refunds</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Friction signal in the selected range.</p>
        </div>
        <span className="text-[11px] tabular-nums text-slate-500">{stats.total} total bookings</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <FrictionCell
          label="Cancellations"
          count={stats.cancelled}
          pct={stats.cancelRate}
          subline={`₱${stats.cancelRev.toLocaleString()} of bookings lost`}
          tone="slate"
        />
        <FrictionCell
          label="Refunds"
          count={stats.refunded}
          pct={stats.refundRate}
          subline={`₱${stats.refundRev.toLocaleString()} returned`}
          tone="sky"
        />
        <FrictionCell
          label="Refund share of revenue"
          count={Number(stats.refundShare.toFixed(1))}
          suffix="%"
          subline="Refunded ÷ gross revenue"
          tone="rose"
        />
      </div>
    </section>
  );
}

function FrictionCell({
  label, count, pct, suffix, subline, tone,
}: {
  label: string;
  count: number;
  pct?: number;
  suffix?: string;
  subline: string;
  tone: "slate" | "sky" | "rose";
}) {
  const toneText = tone === "sky" ? "text-sky-700" : tone === "rose" ? "text-rose-700" : "text-slate-800";
  return (
    <div className="rounded-xl bg-slate-50/60 px-4 py-3.5 ring-1 ring-slate-200/60">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={`text-[22px] font-semibold leading-none tracking-tight tabular-nums ${toneText}`}>
          {count}{suffix ?? ""}
        </span>
        {typeof pct === "number" && (
          <span className="text-[11px] tabular-nums text-slate-500">({pct.toFixed(1)}%)</span>
        )}
      </div>
      <p className="mt-1.5 text-[11.5px] text-slate-500">{subline}</p>
    </div>
  );
}

// ─────────── Aggregation helpers ───────────

function computeKpis(bookings: Booking[]) {
  let revenue = 0, passengers = 0;
  bookings.forEach((b) => { revenue += b.amount; passengers += b.pax; });
  return {
    bookings: bookings.length,
    revenue,
    passengers,
    avgFare: bookings.length ? revenue / bookings.length : 0,
  };
}

function buildDailyTrend(bookings: Booking[], range: DateRange) {
  // Walk every day in the range so we get a continuous x-axis even on
  // zero-revenue days.
  const days: { label: string; date: Date; revenue: number; bookings: number }[] = [];
  const start = new Date(range.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(0, 0, 0, 0);
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      date: new Date(cursor),
      revenue: 0,
      bookings: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  bookings.forEach((b) => {
    const bd = new Date(b.bookingDate);
    bd.setHours(0, 0, 0, 0);
    const idx = Math.round((bd.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (idx >= 0 && idx < days.length) {
      days[idx].revenue += b.amount;
      days[idx].bookings += 1;
    }
  });
  return days;
}

function bucketBookingStatus(bookings: Booking[]): { key: BookingStatus; count: number }[] {
  const order: BookingStatus[] = ["Confirmed", "Pending", "Cancelled", "Refunded"];
  const counts: Record<BookingStatus, number> = { Confirmed: 0, Pending: 0, Cancelled: 0, Refunded: 0 };
  bookings.forEach((b) => { counts[b.status] += 1; });
  return order.map((k) => ({ key: k, count: counts[k] }));
}

// Capacity / efficiency aggregates. Load factor is the most-watched ferry
// operator KPI — how full are our voyages — so it sits alongside Volume +
// Revenue as the third operational lens. We approximate each voyage's
// capacity at a typical Philippine ferry size since the booking record
// doesn't carry the source voyage's full configuration.
const TYPICAL_VOYAGE_CAPACITY = 150;
function computeCapacity(bookings: Booking[]) {
  // Voyages = unique (vessel, departure date) pairs.
  const voyageKeys = new Set<string>();
  const routeKeys = new Set<string>();
  const voyagePax = new Map<string, number>();
  bookings.forEach((b) => {
    // Skip terminal-state bookings since those seats were freed up.
    if (b.status === "Cancelled" || b.status === "Refunded") return;
    const dd = new Date(b.departureDate);
    dd.setHours(0, 0, 0, 0);
    const key = `${b.vesselName}|${dd.toISOString()}`;
    voyageKeys.add(key);
    routeKeys.add(`${b.routeOriginCode}|${b.routeDestinationCode}`);
    voyagePax.set(key, (voyagePax.get(key) ?? 0) + b.pax);
  });
  const voyages = voyageKeys.size;
  // Cap a voyage's load at 100% so a single oversold voyage doesn't drag
  // the avg above 100 (which would read as nonsensical).
  const factors = Array.from(voyagePax.values()).map((p) => Math.min(100, (p / TYPICAL_VOYAGE_CAPACITY) * 100));
  const loadFactor = factors.length ? factors.reduce((s, n) => s + n, 0) / factors.length : 0;
  return { voyages, routes: routeKeys.size, loadFactor };
}

// Tiny helper — rounded average for context captions ("3 pax / booking").
function avg(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 10) / 10 : 0;
}

function computeFriction(bookings: Booking[]) {
  let cancelled = 0, refunded = 0, grossRev = 0, refundRev = 0;
  bookings.forEach((b) => {
    grossRev += b.amount;
    if (b.status === "Cancelled") cancelled += 1;
    if (b.status === "Refunded")  { refunded += 1; refundRev += b.amount; }
  });
  return {
    cancelled,
    refunded,
    refundRev,
    cancelRate: bookings.length ? (cancelled / bookings.length) * 100 : 0,
    refundRate: bookings.length ? (refunded / bookings.length) * 100 : 0,
    refundShare: grossRev ? (refundRev / grossRev) * 100 : 0,
  };
}

// Pax + vehicle bookings aggregated across the active date range. Picks a
// bucket granularity (daily / weekly / monthly) based on how wide the range
// is, so the line chart never crowds. Output shape matches what the
// dashboard's TicketBookingsChart expects: `{ label, pax, veh }[]`.
function buildTicketBookingsSeries(bookings: Booking[], range: DateRange): { label: string; pax: number; veh: number }[] {
  const buckets = buildEvenBuckets(range);
  // Aggregate by bucket-membership.
  bookings.forEach((b) => {
    const bd = new Date(b.bookingDate);
    bd.setHours(0, 0, 0, 0);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (bd >= buckets[i].start) {
        (buckets[i] as Bucket & { pax: number; veh: number }).pax += b.pax;
        if (b.vehicle) (buckets[i] as Bucket & { pax: number; veh: number }).veh += 1;
        break;
      }
    }
  });
  return buckets.map((b) => ({ label: b.label, pax: (b as Bucket & { pax: number; veh: number }).pax ?? 0, veh: (b as Bucket & { pax: number; veh: number }).veh ?? 0 }));
}

type Bucket = { start: Date; label: string; pax?: number; veh?: number; revenue?: number; bookings?: number };

// Build a fixed-count bucket schedule across `range`. We target ~6 buckets
// because that's the sweet spot for half-card-width charts (matches what
// the dashboard's monthly chart does). Bucket size is derived from how
// many days the range spans so the count stays close to 6.
function buildEvenBuckets(range: DateRange): Bucket[] {
  const start = new Date(range.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);

  const TARGET = 6;
  // Step in days. For 30-day range → step 5; for 7-day → step 1; for 180-day → step 30.
  const step = Math.max(1, Math.ceil(days / TARGET));

  const buckets: Bucket[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const bStart = new Date(cursor);
    const label = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets.push({ start: bStart, label, pax: 0, veh: 0, revenue: 0, bookings: 0 });
    cursor.setDate(cursor.getDate() + step);
  }
  return buckets;
}

// Pads the ticket-bookings series with one empty bucket on each side so the
// dashboard chart's edge-anchored labels (positioned at 0% / 100% via
// percentage offsets) no longer collide with the first/last data dots when
// the card is narrow. The padding buckets have empty labels so they don't
// render text; the line still visually anchors at the first real value.
function padSeriesEdges(data: { label: string; pax: number; veh: number }[]): { label: string; pax: number; veh: number }[] {
  if (data.length === 0) return data;
  return [
    { label: "", pax: data[0].pax, veh: data[0].veh },
    ...data,
    { label: "", pax: data[data.length - 1].pax, veh: data[data.length - 1].veh },
  ];
}

// Revenue per bucket. Shares the even-bucket schedule with the ticket
// bookings series so both charts read at the same granularity / count.
function buildRevenueBuckets(bookings: Booking[], range: DateRange): { label: string; revenue: number; bookings: number }[] {
  const buckets = buildEvenBuckets(range);
  bookings.forEach((b) => {
    const bd = new Date(b.bookingDate);
    bd.setHours(0, 0, 0, 0);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (bd >= buckets[i].start) {
        buckets[i].revenue = (buckets[i].revenue ?? 0) + b.amount;
        buckets[i].bookings = (buckets[i].bookings ?? 0) + 1;
        break;
      }
    }
  });
  return buckets.map((b) => ({ label: b.label, revenue: b.revenue ?? 0, bookings: b.bookings ?? 0 }));
}

// ─────────── RevenueBarChart ───────────
// Daily-bar revenue chart across the active date range. Mirrors the
// dashboard's WeeklyRevenueChart vocabulary (peso ticks, dashed gridlines,
// `animate-bar` reveal, hover tooltips) but plots one bar per period across
// the entire range rather than one week side-by-side with the previous.
function RevenueBarChart({ data }: { data: { label: string; revenue: number; bookings: number }[] }) {
  const maxRaw = Math.max(0, ...data.map((d) => d.revenue));
  // Round to a nice peso tick step.
  const step = maxRaw === 0 ? 5000 : Math.max(1000, Math.round(maxRaw / 4 / 1000) * 1000);
  const yMax = Math.max(step, Math.ceil(maxRaw / step) * step);
  const ticks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map((t) => Math.round(t));
  const totalRev = data.reduce((s, d) => s + d.revenue, 0);

  const fmtPeso = (n: number) => {
    if (n === 0) return "₱0";
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${Math.round(n / 1_000)}k`;
    return `₱${n}`;
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Total revenue</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
            ₱{totalRev.toLocaleString()} across {data.length} bucket{data.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px]">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-brand-500" />
          <span className="text-slate-600">Daily revenue</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {/* Y axis labels */}
        <div className="flex h-56 w-12 flex-col-reverse justify-between pb-6 text-[11px] text-gray-400">
          {ticks.map((t) => (
            <div key={t} className="leading-none">{fmtPeso(t)}</div>
          ))}
        </div>

        {/* Plot column */}
        <div className="relative flex-1">
          {/* Gridlines */}
          <div className="absolute inset-0 bottom-6 flex flex-col-reverse justify-between">
            {ticks.map((t, i) => (
              <div
                key={t}
                className={i === 0 ? "border-t border-gray-300" : "border-t border-dashed border-gray-200"}
              />
            ))}
          </div>

          {/* Bars + inline x-axis labels — exact same anatomy as the
              dashboard's WeeklyRevenueChart so the visual reads identical
              at half-card width. Each column owns its own label so spacing
              follows the bars instead of fighting them. */}
          <div className="chart-bars relative flex h-56 items-end justify-between gap-3 pb-6">
            {data.map((d, i) => {
              const pct = yMax > 0 ? (d.revenue / yMax) * 100 : 0;
              // Flip the tooltip's anchor side once we're past the midpoint
              // so it never overflows the card edge on the right.
              const flipLeft = i >= Math.ceil(data.length / 2);
              return (
                <div key={d.label} className="bar-group group relative flex h-full flex-1 items-end justify-center">
                  <div
                    className="animate-bar w-4 rounded-t-sm bg-brand-500"
                    style={{ height: `${pct}%`, animationDelay: `${i * 90}ms` }}
                  />

                  {/* Tooltip — anchors to the bar's left side when this is
                      in the trailing half so it stays inside the card. */}
                  <div
                    className={
                      "tooltip pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-opacity duration-150 group-hover:opacity-100 " +
                      (flipLeft ? "right-full mr-0.5" : "left-full ml-0.5")
                    }
                    style={{ bottom: `${pct}%`, transform: "translateY(50%)" }}
                  >
                    <div className="mb-1 font-semibold text-gray-900">{d.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm bg-brand-500" />
                      <span className="text-gray-500">Revenue</span>
                      <span className="ml-auto font-medium text-gray-900">₱{d.revenue.toLocaleString()}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-gray-500">Bookings</span>
                      <span className="ml-auto font-medium text-gray-900 tabular-nums">{d.bookings}</span>
                    </div>
                  </div>

                  {/* Inline label below the bar, exactly like Weekly Revenue. */}
                  <div className="absolute bottom-0 translate-y-5 text-[11px] text-gray-500">{d.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// Synthesize ~90 days of historical bookings so the Reports charts have
// meaningful shape even when the operator hasn't accumulated much real data
// yet. We borrow the route/vessel identities from the user's real bookings
// (if any) so the synthetic data looks coherent with the live state; if
// there are none, we fall back to a small fixed pool.
function synthesizeBackfillBookings(real: Booking[]): Booking[] {
  const DAYS_BACK = 90;
  const TARGET_PER_DAY = 6; // ~6 bookings/day across 90 days → ~540 records
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sample route + vessel identities from the real data, or fall back to a
  // canned mini-catalog so charts still render on a blank install.
  const sample = real.length > 0 ? real : null;
  const routes = sample
    ? Array.from(new Set(sample.map((b) => `${b.routeOriginCode}|${b.routeDestinationCode}|${b.routeOriginCity}|${b.routeDestinationCity}|${b.vesselName}`)))
    : [
        "BCD|TAG|Cebu|Tagbilaran|MV Reina del Cielo",
        "CEB|ORM|Cebu|Ormoc|MV Filipinas Cebu",
        "MNL|CYZ|Manila|Coron|2GO Masinloc",
      ];

  const bookings: Booking[] = [];
  // Stable rng so the same admin sees the same chart shape across reloads.
  let s = 42;
  const rand = () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };

  for (let d = DAYS_BACK; d >= 0; d--) {
    const baseDate = new Date(today);
    baseDate.setDate(baseDate.getDate() - d);
    // Weekend bump — Saturdays/Sundays get more bookings.
    const dow = baseDate.getDay();
    const weekend = dow === 0 || dow === 6;
    const dailyCount = Math.round(TARGET_PER_DAY * (weekend ? 1.6 : 1) * (0.6 + rand() * 0.9));
    for (let i = 0; i < dailyCount; i++) {
      const routeKey = routes[Math.floor(rand() * routes.length)];
      const [oc, dc, ocity, dcity, vesselName] = routeKey.split("|");
      // Skewed hour-of-day — three booking peaks (morning commute, lunch
      // break, evening) so the weekday "Peak hour" column shows realistic
      // spread instead of every weekday landing at 12 AM.
      const hourRoll = rand();
      const hour =
        hourRoll < 0.35 ? 7 + Math.floor(rand() * 3)   // 7-9 AM
        : hourRoll < 0.65 ? 11 + Math.floor(rand() * 3) // 11 AM - 1 PM
        : hourRoll < 0.92 ? 17 + Math.floor(rand() * 3) // 5-7 PM
        : Math.floor(rand() * 24);                      // long tail
      const pax = 1 + Math.floor(rand() * 4);
      const fare = 800 + Math.floor(rand() * 2200);
      const amount = pax * fare + (rand() < 0.3 ? 1500 : 0);
      // Status mix: 70% Confirmed, 18% Pending, 8% Cancelled, 4% Refunded.
      const roll = rand();
      const status: BookingStatus =
        roll < 0.7 ? "Confirmed" : roll < 0.88 ? "Pending" : roll < 0.96 ? "Cancelled" : "Refunded";
      const bookingDate = new Date(baseDate);
      bookingDate.setHours(hour, Math.floor(rand() * 60), 0, 0);
      const departureDate = new Date(bookingDate);
      departureDate.setDate(departureDate.getDate() + 1 + Math.floor(rand() * 7));
      bookings.push({
        ref: `SYN-${d}-${i}`,
        ticketholder: "Synthetic Pax",
        pax,
        routeOriginCode: oc,
        routeDestinationCode: dc,
        routeOriginCity: ocity,
        routeDestinationCity: dcity,
        vesselName,
        departureDate,
        amount,
        status,
        bookingDate,
        contactMobile: "+63 900 000 0000",
        contactEmail: "synthetic@example.com",
        paymentMethod: "Tripket Wallet",
        paymentStatus: status === "Cancelled" || status === "Refunded" ? "Refunded" : status === "Pending" ? "Pending" : "Paid",
        tickets: [],
      });
    }
  }
  return bookings;
}

function bucketTicketStatus(bookings: Booking[]): { key: TicketStatus; count: number }[] {
  const order: TicketStatus[] = ["Pending", "Paid", "Cancelled", "Refunded"];
  const counts: Record<TicketStatus, number> = { Pending: 0, Paid: 0, Cancelled: 0, Refunded: 0 };
  bookings.forEach((b) => b.tickets.forEach((t) => { counts[t.status] += 1; }));
  return order.map((k) => ({ key: k, count: counts[k] }));
}
