"use client";

import { audienceLabel, discountLabel, fmtDate, fmtTime, operatorsLabel, peso, platformsLabel } from "@/lib/vouchers-data";
import { lines } from "@/lib/shipping-lines";

const LINE_NAMES = Object.fromEntries(lines.map((l) => [l.id, l.name]));
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
  const perUser = value.limitPerUser ? num(value.perCustomerLimit) : null;
  const minSpend = value.minSpend.trim() ? num(value.minSpend) : null;
  const operators = operatorsLabel(value.operatorMode === "all" ? "all" : value.operators, LINE_NAMES);
  const startLabel = startsNow ? "When published" : `${fmtDate(start)}, ${fmtTime(value.startTime)}`;
  const endLabel = value.hasEnd && value.endDate ? `${fmtDate(value.endDate)}, ${fmtTime(value.endTime)}` : "No end date";

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
          {value.discountType === "percent" && num(value.maxDiscount) > 0 && <> (up to {peso(num(value.maxDiscount))})</>}
          {minSpend ? <> of {peso(minSpend)} or more</> : null},{" "}
          {value.operatorMode === "all" ? "on any operator's trips" : value.operators.length === 1 ? `on ${operators} trips` : `on trips from ${operators}`},
          {" "}{value.platforms.length === 2 ? "in the app and on the website" : value.platforms[0] === "app" ? "in the app" : "on the website"},
          {" "}for {value.openToAll ? "guests and signed-in customers" : "signed-in customers"}.
          {" "}Valid {startsNow ? "from publish" : `from ${fmtDate(start)}`}{value.hasEnd && value.endDate ? ` until ${fmtDate(value.endDate)}` : " with no end date"}
          {uses ? `, up to ${uses.toLocaleString()} uses` : ""}{perUser ? ` (${perUser} per customer)` : ""}.
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

      <ReviewSection title="Operator and discount" onEdit={() => onEdit(0)}>
        <PolicyRow label="Operators" value={operators} />
        <PolicyRow label="Discount" value={discount} />
        <PolicyRow label="Minimum purchase" value={minSpend ? peso(minSpend) : "None"} />
      </ReviewSection>

      <ReviewSection title="Target" onEdit={() => onEdit(1)}>
        <PolicyRow label="Platforms" value={platformsLabel(value.platforms)} />
        <PolicyRow label="Who can use it" value={audienceLabel(value.openToAll)} />
      </ReviewSection>

      <ReviewSection title="Validity" onEdit={() => onEdit(1)}>
        <PolicyRow label="Starts" value={startLabel} />
        <PolicyRow label="Ends" value={endLabel} />
      </ReviewSection>

      <ReviewSection title="Limits" onEdit={() => onEdit(1)}>
        <PolicyRow label="Total uses" value={uses ? uses.toLocaleString() : "No limit"} />
        <PolicyRow label="Max claims per user" value={perUser ? perUser.toLocaleString() : "No limit"} />
        {budget ? <PolicyRow label="Discount budget" value={peso(budget)} /> : null}
        <PolicyRow label="Per booking" value="1 voucher, no stacking" />
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
