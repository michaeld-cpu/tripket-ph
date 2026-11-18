"use client";

import { lines } from "@/lib/shipping-lines";
import { Field, LockedNote, Segmented, SectionTitle, type VoucherDraft, type VoucherLocks } from "./shared";

export function operatorValid(v: VoucherDraft): boolean {
  return v.operatorMode === "all" || v.operators.length > 0;
}

/** Step 1 — which operators' trips accept the code. */
export default function OperatorStep({
  value,
  onChange,
  locks,
}: {
  value: VoucherDraft;
  onChange: (v: VoucherDraft) => void;
  locks: VoucherLocks;
}) {
  const toggle = (id: string) => {
    const on = value.operators.includes(id);
    onChange({ ...value, operators: on ? value.operators.filter((o) => o !== id) : [...value.operators, id] });
  };

  return (
    <div>
      <SectionTitle title="Operator" caption="Which shipping lines' trips accept this code." />
      <div className="space-y-3">
        <Field label="Applies to" required>
          <Segmented
            value={value.operatorMode}
            disabled={locks.terms}
            onChange={(operatorMode) => onChange({ ...value, operatorMode })}
            options={[
              { value: "all", label: "All operators" },
              { value: "selected", label: "Specific operators" },
            ]}
          />
        </Field>

        {value.operatorMode === "selected" && (
          <div>
            <div className="grid grid-cols-2 gap-2">
              {lines.map((l) => {
                const on = value.operators.includes(l.id);
                return (
                  <label
                    key={l.id}
                    className={
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 ring-1 transition-colors " +
                      (on ? "bg-brand-50/60 ring-brand-200" : "bg-white ring-slate-200 hover:ring-slate-300") +
                      (locks.terms ? " pointer-events-none opacity-60" : "")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(l.id)}
                      disabled={locks.terms}
                      className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                    />
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[9.5px] font-bold text-white ${l.fallbackTint}`}>{l.initial}</span>
                    <span className="truncate text-[12.5px] font-medium text-slate-800">{l.name}</span>
                  </label>
                );
              })}
            </div>
            {value.operators.length === 0 && (
              <p className="mt-1.5 text-[11.5px] font-medium text-rose-500">Pick at least one operator.</p>
            )}
          </div>
        )}

        {locks.terms && <LockedNote>Operators are locked after publishing. Duplicate the voucher to target different lines.</LockedNote>}
      </div>
    </div>
  );
}
