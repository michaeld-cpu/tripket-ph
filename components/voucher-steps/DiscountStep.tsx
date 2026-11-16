"use client";

import { peso, suggestCode } from "@/lib/vouchers-data";
import { AffixInput, Field, LockedNote, Segmented, SectionTitle, num, type VoucherDraft, type VoucherLocks } from "./shared";

export function discountErrors(v: VoucherDraft) {
  const amount = num(v.amount);
  const cap = num(v.maxDiscount);
  const e: { amount?: string; maxDiscount?: string } = {};
  if (v.amount !== "") {
    if (!(amount > 0)) e.amount = "Enter an amount above zero.";
    else if (v.discountType === "percent" && amount > 100) e.amount = "A percentage can't exceed 100%.";
    else if (v.discountType === "fixed" && amount > 10000) e.amount = "That's unusually high — keep fixed discounts at ₱10,000 or less.";
  }
  if (v.discountType === "percent" && v.maxDiscount !== "" && !(cap > 0)) e.maxDiscount = "Enter a maximum above zero.";
  return e;
}

export function discountValid(v: VoucherDraft): boolean {
  if (Object.keys(discountErrors(v)).length) return false;
  if (!(num(v.amount) > 0)) return false;
  if (v.discountType === "percent" && !(num(v.maxDiscount) > 0)) return false;
  return true;
}

export default function DiscountStep({
  value,
  onChange,
  locks,
}: {
  value: VoucherDraft;
  onChange: (v: VoucherDraft) => void;
  locks: VoucherLocks;
}) {
  const errors = discountErrors(value);
  const isPct = value.discountType === "percent";
  const amount = num(value.amount);
  const cap = num(value.maxDiscount);
  // At what booking amount does the % discount hit its ₱ cap?
  const capReachedAt = isPct && amount > 0 && cap > 0 ? Math.ceil((cap * 100) / amount) : null;

  return (
    <div>
      <SectionTitle title="Discount" caption="Applied once per booking." />
      <div className="space-y-4">
        <Field label="Discount type" required>
          <Segmented
            value={value.discountType}
            disabled={locks.terms}
            onChange={(t) => onChange({ ...value, discountType: t, maxDiscount: t === "fixed" ? "" : value.maxDiscount })}
            options={[
              { value: "fixed", label: "Fixed amount (₱)" },
              { value: "percent", label: "Percentage (%)" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={isPct ? "Percentage off" : "Amount off"} required error={errors.amount}>
            <AffixInput
              value={value.amount}
              onChange={(amount) =>
                onChange({
                  ...value,
                  amount,
                  // Keep the auto-suggested code in step with the amount (NEW → NEW50).
                  code: value.codeTouched || locks.terms ? value.code : suggestCode(value.name, num(amount) || undefined),
                })
              }
              prefix={isPct ? undefined : "₱"}
              suffix={isPct ? "%" : undefined}
              placeholder={isPct ? "10" : "50"}
              disabled={locks.terms}
              ariaLabel={isPct ? "Percentage off" : "Amount off"}
            />
          </Field>
          {isPct && (
            <Field
              label="Maximum discount"
              required
              error={errors.maxDiscount}
              hint={capReachedAt ? `Cap kicks in on bookings over ${peso(capReachedAt)}.` : "Required for percentage discounts."}
            >
              <AffixInput
                value={value.maxDiscount}
                onChange={(maxDiscount) => onChange({ ...value, maxDiscount })}
                prefix="₱"
                placeholder="100"
                disabled={locks.terms}
                ariaLabel="Maximum discount"
              />
            </Field>
          )}
        </div>

        {locks.terms && <LockedNote>Discount terms are locked after publishing so past and in-progress bookings stay accurate. Duplicate the voucher to change them.</LockedNote>}
      </div>
    </div>
  );
}
