"use client";
import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";
import { useShippingLine } from "@/components/ShippingLineContext";

export default function AuditLogsPage() {
  const { active } = useShippingLine();
  return (
    <div>
      <PageHeader title="Audit logs" subtitle={active.name} showDateFilter={false} />
      <ComingSoon
        title="Audit logs"
        blurb="A timeline of every change made by your team — who edited what, when, and from where. Filterable by actor, entity, and date range."
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
            <path d="M14 3v6h6" />
            <path d="M8 13h8M8 17h5" />
          </svg>
        }
      />
    </div>
  );
}
