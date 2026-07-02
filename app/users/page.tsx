"use client";
import UserDirectory from "@/components/UserDirectory";

// Admin accounts — platform-level governance. Operators live on /operators.
// (Superadmin will join this page once the role exists in the data model.)
export default function UsersPage() {
  return (
    <UserDirectory
      role="Admin"
      title="Users"
      subtitle="Admin accounts"
      tableHeading="Admins"
      createLabel="Create admin"
      noun="admins"
    />
  );
}
