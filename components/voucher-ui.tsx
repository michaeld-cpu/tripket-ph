"use client";
import Tooltip from "@/components/Tooltip";
import {
  daysBetween,
  fmtShortDate,
  peso,
  statusDescription,
  statusTone,
  toISODate,
  voucherStatus,
  type Voucher,
  type VoucherStatus,
} from "@/lib/vouchers-data";

export function validityCaption(v: Voucher, status: VoucherStatus): string {
  const today = toISODate(new Date());
  if (status === "Draft") return "Not published";
  if (status === "Ended") return v.endDate < today ? `Ended ${fmtShortDate(v.endDate)}` : "Ended early";
  if (status === "Scheduled") {
    const d = daysBetween(today, v.startDate);
    return d === 1 ? "Starts tomorrow" : `Starts in ${d}d`;
  }
  const d = daysBetween(today, v.endDate);
  return d === 0 ? "Ends today" : d === 1 ? "Ends tomorrow" : `Ends in ${d}d`;
}

/** Plain-text usage for table cells: "186 / 300 uses" with what's left underneath. */
export function UsageText({ v }: { v: Voucher }) {
  const used = v.stats.redeemed;
  const granted = v.stats.discountGranted;
  const main =
    v.usageLimit != null
      ? `${used.toLocaleString()} / ${v.usageLimit.toLocaleString()} uses`
      : `${peso(granted)} / ${peso(v.budgetLimit ?? 0)}`;
  // Once a voucher has ended, what's left can't be used — say "unused".
  const leftWord = voucherStatus(v) === "Ended" ? "unused" : "left";
  const sub =
    v.usageLimit != null && v.budgetLimit != null
      ? `${peso(granted)} of ${peso(v.budgetLimit)} budget`
      : v.usageLimit != null
        ? `${Math.max(0, v.usageLimit - used).toLocaleString()} ${leftWord}`
        : `${peso(Math.max(0, (v.budgetLimit ?? 0) - granted))} ${leftWord}`;
  return (
    <div>
      <div className="tabular-nums text-slate-900">{main}</div>
      <div className="text-[12px] tabular-nums text-slate-500">{sub}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: VoucherStatus }) {
  return (
    <Tooltip content={statusDescription[status]}>
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[status]}`}>
        {status}
      </span>
    </Tooltip>
  );
}

// ── Menu icons ──
const ico = "h-4 w-4";
const svgProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: ico };
export const EyeIcon = () => <svg {...svgProps}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
export const PencilIcon = () => <svg {...svgProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
export const CopyIcon = () => <svg {...svgProps}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
export const CheckIcon = () => <svg {...svgProps}><path d="M20 6 9 17l-5-5" /></svg>;
export const PauseIcon = () => <svg {...svgProps}><path d="M9 5v14M15 5v14" /></svg>;
export const PlayIcon = () => <svg {...svgProps}><path d="M7 5l12 7-12 7Z" /></svg>;
export const StopIcon = () => <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>;
export const TrashIcon = () => <svg {...svgProps}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>;
