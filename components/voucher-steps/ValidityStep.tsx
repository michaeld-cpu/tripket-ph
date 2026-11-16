"use client";

import DatePicker from "@/components/DatePicker";
import { daysBetween, fmtDate, parseISODate, toISODate } from "@/lib/vouchers-data";
import { Field, LockedNote, Segmented, SectionTitle, type VoucherDraft, type VoucherLocks } from "./shared";

const PRESETS = [7, 14, 30, 60];

export function effectiveStart(v: VoucherDraft): string {
  return v.startMode === "now" ? toISODate(new Date()) : v.startDate;
}

export function validityErrors(v: VoucherDraft, locks: VoucherLocks) {
  const today = toISODate(new Date());
  const start = effectiveStart(v);
  const e: { start?: string; end?: string } = {};
  if (v.startMode === "scheduled" && !locks.start) {
    if (!v.startDate) e.start = "Pick a start date.";
    else if (v.startDate < today) e.start = "Start date can't be in the past.";
  }
  if (v.endDate) {
    if (v.endDate < today) e.end = "End date can't be in the past.";
    else if (start && v.endDate < start) e.end = "End date must be on or after the start date.";
  }
  return e;
}

export function validityValid(v: VoucherDraft, locks: VoucherLocks): boolean {
  if (!v.endDate) return false;
  if (v.startMode === "scheduled" && !v.startDate) return false;
  return Object.keys(validityErrors(v, locks)).length === 0;
}

export default function ValidityStep({
  value,
  onChange,
  locks,
}: {
  value: VoucherDraft;
  onChange: (v: VoucherDraft) => void;
  locks: VoucherLocks;
}) {
  const today = toISODate(new Date());
  const errors = validityErrors(value, locks);
  const start = effectiveStart(value);
  const span = start && value.endDate && value.endDate >= start ? daysBetween(start, value.endDate) + 1 : null;

  const applyPreset = (days: number) => {
    const base = parseISODate(start || today);
    base.setDate(base.getDate() + days - 1);
    onChange({ ...value, endDate: toISODate(base) });
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="When does it start?" />
        {locks.start ? (
          <LockedNote>Started on {fmtDate(value.startDate)}. The start date can&apos;t change once a voucher is live.</LockedNote>
        ) : (
          <div className="space-y-3">
            <Segmented
              value={value.startMode}
              onChange={(startMode) => onChange({ ...value, startMode, startDate: startMode === "scheduled" ? value.startDate || today : value.startDate })}
              options={[
                { value: "now", label: "As soon as it's published" },
                { value: "scheduled", label: "On a scheduled date" },
              ]}
            />
            {value.startMode === "scheduled" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" required error={errors.start} hint="Starts at 12:00 AM.">
                  <DatePicker
                    value={value.startDate}
                    onChange={(startDate) => onChange({ ...value, startDate })}
                    min={today}
                    ariaLabel="Start date"
                    className="w-full"
                  />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <SectionTitle title="When does it end?" caption="Customers can't apply the code after this date." />
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((d) => {
              const on = span === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => applyPreset(d)}
                  className={
                    "rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition-colors " +
                    (on ? "bg-brand-50 text-brand-700 ring-brand-300" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")
                  }
                >
                  {d} days
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="End date" required error={errors.end} hint="Valid until 11:59 PM.">
              <DatePicker
                value={value.endDate}
                onChange={(endDate) => onChange({ ...value, endDate })}
                min={start > today ? start : today}
                ariaLabel="End date"
                className="w-full"
              />
            </Field>
          </div>
        </div>
      </div>

      {span != null && !errors.end && !errors.start && (
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-[12.5px] text-slate-600 ring-1 ring-slate-200/70">
          Valid for <span className="font-semibold text-slate-900">{span} day{span === 1 ? "" : "s"}</span>
          {" · "}
          {value.startMode === "now" && !locks.start ? "from publish" : fmtDate(start)} to {fmtDate(value.endDate)}
        </div>
      )}
    </div>
  );
}
