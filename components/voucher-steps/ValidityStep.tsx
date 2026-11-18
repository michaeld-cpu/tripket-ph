"use client";

import DatePicker from "@/components/DatePicker";
import { daysBetween, fmtDate, fmtTime, parseISODate, toISODate } from "@/lib/vouchers-data";
import { CheckRow, Field, LockedNote, Segmented, SectionTitle, TimeInput, type VoucherDraft, type VoucherLocks } from "./shared";

const PRESETS = [7, 14, 30, 60];

export function effectiveStart(v: VoucherDraft): string {
  return v.startMode === "now" ? toISODate(new Date()) : v.startDate;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function validityErrors(v: VoucherDraft, locks: VoucherLocks) {
  const today = toISODate(new Date());
  const start = effectiveStart(v);
  const startTime = v.startMode === "now" ? nowHHMM() : v.startTime;
  const e: { start?: string; end?: string; platforms?: string } = {};
  if (v.platforms.length === 0) e.platforms = "Pick at least one platform.";
  if (v.startMode === "scheduled" && !locks.start) {
    if (!v.startDate) e.start = "Pick a start date.";
    else if (v.startDate < today) e.start = "Start date can't be in the past.";
    else if (v.startDate === today && v.startTime < nowHHMM()) e.start = "Start time has already passed.";
  }
  if (v.hasEnd && v.endDate) {
    if (v.endDate < today) e.end = "End date can't be in the past.";
    else if (start && (v.endDate < start || (v.endDate === start && v.endTime <= startTime))) e.end = "Must end after it starts.";
  }
  return e;
}

export function validityValid(v: VoucherDraft, locks: VoucherLocks): boolean {
  if (v.hasEnd && !v.endDate) return false;
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
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return toISODate(d); })();
  const errors = validityErrors(value, locks);
  const start = effectiveStart(value);
  const span = value.hasEnd && start && value.endDate && value.endDate >= start ? daysBetween(start, value.endDate) + 1 : null;
  const togglePlatform = (p: "app" | "web", on: boolean) =>
    onChange({ ...value, platforms: on ? [...value.platforms.filter((x) => x !== p), p] : value.platforms.filter((x) => x !== p) });

  const applyPreset = (days: number) => {
    const base = parseISODate(start || today);
    base.setDate(base.getDate() + days - 1);
    onChange({ ...value, hasEnd: true, endDate: toISODate(base) });
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="Who and where" caption="Where the code can be applied, and who can use it." />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CheckRow checked={value.platforms.includes("app")} onChange={(on) => togglePlatform("app", on)} title="Tripket app" caption="iOS and Android checkout." />
            <CheckRow checked={value.platforms.includes("web")} onChange={(on) => togglePlatform("web", on)} title="Tripket website" caption="Web checkout." />
          </div>
          {errors.platforms && <p className="text-[11.5px] font-medium text-rose-500">{errors.platforms}</p>}
          <CheckRow
            checked={value.openToAll}
            onChange={(openToAll) => onChange({ ...value, openToAll })}
            title="Open to all"
            caption={value.openToAll ? "Guests and signed-in customers can use the code." : "Only signed-in customers can use the code."}
          />
        </div>
      </div>

      <div>
        <SectionTitle title="When does it start?" />
        {locks.start ? (
          <LockedNote>Started {fmtDate(value.startDate)}, {fmtTime(value.startTime)}. The start can&apos;t change once a voucher is live.</LockedNote>
        ) : (
          <div className="space-y-3">
            <Segmented
              value={value.startMode}
              onChange={(startMode) => onChange({ ...value, startMode, startDate: startMode === "scheduled" && (!value.startDate || value.startDate <= today) ? tomorrow : value.startDate })}
              options={[
                { value: "now", label: "As soon as it's published" },
                { value: "scheduled", label: "On a scheduled date" },
              ]}
            />
            {value.startMode === "scheduled" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" required error={errors.start}>
                  <DatePicker value={value.startDate} onChange={(startDate) => onChange({ ...value, startDate })} min={today} ariaLabel="Start date" className="w-full" />
                </Field>
                <Field label="Start time" required>
                  <TimeInput value={value.startTime} onChange={(startTime) => onChange({ ...value, startTime })} ariaLabel="Start time" />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <SectionTitle title="When does it end?" caption="Optional. Without an end date the code runs until you disable it or a limit is reached." />
        <div className="space-y-3">
          <Segmented
            value={value.hasEnd ? "date" : "none"}
            onChange={(m) => onChange({ ...value, hasEnd: m === "date" })}
            options={[
              { value: "none", label: "No end date" },
              { value: "date", label: "On a date" },
            ]}
          />
          {value.hasEnd && (
            <>
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
                <Field label="End date" required error={errors.end}>
                  <DatePicker value={value.endDate} onChange={(endDate) => onChange({ ...value, endDate })} min={start > today ? start : today} ariaLabel="End date" className="w-full" />
                </Field>
                <Field label="End time" required>
                  <TimeInput value={value.endTime} onChange={(endTime) => onChange({ ...value, endTime })} ariaLabel="End time" />
                </Field>
              </div>
            </>
          )}
        </div>
      </div>

      {!errors.end && !errors.start && (
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-[12.5px] text-slate-600 ring-1 ring-slate-200/70">
          {span != null && <>Valid for <span className="font-semibold text-slate-900">{span} day{span === 1 ? "" : "s"}</span>{" · "}</>}
          {value.startMode === "now" && !locks.start ? "From publish" : `From ${fmtDate(start)}, ${fmtTime(value.startTime)}`}
          {value.hasEnd && value.endDate ? ` to ${fmtDate(value.endDate)}, ${fmtTime(value.endTime)}` : " with no end date"}
        </div>
      )}
    </div>
  );
}
