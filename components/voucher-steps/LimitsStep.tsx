"use client";

import { maxExposure, peso } from "@/lib/vouchers-data";
import { AffixInput, SectionTitle, num, type VoucherDraft, type VoucherLocks } from "./shared";

export function limitsErrors(v: VoucherDraft, locks: VoucherLocks) {
  const e: { uses?: string; budget?: string; perUser?: string } = {};
  const per = num(v.perCustomerLimit);
  if (v.limitPerUser && v.perCustomerLimit !== "") {
    if (!(per >= 1) || !Number.isInteger(per)) e.perUser = "Enter a whole number of 1 or more.";
    else if (v.limitUses && num(v.usageLimit) >= 1 && per > num(v.usageLimit)) e.perUser = "Can't be more than the total uses.";
  }
  const uses = num(v.usageLimit);
  const budget = num(v.budgetLimit);
  if (v.limitUses && v.usageLimit !== "") {
    if (!(uses >= 1) || !Number.isInteger(uses)) e.uses = "Enter a whole number of 1 or more.";
    else if (uses < locks.usedCount) e.uses = `Already used ${locks.usedCount.toLocaleString()} times — can't go lower.`;
  }
  if (v.limitBudget && v.budgetLimit !== "") {
    if (!(budget > 0)) e.budget = "Enter a budget above zero.";
    else if (budget < locks.granted) e.budget = `${peso(locks.granted)} already granted — can't go lower.`;
  }
  return e;
}

export function limitsValid(v: VoucherDraft, locks: VoucherLocks): boolean {
  if (Object.keys(limitsErrors(v, locks)).length) return false;
  if (v.limitUses && !(num(v.usageLimit) >= 1)) return false;
  if (v.limitBudget && !(num(v.budgetLimit) > 0)) return false;
  if (v.limitPerUser && !(num(v.perCustomerLimit) >= 1)) return false;
  return true;
}

export function draftExposure(v: VoucherDraft): number | null {
  return maxExposure({
    discountType: v.discountType,
    amount: num(v.amount) || 0,
    maxDiscount: v.discountType === "percent" ? num(v.maxDiscount) || null : null,
    usageLimit: v.limitUses ? num(v.usageLimit) || null : null,
    budgetLimit: v.limitBudget ? num(v.budgetLimit) || null : null,
  });
}

export default function LimitsStep({
  value,
  onChange,
  locks,
}: {
  value: VoucherDraft;
  onChange: (v: VoucherDraft) => void;
  locks: VoucherLocks;
}) {
  const errors = limitsErrors(value, locks);
  const exposure = draftExposure(value);

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="Limits" caption="Optional. The voucher stops working once the total is reached." />
        <div className="grid grid-cols-2 gap-3">
          <LimitCard
            checked={value.limitUses}
            onToggle={(limitUses) => onChange({ ...value, limitUses })}
            title="Limit total uses"
            caption="E.g. the first 300 bookings."
            error={errors.uses}
          >
            <AffixInput
              value={value.usageLimit}
              onChange={(usageLimit) => onChange({ ...value, usageLimit: usageLimit.replace(/\./g, "") })}
              suffix="uses"
              placeholder="300"
              ariaLabel="Total uses"
            />
          </LimitCard>

          <LimitCard
            checked={value.limitPerUser}
            onToggle={(limitPerUser) => onChange({ ...value, limitPerUser })}
            title="Max claims per user"
            caption="Times one customer can use it."
            error={errors.perUser}
          >
            <AffixInput
              value={value.perCustomerLimit}
              onChange={(perCustomerLimit) => onChange({ ...value, perCustomerLimit: perCustomerLimit.replace(/\./g, "") })}
              suffix="times"
              placeholder="1"
              ariaLabel="Max claims per user"
            />
          </LimitCard>
        </div>
      </div>

      {exposure != null && exposure > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-brand-50/60 px-4 py-3 ring-1 ring-brand-100">
          <div>
            <div className="text-[12.5px] font-semibold text-slate-900">Maximum possible cost</div>
            <div className="text-[11.5px] text-slate-500">If every allowed use takes the full discount.</div>
          </div>
          <div className="text-[18px] font-semibold tabular-nums tracking-tight text-brand-700">{peso(exposure)}</div>
        </div>
      )}
    </div>
  );
}

function LimitCard({
  checked,
  onToggle,
  title,
  caption,
  error,
  children,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  title: string;
  caption: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"rounded-xl px-4 py-3 ring-1 transition-colors " + (checked ? "bg-white ring-brand-200" : "bg-white ring-slate-200")}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
        />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold tracking-tight text-slate-900">{title}</span>
          <span className="block text-[11.5px] text-slate-500">{caption}</span>
        </span>
      </label>
      {checked && (
        <div className="mt-3 pl-7">
          <div>{children}</div>
          {error && <span className="mt-1 block text-[11.5px] font-medium text-rose-500">{error}</span>}
        </div>
      )}
    </div>
  );
}

export function PolicyRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <li className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2 font-medium text-slate-800">
        {value}
        {badge && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{badge}</span>}
      </span>
    </li>
  );
}
