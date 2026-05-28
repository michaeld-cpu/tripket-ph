"use client";
import type { ActivityEntry, ActivityKind } from "@/lib/bookings-data";

/**
 * ActivityLog — ClickUp-style audit rail for the booking/ticket dialogs.
 * Lives in the dialog's right column. The header is pinned to the top; entries
 * flow newest → oldest top-to-bottom so the latest action reads first.
 *
 * Each event is a small tinted node on a soft spine, with an actor avatar and
 * a relative timestamp. Tones follow the project palette: brand orange for the
 * creation anchor, emerald for settlement, sky for refunds/info, rose for
 * cancellations.
 */

type Tone = { node: string; ring: string; icon: JSX.Element };

const KIND_STYLE: Record<ActivityKind, Tone> = {
  created:     { node: "bg-brand-500",   ring: "ring-brand-100",   icon: <path d="M12 5v14M5 12h14" /> },
  approved:    { node: "bg-emerald-500", ring: "ring-emerald-100", icon: <path d="M5 12l5 5 9-11" /> },
  paid:        { node: "bg-emerald-500", ring: "ring-emerald-100", icon: <path d="M5 12l5 5 9-11" /> },
  ticket_paid: { node: "bg-emerald-500", ring: "ring-emerald-100", icon: <path d="M5 12l5 5 9-11" /> },
  refunded:    { node: "bg-sky-500",     ring: "ring-sky-100",     icon: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></> },
  cancelled:   { node: "bg-rose-500",    ring: "ring-rose-100",    icon: <path d="M6 6l12 12M18 6 6 18" /> },
  edited:      { node: "bg-brand-500",   ring: "ring-brand-100",   icon: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></> },
  note:        { node: "bg-slate-400",   ring: "ring-slate-100",   icon: <><path d="M8 10h8M8 14h5" /><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></> },
};

// Avatar — brand orange to match the vessel avatar (System stays neutral).
function avatarFor(name: string) {
  if (name === "System") return { initials: "SY", cls: "bg-slate-200 text-slate-600" };
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  return { initials, cls: "bg-brand-100 text-brand-600" };
}

function relativeTime(d: Date): string {
  const diffMin = Math.round((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  // Newest → oldest top-to-bottom (entries already arrive newest-first).
  const ordered = entries;

  return (
    <aside className="flex min-h-0 w-full flex-col bg-gradient-to-b from-slate-50/40 to-slate-50/70">
      {/* Header */}
      <div className="flex shrink-0 items-baseline gap-2 border-b border-slate-100 px-5 py-4">
        <h3 className="text-[12.5px] font-semibold tracking-tight text-slate-900">Activity</h3>
        <span className="text-[10.5px] text-slate-400">{ordered.length} event{ordered.length === 1 ? "" : "s"}</span>
      </div>

      {/* Scroll area; inner list pushed to the bottom (mt-auto). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        {ordered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-300 ring-1 ring-slate-200/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <p className="mt-2.5 text-[12px] font-medium text-slate-400">No activity yet</p>
            <p className="mt-0.5 text-[11px] text-slate-300">Status changes will appear here.</p>
          </div>
        ) : (
          <ol className="relative">
            {/* Soft spine connecting the nodes (stops short of the last node). */}
            <span aria-hidden className="absolute left-[11px] top-2 bottom-5 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
            {ordered.map((e, i) => {
              const tone = KIND_STYLE[e.kind];
              const av = avatarFor(e.actor);
              const isLast = i === ordered.length - 1;
              return (
                <li key={e.id} className={"relative flex gap-3 " + (isLast ? "" : "pb-4")}>
                  {/* Event node */}
                  <span className={`relative z-[1] mt-0.5 grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full ${tone.node} text-white shadow-[0_1px_2px_rgba(15,23,42,0.15)] ring-4 ring-slate-50`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-[11px] w-[11px]">
                      {tone.icon}
                    </svg>
                  </span>

                  {/* Card */}
                  <div className="min-w-0 flex-1 rounded-lg border border-slate-200/70 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] font-semibold tracking-tight text-slate-900">{e.title}</span>
                      <span className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-slate-400">{relativeTime(e.at)}</span>
                    </div>
                    {e.detail && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{e.detail}</div>}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-md text-[8px] font-bold ${av.cls}`}>
                        {av.initials}
                      </span>
                      <span className="truncate text-[10.5px] font-medium text-slate-500">{e.actor}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
