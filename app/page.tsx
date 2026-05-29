"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import WeeklyRevenueChart from "@/components/WeeklyRevenueChart";
import TicketBookingsChart from "@/components/TicketBookingsChart";
import PendingAgingList from "@/components/PendingAgingList";
import DepartureBoard from "@/components/DepartureBoard";
import { fetchDashboardData, type LineDashboard } from "@/lib/dashboard-data";
import {
  KPICardSkeleton,
  ChartCardSkeleton,
  TableSkeleton,
  DepartureBoardSkeleton,
} from "@/components/Skeleton";
import CountUp from "@/components/CountUp";

export default function DashboardPage() {
  const { active } = useShippingLine();
  const [data, setData] = useState<LineDashboard | null>(null);

  // Fetch on mount and on shipping-line switch — loading state mirrors the actual promise lifecycle
  useEffect(() => {
    let cancelled = false;
    setData(null); // show skeletons immediately
    fetchDashboardData(active.id).then(result => {
      if (!cancelled) setData(result);
    });
    return () => { cancelled = true; };
  }, [active.id]);

  const loading = data === null;
  const kpi = data?.kpi;
  const isEmpty = !!kpi && kpi.totalRevenue === 0 && kpi.ticketsIssued === 0;

  type CardSpec = { label: string; numeric: number; prefix?: string; trend: number };
  const cards: CardSpec[] = kpi
    ? [
        { label: "Total Revenue",    numeric: kpi.totalRevenue,    prefix: "₱", trend: kpi.trends.revenue },
        { label: "Tickets Issued",   numeric: kpi.ticketsIssued,                trend: kpi.trends.tickets },
        { label: "Cancellations",    numeric: kpi.cancellations,                trend: kpi.trends.cancellations },
        { label: "Vehicle Bookings", numeric: kpi.vehicleBookings,              trend: kpi.trends.vehicles },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={active.name} />

      {!loading && isEmpty && (
        <div className="mb-5 flex items-center gap-3 border-b border-slate-200/70 pb-4 text-[13px]">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
          <span className="text-slate-700">
            <span className="font-medium tracking-tight text-slate-900">{active.name}</span>
            <span className="text-slate-500"> is not yet onboarded. </span>
            All metrics show zero until vessels, routes, and bookings are registered.
          </span>
        </div>
      )}

      {/* KPI strip — anti-card grouping with divide-x hairlines; flat surface, no shadow */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 divide-x divide-slate-100">
          {cards.map(c => {
            const up = c.trend >= 0;
            const trendTone = up ? "text-emerald-700 bg-emerald-50 ring-emerald-200/60" : "text-rose-700 bg-rose-50 ring-rose-200/60";
            return (
              <div key={c.label} className="relative px-6 py-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{c.label}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
                    <CountUp value={c.numeric} prefix={c.prefix} />
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ring-1 ${trendTone}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 ${up ? "" : "rotate-180"}`}>
                      <path d="M12 19V5" />
                      <path d="m6 11 6-6 6 6" />
                    </svg>
                    {Math.abs(c.trend)}%
                  </span>
                  <span className="text-[11px] text-slate-500">vs. last month</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!data ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </div>
          <div className="mt-6"><TableSkeleton /></div>
          <div className="mt-6"><DepartureBoardSkeleton /></div>
        </>
      ) : isEmpty ? (
        // Onboarding state — when the line has no vessels/bookings yet,
        // every downstream chart and list is meaningless (zeroed bars,
        // empty rows). Collapse the lot into a single empty card so the
        // page reads as "nothing to see yet" instead of "broken charts."
        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-20 text-center ring-1 ring-slate-200/40">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 9h10M7 13h10M7 17h6" />
            </svg>
          </div>
          <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-slate-900">No activity to chart yet</h3>
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-slate-500">
            Once <span className="font-medium text-slate-700">{active.name}</span> registers vessels and routes and books its first voyages, weekly revenue, booking trends, pending approvals, and today&apos;s departures will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <WeeklyRevenueChart data={data.weeklyRevenue} />
            <TicketBookingsChart data={data.bookings6M} />
          </div>

          <div className="mt-6">
            <PendingAgingList data={data.pending} />
          </div>

          <div className="mt-6">
            <DepartureBoard data={data.departures} />
          </div>
        </>
      )}
    </div>
  );
}
