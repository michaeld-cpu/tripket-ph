"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useCurrentUser } from "@/components/UserContext";

// Routes that render full-bleed without the app shell (sidebar + topbar) and
// don't require authentication.
const PUBLIC_ROUTES = ["/login"];

// Platform-governance routes — admins only. Operators who type these URLs are
// silently bounced to the dashboard (nav never exposes them in the first place).
const ADMIN_ROUTES = ["/users", "/audit-logs"];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthed, user } = useCurrentUser();

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isAdminOnly = ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const blockedForRole = isAdminOnly && user?.role !== "admin";

  // Guard: bounce unauthenticated users to /login; bounce operators off
  // admin-only routes back to the dashboard.
  useEffect(() => {
    if (isPublic) return;
    if (!isAuthed) { router.replace("/login"); return; }
    if (blockedForRole) router.replace("/");
  }, [isPublic, isAuthed, blockedForRole, router, pathname]);

  // Public routes render bare.
  if (isPublic) return <>{children}</>;

  // Protected route while unauthenticated, or operator hitting an admin route —
  // render nothing during the redirect.
  if (!isAuthed || blockedForRole) return null;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
