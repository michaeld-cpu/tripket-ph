"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastContext";
import RowMenu from "./RowMenu";

type Pending = {
  ref: string;
  passenger: string;
  pax: number;
  routeFromCode: string;
  routeFromCity: string;
  routeToCode: string;
  routeToCity: string;
  vessel: string;
  vesselType: "RoRo" | "Fast Craft" | "Passenger Ship";
  operator: string;
  voyageId: string;
  departure: string;
  amount: number;
  // Submitted = paid, awaiting operator approval (was "Pending").
  status: "Submitted" | "Confirmed" | "Cancelled";
  bookingDate: string;
  ageMinutes: number;
};

// Unified status palette — matches the bookings table sitewide.
const statusTone: Record<Pending["status"], string> = {
  Submitted: "bg-brand-50 text-brand-700",
  Confirmed: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-slate-100 text-slate-500",
};

function relativeAge(mins: number): string {
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`;
}

export default function PendingAgingList({ data }: { data: Pending[] }) {
  const sorted = [...data].sort((a, b) => b.ageMinutes - a.ageMinutes);
  const over1h = sorted.filter(d => d.ageMinutes >= 60).length;
  const under1h = sorted.length - over1h;
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  // Deep-link into the Bookings page. The bookings page already supports
  // `?ref=…` to auto-open the detail dialog; `?action=approve` triggers
  // the batch approval flow on top of that. Lets the dashboard's pending
  // list act as a one-tap shortcut from "I see a pending row here" to
  // "I'm now editing/approving it on the bookings page."
  const openBooking = (ref: string, action?: "approve") => {
    const params = new URLSearchParams({ ref });
    if (action) params.set("action", action);
    router.push(`/bookings?${params.toString()}`);
  };

  const handleCopy = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedRef(ref);
      showToast(`Ticket reference ${ref} copied`);
      setTimeout(() => setCopiedRef(prev => (prev === ref ? null : prev)), 1500);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      {/* Section header */}
      <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Pending bookings</h2>
            <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-700">
              {sorted.length} awaiting action
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{over1h}</span> aging past 1h ·{" "}
            <span className="font-medium text-slate-700">{under1h}</span> recent · sorted oldest first
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]">
          View all
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </header>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
            <th className="px-6 py-2.5 font-medium">Ref</th>
            <th className="px-2 py-2.5 font-medium">Status</th>
            <th className="px-2 py-2.5 font-medium">Ticketholder</th>
            <th className="px-2 py-2.5 font-medium">Route &amp; vessel</th>
            <th className="px-2 py-2.5 font-medium">Departure</th>
            <th className="px-2 py-2.5 font-medium">Amount</th>
            <th className="px-2 py-2.5 font-medium">Booked</th>
            <th className="w-10 px-6 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map(d => {
            const tone = statusTone[d.status];
            const aged = d.ageMinutes >= 60;
            return (
              <tr
                key={d.ref}
                onClick={() => openBooking(d.ref)}
                className="group relative cursor-pointer transition-colors duration-150 ease-out hover:bg-slate-50/60 focus-within:bg-slate-50/60"
                tabIndex={0}
                role="link"
                aria-label={`Open booking ${d.ref}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openBooking(d.ref);
                  }
                }}
              >
                {/* Left brand accent — fades in on hover */}
                <td className="relative px-6 py-3.5 align-middle">
                  <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-[12px] font-semibold tracking-tight text-slate-900">{d.ref}</span>
                    {copiedRef === d.ref ? (
                      <span aria-label="Copied" className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                          <path d="M5 12l5 5 9-11" />
                        </svg>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(d.ref); }}
                        aria-label={`Copy ${d.ref}`}
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

                {/* Status */}
                <td className="px-2 py-3.5 align-middle">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
                    {d.status}
                  </span>
                </td>

                {/* Ticketholder */}
                <td className="px-2 py-3.5 align-middle">
                  <div className="font-medium tracking-tight text-slate-900">{d.passenger}</div>
                  <div className="text-[11px] text-slate-500">
                    <span className="tabular-nums">{d.pax}</span> {d.pax === 1 ? "passenger" : "passengers"}
                  </div>
                </td>

                {/* Route + vessel */}
                <td className="px-2 py-3.5 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-1.5 text-slate-900">
                      <span className="font-mono text-[13px] font-bold tracking-wide">{d.routeFromCode}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-brand-500">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                      <span className="font-mono text-[13px] font-bold tracking-wide">{d.routeToCode}</span>
                    </div>
                    <span className="h-5 w-px bg-slate-200" />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-slate-700">{d.vessel}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        {d.operator} · <span className="font-mono">{d.voyageId}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Departure */}
                <td className="px-2 py-3.5 align-middle">
                  <div className="text-[13px] font-medium tabular-nums text-slate-700">{d.departure}</div>
                </td>

                {/* Amount */}
                <td className="px-2 py-3.5 align-middle">
                  <span className="font-semibold tabular-nums text-slate-900">₱{d.amount.toLocaleString()}</span>
                </td>

                {/* Booked + age */}
                <td className="px-2 py-3.5 align-middle">
                  <div className="text-[12px] text-slate-600 tabular-nums">{d.bookingDate}</div>
                  <div className={`text-[11px] tabular-nums ${aged ? "text-amber-600" : "text-slate-400"}`}>
                    {relativeAge(d.ageMinutes)}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                  <RowMenu
                    ariaLabel={`Actions for ${d.ref}`}
                    items={[
                      {
                        label: "Open booking",
                        onClick: () => openBooking(d.ref),
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M14 3h7v7" />
                            <path d="M21 3l-9 9" />
                            <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                          </svg>
                        ),
                      },
                      {
                        label: "Approve booking",
                        onClick: () => openBooking(d.ref, "approve"),
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M5 12l5 5 9-11" />
                          </svg>
                        ),
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
