"use client";
import UserDirectory from "@/components/UserDirectory";

// Operator accounts — line-scoped staff who run day-to-day operations.
export default function OperatorsPage() {
  return (
    <UserDirectory
      roles={["Operator"]}
      title="Operators"
      subtitle="Operator accounts"
      tableHeading="Operator accounts"
      createLabel="Create operator"
      noun="operators"
      entityNoun="operator"
      showStatusFilter={false}
      lockLineToActive
    />
  );
}
