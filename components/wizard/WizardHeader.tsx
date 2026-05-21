"use client";

/**
 * WizardHeader — shared dialog header for multi-step modals.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ 🚢   Add new vessel                                  ✕  │
 *   │      Enter the vessel's basic details and capacity      │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Anatomy:
 *  - brand-tinted icon tile on the left (rounded-lg, h-7 w-7, bg-brand-50)
 *  - title (text-[15px] semibold tracking-tight slate-900) + caption (11.5px slate-500)
 *  - close button on the right (h-7 w-7 rounded-md, hover-tinted)
 *
 * Locks the visual contract so every wizard dialog (Add vessel, Create schedule,
 * future Edit route, etc.) opens with the same shape.
 */

export default function WizardHeader({
  icon,
  title,
  caption,
  onClose,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  caption?: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div
      className={
        "flex items-center justify-between border-b border-slate-100 px-5 py-3.5 " +
        className
      }
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
          {caption && <p className="truncate text-[11.5px] text-slate-500">{caption}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
