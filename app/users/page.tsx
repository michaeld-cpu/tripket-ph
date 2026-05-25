"use client";
import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";
import { useShippingLine } from "@/components/ShippingLineContext";

export default function UsersPage() {
  const { active } = useShippingLine();
  return (
    <div>
      <PageHeader title="User management" subtitle={active.name} showDateFilter={false} />
      <ComingSoon
        title="User management"
        blurb="Invite teammates, assign roles (admin, dispatcher, ticketing), and scope their access per shipping line."
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
      />
    </div>
  );
}
