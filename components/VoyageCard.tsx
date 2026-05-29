"use client";

/**
 * VoyageCard — shared "boarding-pass-style" card for voyages.
 *
 * Used in two surfaces today:
 *  - Vessel detail page: the live "In Transit" card and the ghost
 *    cards for past sailings.
 *  - Schedule wizard Review step: previews the weekly schedule as a
 *    single card so operators see what they're about to create.
 *
 * Anatomy:
 *  ┌─ ghost band (orange for active, slate for past) ──────────────┐
 *  │                          ● STATUS LABEL                       │
 *  │  ┌──────────────────  white content panel  ────────────────┐  │
 *  │  │  [logo] Vessel Name  TYPE                                │  │
 *  │  │         Shipping line name                               │  │
 *  │  │  date row (left + right)                                 │  │
 *  │  │  TIME       ──── progress bar ────       TIME           │  │
 *  │  │  CODE         DURATION LABEL              CODE           │  │
 *  │  │  city                                     city           │  │
 *  │  └──────────────────────────────────────────────────────────┘  │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * `tone` switches the entire palette — "active" = brand orange, "ghost"
 * = slate. No controls on the card; consumers add their own surrounding
 * affordances if needed.
 */
export default function VoyageCard({
  tone, statusLabel, vesselName, vesselType, lineName,
  dateLabel, dateLabelEnd,
  fromCode, fromCity, fromTime, toCode, toCity, toTime,
  durationLabel, progress,
}: {
  tone: "active" | "ghost";
  statusLabel: string;
  vesselName: string;
  vesselType: string;
  lineName: string;
  /** Date shown on the left under the vessel header. */
  dateLabel: string;
  /** Date shown on the right. Defaults to `dateLabel` (single-day voyage). */
  dateLabelEnd?: string;
  fromCode: string;
  fromCity: string;
  fromTime: string;
  toCode: string;
  toCity: string;
  toTime: string;
  durationLabel: string;
  /** 0..1 — fills the route bar from the origin side. */
  progress: number;
}) {
  const active = tone === "active";
  const frameBg = active
    ? "radial-gradient(140% 80% at 100% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #fed7aa 0%, #fdba74 60%, #fb923c 100%)"
    : "radial-gradient(140% 80% at 100% 0%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)";
  const dotCls = active ? "bg-brand-600" : "bg-slate-400";
  const statusTextCls = active ? "text-brand-700" : "text-slate-500";
  const codeCls = active ? "text-slate-900" : "text-slate-500";
  const railCls = active ? "bg-brand-500" : "bg-slate-400";
  const railTrackCls = active ? "bg-brand-100" : "bg-slate-200";
  const shadow = active
    ? "shadow-[0_1px_2px_rgba(15,23,42,0.06),0_16px_36px_-12px_rgba(234,88,12,0.45)]"
    : "shadow-[0_1px_2px_rgba(15,23,42,0.03),0_6px_16px_-8px_rgba(15,23,42,0.08)]";
  const pct = Math.max(0, Math.min(1, progress)) * 100;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl p-2 ${shadow}`}
      style={{ backgroundImage: frameBg }}
    >
      {/* Status band — sits on the frame above the white panel, centered. */}
      <div className="flex items-center justify-center px-3 pt-1.5 pb-2.5">
        <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] ${statusTextCls}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotCls}`} />
          {statusLabel}
        </span>
      </div>

      {/* Inner white content panel */}
      <div className="overflow-hidden rounded-xl bg-white">
        {/* Header — vessel identity + line */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M3 17h18l-2 3H5l-2-3Z" />
              <rect x="5" y="11" width="14" height="6" rx="1" />
              <path d="M8 11V7h8v4" />
              <path d="M12 7V4" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{vesselName}</span>
              <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-700 ring-1 ring-emerald-200/70">
                {vesselType}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12px] text-slate-500">{lineName}</div>
          </div>
        </div>

        {/* Dates row */}
        <div className="flex items-center justify-between gap-3 px-4 pb-1.5">
          <span className="text-[11.5px] text-slate-500">{dateLabel}</span>
          <span className="text-[11.5px] text-slate-500">{dateLabelEnd ?? dateLabel}</span>
        </div>

        {/* Times + port codes + cities */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 px-4 pt-1.5">
          <div className="min-w-0">
            <div className="font-mono text-[26px] font-semibold leading-none tracking-tight text-slate-900">{fromTime}</div>
            <div className="mt-1.5 font-mono text-[28px] font-extrabold leading-none tracking-[0.02em] text-slate-900">{fromCode}</div>
            <div className="mt-1 truncate text-[12px] text-slate-500">{fromCity}</div>
          </div>

          {/* Route bar — orange/gray filled segment with a duration label centered */}
          <div className="flex w-[200px] flex-col items-center gap-1.5 self-center pb-1">
            <div className={`relative h-1 w-full rounded-full ${railTrackCls}`}>
              <span
                aria-hidden
                className={`absolute left-0 top-0 h-full rounded-full ${railCls}`}
                style={{ width: `${pct}%` }}
              />
              <span
                aria-hidden
                className={`absolute -top-[3px] h-2.5 w-2.5 -translate-x-1/2 rounded-full ${railCls} ring-2 ring-white`}
                style={{ left: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] font-semibold tabular-nums uppercase tracking-wider text-slate-500">
              {durationLabel}
            </span>
          </div>

          <div className="min-w-0 text-right">
            <div className="font-mono text-[26px] font-semibold leading-none tracking-tight text-slate-900">{toTime}</div>
            <div className={`mt-1.5 font-mono text-[28px] font-extrabold leading-none tracking-[0.02em] ${codeCls}`}>{toCode}</div>
            <div className="mt-1 truncate text-[12px] text-slate-500">{toCity}</div>
          </div>
        </div>

        <div className="pb-4" />
      </div>
    </article>
  );
}
