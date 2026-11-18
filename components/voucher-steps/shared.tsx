"use client";

import type { DiscountType, VoucherPlatform } from "@/lib/vouchers-data";

/** Form state for the voucher wizard. Numbers stay strings while typing. */
export type VoucherDraft = {
  name: string;
  code: string;
  /** Once the admin edits the code by hand, stop re-suggesting it from the name. */
  codeTouched: boolean;
  description: string;
  discountType: DiscountType;
  amount: string;
  maxDiscount: string;
  /** Minimum booking amount; blank = no minimum. */
  minSpend: string;
  operatorMode: "all" | "selected";
  operators: string[];
  platforms: VoucherPlatform[];
  /** Guests and signed-in customers (true) or signed-in only (false). */
  openToAll: boolean;
  startMode: "now" | "scheduled";
  startDate: string;
  startTime: string;
  hasEnd: boolean;
  endDate: string;
  endTime: string;
  limitUses: boolean;
  usageLimit: string;
  limitPerUser: boolean;
  perCustomerLimit: string;
  /** Kept for vouchers saved with a budget; no longer offered in the wizard. */
  limitBudget: boolean;
  budgetLimit: string;
};

/** What the wizard is allowed to change on an existing voucher. */
export type VoucherLocks = {
  /** Code and discount terms are frozen once a voucher has been published. */
  terms: boolean;
  /** Start date is frozen once the voucher has gone live. */
  start: boolean;
  /** Uses already consumed — the use cap can't drop below this. */
  usedCount: number;
  /** ₱ already granted — the budget can't drop below this. */
  granted: number;
};

export const NO_LOCKS: VoucherLocks = { terms: false, start: false, usedCount: 0, granted: 0 };

export const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:border-slate-200";

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold tracking-tight text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11.5px] font-medium text-rose-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11.5px] text-slate-400">{hint}</span>
      ) : null}
    </div>
  );
}

/** Input with a fixed prefix/suffix adornment (₱, %, uses). */
export function AffixInput({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  disabled,
  ariaLabel,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  autoFocus?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center rounded-lg border border-slate-200 bg-white text-[13px] transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100 " +
        (disabled ? "cursor-not-allowed bg-slate-50" : "hover:border-slate-300")
      }
    >
      {prefix && <span className="pl-3 text-slate-400">{prefix}</span>}
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        className="w-full min-w-0 bg-transparent px-3 py-2 tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500"
      />
      {suffix && <span className="pr-3 text-slate-400">{suffix}</span>}
    </div>
  );
}

/** Two-option segmented control, matching the status toggle in UserFormModal. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={"flex rounded-lg bg-slate-100 p-0.5 " + (disabled ? "opacity-60" : "")}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={
              "flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed " +
              (on ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-slate-500 hover:text-slate-700")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function LockedNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500 ring-1 ring-slate-200/70">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[14px] font-semibold tracking-tight text-slate-900">{title}</h3>
      {caption && <p className="mt-0.5 text-[12px] text-slate-500">{caption}</p>}
    </div>
  );
}

/** Checkbox row used for targeting choices. */
export function CheckRow({
  checked,
  onChange,
  title,
  caption,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  caption?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={
        "flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3 ring-1 transition-colors " +
        (checked ? "bg-white ring-brand-200" : "bg-white ring-slate-200 hover:ring-slate-300") +
        (disabled ? " cursor-not-allowed opacity-60" : "")
      }
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold tracking-tight text-slate-900">{title}</span>
        {caption && <span className="block text-[11.5px] text-slate-500">{caption}</span>}
      </span>
    </label>
  );
}

/** Native time input styled like the other fields. Value is HH:MM (24h). */
export function TimeInput({ value, onChange, ariaLabel, disabled }: { value: string; onChange: (v: string) => void; ariaLabel: string; disabled?: boolean }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      disabled={disabled}
      className={inputCls + " tabular-nums"}
    />
  );
}

export const num = (s: string): number => (s.trim() === "" ? NaN : Number(s));
