"use client";
import type { ReactNode } from "react";

/**
 * EmptyState — one component for every "nothing here yet" surface.
 *
 * Pages and dialogs across the app used to hand-roll their own empty
 * state: bespoke <section> chrome, ad-hoc icons, slightly different
 * spacing/typography. This collapses them into a single visual
 * vocabulary so an "empty bookings table" reads the same as an "empty
 * voyages page" or an "empty vessel catalog."
 *
 * Pick the icon `kind` that best matches the *meaning* of the empty
 * surface; the rendering (size, color, frame) stays uniform.
 */

export type EmptyStateKind =
  // Page-level "no records yet" states (tables / collections).
  | "inbox"      // bookings, tickets, mail-shaped surfaces
  | "fleet"      // vessels
  | "route"      // routes, voyages
  | "catalog"    // configurations / catalog entries
  | "users"      // users / members
  | "chart"      // dashboards / analytics
  // Filter / search no-result states.
  | "search"
  // Activity feeds / logs.
  | "activity";

type Props = {
  kind?: EmptyStateKind;
  /** Short heading — what's missing. Required. */
  title: string;
  /** One-paragraph explanation. Optional, but recommended for page-level surfaces. */
  body?: ReactNode;
  /** Action button, link, or chip rendered beneath the body. */
  action?: ReactNode;
  /** Use the inline (no rounded card chrome) layout — for dialogs / sub-sections.
   *  Default false: renders as a page-level rounded panel. */
  inline?: boolean;
  /** Override the default min-height for the panel variant. */
  minHeight?: string;
};

export default function EmptyState({
  kind = "inbox",
  title,
  body,
  action,
  inline = false,
  minHeight = "min-h-[400px]",
}: Props) {
  const icon = ICONS[kind];

  const inner = (
    <>
      <span
        aria-hidden
        className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200/70"
      >
        {icon}
      </span>
      <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
      {body && (
        <p className="mt-1.5 max-w-md text-center text-[12.5px] leading-relaxed text-slate-500">
          {body}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </>
  );

  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
        {inner}
      </div>
    );
  }

  return (
    <section
      className={`flex ${minHeight} flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center ring-1 ring-slate-200/40`}
    >
      {inner}
    </section>
  );
}

// One SVG vocabulary — all 24×24, stroke-only, 1.5 weight, slate-400. No
// colored fills so the icon never fights with the surrounding palette.
const ICONS: Record<EmptyStateKind, ReactNode> = {
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  ),
  fleet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M3 17h18l-2 3H5l-2-3Z" />
      <rect x="5" y="11" width="14" height="6" rx="1" />
      <path d="M8 11V7h8v4" />
      <path d="M12 7V4" />
    </svg>
  ),
  route: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 6h9a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9" />
    </svg>
  ),
  catalog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h10M7 13h10M7 17h6" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" transform="translate(2 0)" />
      <circle cx="11" cy="7" r="4" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 4 4 5-7" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
};
