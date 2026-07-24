"use client";
import UserDirectory from "@/components/UserDirectory";

// Platform-level governance accounts — Admins and Superadmins. Operators live
// on /operators.
export default function UsersPage() {
  return (
    <UserDirectory
      roles={["Admin", "Superadmin"]}
      title="Users"
      subtitle="Admin & superadmin accounts"
      tableHeading="Users"
      createLabel="Create admin"
      noun="users"
      lockLineToActive
      showShippingLine
    />
  );
}
