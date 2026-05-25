"use client";
import { useShippingLine } from "./ShippingLineContext";
import { LogoTile } from "./ShippingLineSwitcher";

/**
 * LinePicker — single-select dropdown for assigning a vessel (or any entity)
 * to a shipping line.
 *
 * For admins, this is a real dropdown using the same logo treatment as the
 * top-bar switcher. For operators (locked role), the dropdown is suppressed
 * and a static badge renders instead.
 *
 * Includes an inline notice when the picked line differs from the currently
 * active line in the top-bar switcher — admins are reminded to flip the
 * switcher if they actually want to create under a different line context.
 */
export default function LinePicker({
  value,
  onChange,
}: {
  /** Selected line id. Always mirrors the active top-bar switcher; the field
   *  in the dialog is read-only — admins must change context up there first. */
  value: string;
  onChange: (lineId: string) => void;
}) {
  const { active: activeLine, locked: lineLocked } = useShippingLine();

  // Always show whatever the top-bar switcher has active. The dialog can't
  // override this — admins switch context up top first, then create here.
  // We still mirror it back via onChange so the value stays in sync with form state.
  if (value !== activeLine.id) {
    queueMicrotask(() => onChange(activeLine.id));
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
        <LogoTile line={activeLine} size={28} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{activeLine.name}</div>
          <div className="truncate text-[10.5px] text-slate-500">{activeLine.plan} plan</div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-400">
          <rect x="4" y="11" width="16" height="9" rx="1.5" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      {!lineLocked && (
        <p className="px-1 text-[11px] leading-relaxed text-slate-500">
          To change line, switch <span className="font-medium text-slate-700">Shipping Line</span> first in the top bar.
        </p>
      )}
    </div>
  );
}
