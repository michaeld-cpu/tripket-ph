"use client";
import UserDirectory from "@/components/UserDirectory";

// Operator accounts — line-scoped staff who run day-to-day operations.
export default function OperatorsPage() {
  return (
    <UserDirectory
      role="Operator"
      title="Operators"
      subtitle="Operator accounts"
      tableHeading="Operators"
      createLabel="Create operator"
      noun="operators"
    />
  );
}
