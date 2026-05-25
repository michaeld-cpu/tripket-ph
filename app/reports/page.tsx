"use client";
import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";
import { useShippingLine } from "@/components/ShippingLineContext";

export default function ReportsPage() {
  const { active } = useShippingLine();
  return (
    <div>
      <PageHeader title="Reports" subtitle={active.name} showDateFilter={false} />
      <ComingSoon
        title="Reports"
        blurb="Built-in reports for revenue, occupancy, and operational KPIs — exportable to PDF or CSV, scheduled deliveries to your inbox."
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 3 3 5-6" />
            <circle cx="7" cy="14" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="11" cy="10" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="14" cy="13" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="19" cy="7" r="1.25" fill="currentColor" stroke="none" />
          </svg>
        }
      />
    </div>
  );
}
