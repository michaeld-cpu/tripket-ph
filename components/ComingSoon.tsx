"use client";

/**
 * ComingSoon — placeholder body for pages that are wired up in the sidebar
 * but not yet built out. Keeps the visual rhythm consistent (same surface
 * card chrome as the real pages) so the empty state never reads as broken.
 */
export default function ComingSoon({
  title,
  blurb,
  icon,
}: {
  /** Section heading inside the panel. */
  title: string;
  /** One-liner explaining what this page will eventually do. */
  blurb: string;
  /** Optional decorative glyph centered above the title. */
  icon?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      {/* Soft grid + brand glow backdrop, masked to fade out at the bottom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 60% at 50% 0%, rgba(249,115,22,0.07) 0%, transparent 65%), linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)",
          backgroundSize: "auto, 28px 28px, 28px 28px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.3) 70%, transparent)",
        }}
      />

      <div className="relative flex min-h-[400px] flex-col items-center justify-center px-8 py-16 text-center">
        {icon && (
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 ring-1 ring-brand-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {icon}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-700 ring-1 ring-brand-100">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          Coming soon
        </span>
        <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-600">{blurb}</p>
      </div>
    </section>
  );
}
