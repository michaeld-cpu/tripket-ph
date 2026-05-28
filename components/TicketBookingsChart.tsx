"use client";
import { useMemo, useRef, useState } from "react";

type Point = { label: string; pax: number; veh: number };

const W = 760;
const H = 200;

function fmtTick(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

function smoothPath(points: { x: number; y: number }[]) {
  // Plateau-with-curve style: each data point sits on a short flat segment,
  // then a soft S-curve transitions to the next plateau (like the reference chart).
  if (points.length < 2) return "";
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  const plateauFrac = 0.22; // each side of the data point gets a flat portion
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const flatEndX = p1.x + dx * plateauFrac;       // end of p1's plateau
    const flatStartX = p2.x - dx * plateauFrac;     // start of p2's plateau
    // Hold p1's plateau
    d.push(`L ${flatEndX} ${p1.y}`);
    // Soft S-curve into p2's plateau — control points spread wide for a gentle bend
    const c1x = flatEndX + (flatStartX - flatEndX) * 0.5;
    const c2x = flatStartX - (flatStartX - flatEndX) * 0.5;
    d.push(`C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${flatStartX} ${p2.y}`);
    // Hold p2's plateau through to the data point
    d.push(`L ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

export default function TicketBookingsChart({ data, showTotal = true }: { data: Point[]; showTotal?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (i: number) => {
    // If a leave-timer is pending, cancel it — we're back in the chart
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (hover !== null) {
      // Already showing — switch immediately, no delay
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      setHover(i);
    } else {
      // Not showing — wait 200ms before first appearance
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => {
        setHover(i);
        hoverTimer.current = null;
      }, 200);
    }
  };
  const handleLeave = () => {
    // Cancel pending first-show
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    // Brief grace period so sweeping between hit zones doesn't flash off
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      setHover(null);
      leaveTimer.current = null;
    }, 80);
  };

  const { paxPts, vehPts, paxArea, vehArea, paxLine, vehLine, ticks } = useMemo(() => {
    const maxRaw = Math.max(...data.map(d => Math.max(d.pax, d.veh)));
    const niceMax = Math.ceil(maxRaw / 200) * 200;
    const yMax = niceMax + (niceMax % 400 === 0 ? 0 : 400 - (niceMax % 400));
    const steps = 4;
    const ticks = Array.from({ length: steps + 1 }, (_, i) => Math.round((yMax / steps) * i));

    const stepX = W / Math.max(1, data.length - 1);
    const project = (val: number, i: number) => ({
      x: i * stepX,
      y: (1 - val / yMax) * H,
    });

    const paxPts = data.map((d, i) => project(d.pax, i));
    const vehPts = data.map((d, i) => project(d.veh, i));
    const paxLine = smoothPath(paxPts);
    const vehLine = smoothPath(vehPts);
    const paxArea = `${paxLine} L ${paxPts.at(-1)!.x} ${H} L ${paxPts[0].x} ${H} Z`;
    const vehArea = `${vehLine} L ${vehPts.at(-1)!.x} ${H} L ${vehPts[0].x} ${H} Z`;

    return { paxPts, vehPts, paxArea, vehArea, paxLine, vehLine, ticks };
  }, [data]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Total ticket bookings</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Passengers + vehicles</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-brand-500" />
            <span className="text-slate-600">Pax</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-blue-500" />
            <span className="text-slate-600">Veh</span>
          </div>
        </div>
      </div>

      {/* Outer grid identical to WeeklyRevenueChart: Y col + plot column */}
      <div className="mt-6 flex gap-3">
        {/* Y axis labels — same column width and font as Weekly Revenue */}
        <div className="flex h-56 w-12 flex-col-reverse justify-between pb-6 text-[11px] text-gray-400">
          {ticks.map(t => (
            <div key={t} className="leading-none">{fmtTick(t)}</div>
          ))}
        </div>

        {/* Plot area */}
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

          {/* Plot area (chart marks) */}
          <div className="relative h-56 pb-6">
            <div className="relative h-full w-full">
              {/* Lines + areas — clipped reveal from left to right */}
              <div className="absolute inset-0 animate-reveal-lr">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="paxFill6" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="vehFill6" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <path d={vehArea} fill="url(#vehFill6)" />
                  <path d={vehLine} fill="none" stroke="#3b82f6" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={paxArea} fill="url(#paxFill6)" />
                  <path d={paxLine} fill="none" stroke="#ea580c" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* HTML dots — pop in synced with the reveal */}
              {paxPts.map((p, i) => (
                <div
                  key={`pd-${i}`}
                  className="animate-dot absolute h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{
                    left: `${(p.x / W) * 100}%`,
                    top: `${(p.y / H) * 100}%`,
                    backgroundColor: "#ea580c",
                    animationDelay: `${(p.x / W) * 1300}ms`,
                  }}
                />
              ))}
              {vehPts.map((p, i) => (
                <div
                  key={`vd-${i}`}
                  className="animate-dot absolute h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{
                    left: `${(p.x / W) * 100}%`,
                    top: `${(p.y / H) * 100}%`,
                    backgroundColor: "#3b82f6",
                    animationDelay: `${(p.x / W) * 1300}ms`,
                  }}
                />
              ))}

              {/* Hover crosshair */}
              {hover !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px border-l border-dashed border-gray-400"
                  style={{ left: `${(paxPts[hover].x / W) * 100}%` }}
                />
              )}

              {/* Hover hit zones */}
              {data.map((d, i) => {
                const colWPct = 100 / data.length;
                return (
                  <div
                    key={`hit-${d.label}`}
                    className="absolute top-0 bottom-0"
                    style={{ left: `${(paxPts[i].x / W) * 100 - colWPct / 2}%`, width: `${colWPct}%` }}
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={handleLeave}
                  />
                );
              })}

              {/* Tooltip */}
              {(() => {
                const idx = hover ?? 0;
                const d = data[idx];
                const xPct = (paxPts[idx].x / W) * 100;
                const flipLeft = xPct > 70;
                const yPct = (Math.min(paxPts[idx].y, vehPts[idx].y) / H) * 100;
                return (
                  <div
                    className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-opacity duration-200 ease-out ${
                      hover !== null ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      left: `${xPct}%`,
                      top: `${yPct}%`,
                      transform: `translate(${flipLeft ? "calc(-100% - 12px)" : "12px"}, -50%)`,
                    }}
                  >
                    <div className="mb-1 font-semibold text-gray-900">{d.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-brand-500" />
                      <span className="text-gray-500">Pax</span>
                      <span className="ml-auto font-medium text-gray-900">{d.pax.toLocaleString()}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-gray-500">Veh</span>
                      <span className="ml-auto font-medium text-gray-900">{d.veh.toLocaleString()}</span>
                    </div>
                    {showTotal && (
                      <div className="mt-1 border-t border-gray-100 pt-1 text-[11px] font-semibold text-gray-900">
                        Total {(d.pax + d.veh).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* X axis labels — anchored to bar baseline (bottom-6 = above pb-6) + translate-y-5, matching Weekly Revenue */}
            {data.map((d, i) => (
              <div
                key={d.label}
                className="absolute bottom-6 translate-y-5 -translate-x-1/2 text-[11px] text-gray-500"
                style={{ left: `${(paxPts[i].x / W) * 100}%` }}
              >
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
