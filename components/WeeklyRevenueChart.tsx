"use client";

type Day = { label: string; thisWeek: number; lastWeek: number };

function fmtPeso(n: number) {
  if (n === 0) return "₱0k";
  return `₱${Math.round(n / 1000)}k`;
}

function buildTicks(data: Day[]) {
  const maxRaw = Math.max(0, ...data.flatMap(d => [d.thisWeek, d.lastWeek]));
  const niceMax = maxRaw === 0 ? 200000 : Math.ceil(maxRaw / 50000) * 50000;
  return {
    yMax: niceMax,
    ticks: [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax].map(t => Math.round(t)),
  };
}

export default function WeeklyRevenueChart({ data }: { data: Day[] }) {
  const { yMax, ticks } = buildTicks(data);
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Weekly revenue</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">May 1 – May 31, 2026</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-brand-500" />
            <span className="text-slate-600">This week</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-brand-500/25" />
            <span className="text-slate-600">Last week</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {/* Y axis labels */}
        <div className="flex h-56 w-12 flex-col-reverse justify-between pb-6 text-[11px] text-gray-400">
          {ticks.map(t => (
            <div key={t} className="leading-none">{fmtPeso(t)}</div>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative flex-1">
          {/* Gridlines */}
          <div className="absolute inset-0 bottom-6 flex flex-col-reverse justify-between">
            {ticks.map(t => (
              <div key={t} className="border-t border-dashed border-gray-200" />
            ))}
          </div>

          {/* Bars */}
          <div className="chart-bars relative flex h-56 items-end justify-between gap-3 pb-6">
            {data.map((d, i) => {
              const thisPct = (d.thisWeek / yMax) * 100;
              const lastPct = (d.lastWeek / yMax) * 100;
              const delta = ((d.thisWeek - d.lastWeek) / d.lastWeek) * 100;
              const up = delta >= 0;
              return (
                <div key={d.label} className="bar-group group relative flex h-full flex-1 items-end justify-center gap-1">
                  <div
                    className="animate-bar w-4 rounded-t-sm bg-brand-500"
                    style={{ height: `${thisPct}%`, animationDelay: `${i * 90}ms` }}
                  />
                  <div
                    className="animate-bar w-4 rounded-t-sm bg-brand-500/20"
                    style={{ height: `${lastPct}%`, animationDelay: `${i * 90 + 50}ms` }}
                  />

                  {/* Tooltip — always to the right, hugging the bar */}
                  <div
                    className="tooltip pointer-events-none absolute left-full z-50 ml-0.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-opacity duration-150 group-hover:opacity-100"
                    style={{ bottom: `${Math.max(thisPct, lastPct)}%`, transform: "translateY(50%)" }}
                  >
                    <div className="mb-1 font-semibold text-gray-900">{d.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm bg-brand-500" />
                      <span className="text-gray-500">This week</span>
                      <span className="ml-auto font-medium text-gray-900">₱{d.thisWeek.toLocaleString()}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm bg-brand-500/20" />
                      <span className="text-gray-500">Last week</span>
                      <span className="ml-auto font-medium text-gray-900">₱{d.lastWeek.toLocaleString()}</span>
                    </div>
                    <div className={`mt-1 border-t border-gray-100 pt-1 text-[11px] font-semibold ${up ? "text-green-600" : "text-red-600"}`}>
                      {up ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs last week
                    </div>
                  </div>

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
