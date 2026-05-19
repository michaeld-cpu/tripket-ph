"use client";
import { useState } from "react";
import DateRangePicker, { type DateRange } from "./DateRangePicker";

function defaultRange(): DateRange {
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - 14);
  return { start, end };
}

export default function PageHeader({
  title,
  subtitle,
  right,
  showDateFilter = true,
  showExport = true,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showDateFilter?: boolean;
  showExport?: boolean;
}) {
  const [range, setRange] = useState<DateRange>(defaultRange);

  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <span className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600">{subtitle}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showDateFilter && <DateRangePicker value={range} onChange={setRange} />}
        {showExport && (
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-500">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M12 9v6" />
              <path d="m9 12 3 3 3-3" />
            </svg>
            Export
          </button>
        )}
        {right}
      </div>
    </div>
  );
}
