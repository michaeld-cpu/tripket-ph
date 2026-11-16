"use client";

import { normalizeCode, suggestCode } from "@/lib/vouchers-data";
import { Field, LockedNote, SectionTitle, inputCls, num, type VoucherDraft, type VoucherLocks } from "./shared";

export default function DetailsStep({
  value,
  onChange,
  locks,
  codeError,
}: {
  value: VoucherDraft;
  onChange: (v: VoucherDraft) => void;
  locks: VoucherLocks;
  codeError: string | null;
}) {
  const setName = (name: string) => {
    const next = { ...value, name };
    if (!value.codeTouched && !locks.terms) next.code = suggestCode(name, num(value.amount) || undefined);
    onChange(next);
  };

  return (
    <div>
      <SectionTitle title="Name and code" caption="The name is internal. Customers type the code at checkout." />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Voucher name" required>
            <input
              type="text"
              value={value.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. First Booking"
              maxLength={60}
              autoFocus
              className={inputCls}
            />
          </Field>

          <Field label="Voucher code" required error={codeError} hint="Generated from the name. You can edit it.">
            <div className="flex gap-2">
              <input
                type="text"
                value={value.code}
                onChange={(e) => onChange({ ...value, code: normalizeCode(e.target.value), codeTouched: true })}
                placeholder="NEW50"
                disabled={locks.terms}
                className={inputCls + " font-mono uppercase tracking-wider"}
              />
              {!locks.terms && value.codeTouched && (
                <button
                  type="button"
                  onClick={() => onChange({ ...value, code: suggestCode(value.name, num(value.amount) || undefined), codeTouched: false })}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Regenerate
                </button>
              )}
            </div>
          </Field>
        </div>
        {locks.terms && <LockedNote>The code can&apos;t change after a voucher is published — customers may already have it.</LockedNote>}

        <Field label="Internal note" hint="Optional. Where it's promoted, who asked for it, etc.">
          <textarea
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            rows={2}
            maxLength={240}
            placeholder="E.g. Promoted on the app landing page and Meta ads"
            className={inputCls + " resize-none"}
          />
        </Field>
      </div>
    </div>
  );
}
