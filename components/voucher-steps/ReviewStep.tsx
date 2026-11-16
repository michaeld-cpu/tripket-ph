"use client";

import { discountLabel, fmtDate, peso } from "@/lib/vouchers-data";
import { draftExposure, PolicyRow } from "./LimitsStep";
import { effectiveStart } from "./ValidityStep";
import { num, type VoucherDraft, type VoucherLocks } from "./shared";

export default function ReviewStep({
  value,
  locks,
  onEdit,
}: {
  value: VoucherDraft;
  locks: VoucherLocks;
  onEdit: (stepIdx: number) => void;
}) {
  const discount = discountLabel({
    discountType: value.discountType,
    amount: num(value.amount) || 0,
    maxDiscount: value.discountType === "percent" ? num(value.maxDiscount) || null : null,
  });
  const startsNow = value.startMode === "now" && !locks.start;
  const start = effectiveStart(value);
  const exposure = draftExposure(value);
  const uses = value.limitUses ? num(value.usageLimit) : null;
  const budget = value.limitBudget ? num(value.budgetLimit) : null;

  const limitsText = [
    uses ? `${uses.toLocaleString()} uses` : null,
    budget ? `${peso(budget)} budget` : null,
  ].filter(Boolean).join(" or ");

  return (
    <div className="space-y-5">
      {/* Plain-language summary — what the admin is about to put live. */}
      <div className="rounded-xl bg-brand-50/60 px-5 py-4 ring-1 ring-brand-100">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[13px] font-semibold tracking-wider text-brand-700 ring-1 ring-brand-200">{value.code || "—"}</span>
          <span className="truncate text-[13px] text-slate-500">{value.name}</span>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">
            {value.discountType === "fixed" ? `${peso(num(value.amount) || 0)} off` : `${num(value.amount) || 0}% off`}
          </span>{" "}
          one booking
          {value.discountType === "percent" && num(value.maxDiscount) > 0 && <> (up to {peso(num(value.maxDiscount))})</>}, for any customer on any participating trip.
          Valid {startsNow ? "from publish" : `from ${fmtDate(start)}`} until {value.endDate ? fmtDate(value.endDate) : "—"}, up to {limitsText || "—"}.
        </p>
        {exposure != null && exposure > 0 && (
          <p className="mt-2 text-[12px] text-slate-500">Maximum possible cost <span className="font-semibold text-brand-700">{peso(exposure)}</span></p>
        )}
      </div>

      <ReviewSection title="Name and code" onEdit={() => onEdit(0)}>
        <PolicyRow label="Name" value={value.name || "—"} />
        <PolicyRow label="Code" value={value.code || "—"} />
        {value.description.trim() && <PolicyRow label="Internal note" value={value.description.trim()} />}
      </ReviewSection>

      <ReviewSection title="Discount" onEdit={() => onEdit(0)}>
        <PolicyRow label="Discount" value={discount} />
      </ReviewSection>

      <ReviewSection title="Validity" onEdit={() => onEdit(1)}>
        <PolicyRow label="Starts" value={startsNow ? "When published" : fmtDate(start)} />
        <PolicyRow label="Ends" value={value.endDate ? `${fmtDate(value.endDate)}, 11:59 PM` : "—"} />
      </ReviewSection>

      <ReviewSection title="Limits" onEdit={() => onEdit(1)}>
        <PolicyRow label="Total uses" value={uses ? uses.toLocaleString() : "No limit"} />
        <PolicyRow label="Discount budget" value={budget ? peso(budget) : "No limit"} />
        <PolicyRow label="Per customer" value="1 successful use" />
        <PolicyRow label="Per booking" value="1 voucher, no stacking" />
      </ReviewSection>

      <ReviewSection title="Eligibility and funding">
        <PolicyRow label="Who can use it" value="Everyone" badge="Rules in next version" />
        <PolicyRow label="Eligible trips" value="All participating trips" badge="Rules in next version" />
        <PolicyRow label="Funded by" value="Tripket" />
      </ReviewSection>
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h4>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-[12px] font-medium text-brand-600 transition-colors hover:text-brand-700">
            Edit
          </button>
        )}
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200/70">{children}</ul>
    </section>
  );
}
