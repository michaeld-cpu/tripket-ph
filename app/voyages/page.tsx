"use client";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";

export default function VoyagesPage() {
  const { active } = useShippingLine();
  return (
    <div>
      <PageHeader title="Departures" subtitle={active.name} showDateFilter={false} />
      <section className="flex min-h-[400px] items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200/70">
        <p className="text-[13px] text-slate-400">Coming soon</p>
      </section>
    </div>
  );
}
