"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

type Props = {
  fromCode: string;
  toCode: string;
  /** 0 → 1 progress along the route. */
  progress: number;
  /** Floating caption next to the vessel (e.g. "1h 28m remaining"). */
  etaLabel?: string;
};

/**
 * Stylized voyage map — sky-blue ocean, sand-tan islands, brand-orange route.
 * Pure SVG, no Mapbox. Coordinates and islands are decorative until AIS lands.
 */
export default function LiveVesselMap({ fromCode, toCode, progress, etaLabel }: Props) {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => p + 1), 2600);
    return () => clearInterval(t);
  }, []);

  // viewBox 840 × 480; cubic bezier route from CEB (top-right) to DGT (bottom-mid)
  const x0 = 600, y0 = 130;   // origin (CEB)
  const x1 = 460, y1 = 360;   // destination (DGT)
  const c1x = 540, c1y = 240;
  const c2x = 500, c2y = 290;
  const pathD = `M ${x0} ${y0} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x1} ${y1}`;

  const t = Math.min(1, Math.max(0, progress));
  const mt = 1 - t;
  const vx =
    mt * mt * mt * x0 +
    3 * mt * mt * t * c1x +
    3 * mt * t * t * c2x +
    t * t * t * x1;
  const vy =
    mt * mt * mt * y0 +
    3 * mt * mt * t * c1y +
    3 * mt * t * t * c2y +
    t * t * t * y1;
  const tx =
    3 * mt * mt * (c1x - x0) +
    6 * mt * t * (c2x - c1x) +
    3 * t * t * (x1 - c2x);
  const ty =
    3 * mt * mt * (c1y - y0) +
    6 * mt * t * (c2y - c1y) +
    3 * t * t * (y1 - c2y);
  const bearing = (Math.atan2(ty, tx) * 180) / Math.PI;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#aedcf3]">
      <svg viewBox="0 0 840 480" preserveAspectRatio="xMidYMid slice" className="block h-full w-full">
        <defs>
          <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b6dff4" />
            <stop offset="100%" stopColor="#96c9e6" />
          </linearGradient>
          <radialGradient id="sand" cx="40%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#e9c58b" />
            <stop offset="65%" stopColor="#d6ad6f" />
            <stop offset="100%" stopColor="#b08a52" />
          </radialGradient>
          <radialGradient id="island-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(15 23 42 / 0.18)" />
            <stop offset="100%" stopColor="rgb(15 23 42 / 0)" />
          </radialGradient>
          <radialGradient id="vessel-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(251 146 60 / 0.22)" />
            <stop offset="100%" stopColor="rgb(251 146 60 / 0)" />
          </radialGradient>
        </defs>

        {/* Sea */}
        <rect width="100%" height="100%" fill="url(#sea)" />

        {/* Graticule — soft slate lines + axis labels */}
        <g stroke="rgb(15 23 42 / 0.10)" strokeWidth="0.6">
          {Array.from({ length: 13 }).map((_, i) => {
            const x = (i + 1) * 60;
            return <line key={`v${i}`} x1={x} y1="0" x2={x} y2="450" />;
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const y = (i + 1) * 70;
            return <line key={`h${i}`} x1="0" y1={y} x2="840" y2={y} />;
          })}
        </g>
        <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" fill="rgb(15 23 42 / 0.4)">
          {[117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130].map((deg, i) => (
            <text key={deg} x={i * 60 + 4} y={470}>{deg}°E</text>
          ))}
          {[5, 6, 7, 8, 9].map((deg, i) => (
            <text key={deg} x={6} y={(i + 1) * 70 + 4}>{deg}°N</text>
          ))}
        </g>

        {/* Islands — sand-tan blobs with soft shadows */}
        <g>
          {/* East island (top) — north of CEB */}
          <ellipse cx="650" cy="100" rx="78" ry="36" fill="url(#island-shadow)" />
          <path d="M580 96 Q620 70 670 75 Q720 82 730 105 Q720 130 660 135 Q600 130 580 96 Z" fill="url(#sand)" />

          {/* Small island east */}
          <ellipse cx="760" cy="130" rx="22" ry="12" fill="url(#island-shadow)" />
          <ellipse cx="760" cy="128" rx="18" ry="9" fill="url(#sand)" />

          {/* Big west island */}
          <ellipse cx="180" cy="380" rx="160" ry="90" fill="url(#island-shadow)" />
          <path
            d="M60 330 Q90 290 170 285 Q260 280 310 320 Q340 360 320 410 Q280 460 200 460 Q120 460 70 410 Q40 370 60 330 Z"
            fill="url(#sand)"
          />

          {/* Right side blob (east of route) */}
          <ellipse cx="760" cy="310" rx="80" ry="50" fill="url(#island-shadow)" />
          <path d="M690 290 Q720 270 770 280 Q820 290 820 320 Q820 350 770 360 Q720 360 690 340 Q680 320 690 290 Z" fill="url(#sand)" />

          {/* Small south island */}
          <ellipse cx="490" cy="430" rx="35" ry="16" fill="url(#island-shadow)" />
          <ellipse cx="490" cy="428" rx="28" ry="12" fill="url(#sand)" />
        </g>

        {/* Traveled segment — solid brand-orange */}
        <path
          d={pathD}
          fill="none"
          stroke="rgb(251 146 60)"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - t}
        />
        {/* Remaining segment — dashed brand-orange */}
        <path
          d={pathD}
          fill="none"
          stroke="rgb(251 146 60 / 0.45)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 7"
          pathLength={1}
          style={{ strokeDashoffset: -t, strokeDasharray: `${t} ${1 - t}` }}
        />

        {/* Origin port pin (CEB) */}
        <g>
          <ellipse cx={x0} cy={y0 + 5} rx="9" ry="3" fill="rgb(15 23 42 / 0.18)" />
          <circle cx={x0} cy={y0} r="5.5" fill="white" stroke="rgb(251 146 60)" strokeWidth="2" />
          <circle cx={x0} cy={y0} r="2.2" fill="rgb(251 146 60)" />
        </g>

        {/* Destination port pin (DGT) — teardrop */}
        <g>
          <ellipse cx={x1} cy={y1 + 8} rx="9" ry="3" fill="rgb(15 23 42 / 0.18)" />
          <path
            d={`M ${x1} ${y1 - 12} C ${x1 - 7} ${y1 - 12}, ${x1 - 7} ${y1 - 1}, ${x1} ${y1 + 4} C ${x1 + 7} ${y1 - 1}, ${x1 + 7} ${y1 - 12}, ${x1} ${y1 - 12} Z`}
            fill="rgb(251 146 60)"
          />
          <circle cx={x1} cy={y1 - 6} r="2.6" fill="white" />
        </g>

        {/* Vessel marker — halo + rings + ferry silhouette */}
        <motion.g
          initial={false}
          animate={{ x: vx, y: vy }}
          transition={{ type: "spring", stiffness: 50, damping: 22 }}
        >
          <circle r="40" fill="url(#vessel-halo)" />
          <circle r="20" fill="none" stroke="rgb(251 146 60 / 0.45)" strokeWidth="1.1" />
          <circle r="28" fill="none" stroke="rgb(251 146 60 / 0.28)" strokeWidth="1" />

          <motion.circle
            key={pulse}
            r="12"
            fill="none"
            stroke="rgb(251 146 60)"
            strokeWidth="1.6"
            initial={{ opacity: 0.8, scale: 0.7 }}
            animate={{ opacity: 0, scale: 2.6 }}
            transition={{ duration: 2.4, ease: "easeOut" }}
          />

          <g transform={`rotate(${bearing - 90})`}>
            {/* hull drop shadow */}
            <ellipse cx="0" cy="7" rx="7" ry="2" fill="rgb(15 23 42 / 0.25)" />
            {/* hull */}
            <path
              d="M -6 2 L 6 2 L 4 7 L -4 7 Z"
              fill="rgb(251 146 60)"
              stroke="rgb(194 65 12)"
              strokeWidth="0.6"
              strokeLinejoin="round"
            />
            {/* bridge */}
            <rect x="-4" y="-3" width="8" height="5" rx="0.5" fill="white" stroke="rgb(194 65 12)" strokeWidth="0.5" />
            {/* bow point */}
            <path d="M 0 -8 L 3.5 -3 L -3.5 -3 Z" fill="rgb(251 146 60)" stroke="rgb(194 65 12)" strokeWidth="0.5" />
            {/* mast */}
            <line x1="0" y1="-3" x2="0" y2="-7" stroke="rgb(194 65 12)" strokeWidth="0.7" strokeLinecap="round" />
          </g>
        </motion.g>
      </svg>

      {/* Origin code pill — anchored above CEB pin */}
      <span
        className="pointer-events-none absolute -translate-x-1/2 rounded-md bg-white px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.06em] text-slate-800 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.4)] ring-1 ring-slate-200"
        style={{ left: `${(x0 / 840) * 100}%`, top: `${(y0 / 480) * 100}%`, marginTop: -22 }}
      >
        {fromCode}
      </span>
      {/* Destination code pill — anchored below DGT pin */}
      <span
        className="pointer-events-none absolute -translate-x-1/2 rounded-md bg-white px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.06em] text-slate-800 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.4)] ring-1 ring-slate-200"
        style={{ left: `${(x1 / 840) * 100}%`, top: `${(y1 / 480) * 100}%`, marginTop: 18 }}
      >
        {toCode}
      </span>

      {/* "En route · X remaining" floating pill next to vessel */}
      {etaLabel && (
        <motion.span
          initial={false}
          animate={{ left: `${(vx / 840) * 100}%`, top: `${(vy / 480) * 100}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 22 }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-12 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[11.5px] font-semibold tracking-tight text-brand-700 shadow-[0_8px_22px_-8px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
        >
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
          En route · {etaLabel}
        </motion.span>
      )}

      {/* Decorative zoom controls — bottom right */}
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-md bg-white/95 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 backdrop-blur">
        <button
          type="button"
          aria-label="Zoom in"
          className="grid h-7 w-7 place-items-center text-slate-700 transition-colors duration-150 ease-out hover:bg-slate-50 active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <div className="h-px bg-slate-200" />
        <button
          type="button"
          aria-label="Zoom out"
          className="grid h-7 w-7 place-items-center text-slate-700 transition-colors duration-150 ease-out hover:bg-slate-50 active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
