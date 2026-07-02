"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCurrentUser } from "./UserContext";

type IconProps = { className?: string };

const DashboardIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const FerryIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v3" />
    <path d="M6 13V8h12v5" />
    <path d="M3 13h18l-1.8 5.2a2 2 0 0 1-1.9 1.3H6.7a2 2 0 0 1-1.9-1.3L3 13Z" />
    <path d="M2.5 21c1.2 0 1.2-1 2.4-1s1.2 1 2.4 1 1.2-1 2.4-1 1.2 1 2.3 1 1.2-1 2.4-1 1.2 1 2.4 1 1.2-1 2.3-1" />
  </svg>
);

const RouteIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.5 6H15a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h6.5" />
  </svg>
);

const VoyageIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

// Bookings — clipboard with a checklist, reads as "list of bookings".
const TicketIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <path d="M9 10h6M9 14h6M9 18h4" />
  </svg>
);

// Tickets — perforated ticket stub, the canonical "single ticket" icon.
const TicketsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
    <path d="M14 6v12" strokeDasharray="2 2" />
  </svg>
);

const AuditIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
    <path d="M14 3v6h6" />
    <path d="M8 13h8M8 17h5" />
  </svg>
);

const ReportsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 3 3 5-6" />
  </svg>
);

const UsersIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const OperatorsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const ShieldIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3 4 6v6c0 4.4 3.4 8.4 8 9 4.6-.6 8-4.6 8-9V6l-8-3Z" />
  </svg>
);

const ChevronDown = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ChevronLeft = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

type NavLeaf = { kind: "leaf"; href: string; label: string; Icon: (p: IconProps) => JSX.Element };
type NavGroup = {
  kind: "group";
  /** Path prefix used to detect "active descendant" for auto-expand + highlight. */
  basePath: string;
  label: string;
  Icon: (p: IconProps) => JSX.Element;
  children: NavLeaf[];
};
type NavEntry = NavLeaf | NavGroup;

// Flat list — section title labels removed for compactness. A single hairline
// divider separates the top "Overview" cluster from everything else, and a
// second divider before Settings, matching reference apps like Linear / Vercel.
// Nav is role-aware: the Security group (Users + Audit logs) is platform-level
// governance and shows only for admins. Operators get the line-scoped set.
function buildNavEntries(role: "admin" | "operator"): (NavEntry | { kind: "divider" })[] {
  const securityGroup: NavEntry = {
    kind: "group",
    basePath: "/security",
    label: "Security",
    Icon: ShieldIcon,
    children: [
      { kind: "leaf", href: "/users",      label: "Users",      Icon: UsersIcon },
      { kind: "leaf", href: "/operators",  label: "Operators",  Icon: OperatorsIcon },
      { kind: "leaf", href: "/audit-logs", label: "Audit logs", Icon: AuditIcon },
    ],
  };

  return [
    { kind: "leaf", href: "/",         label: "Dashboard", Icon: DashboardIcon },

    { kind: "divider" },

    { kind: "leaf", href: "/voyages",  label: "Voyages",   Icon: VoyageIcon },
    { kind: "leaf", href: "/routes",   label: "Routes",    Icon: RouteIcon },
    { kind: "leaf", href: "/vessels",  label: "Vessels",   Icon: FerryIcon },
    { kind: "leaf", href: "/bookings", label: "Bookings",  Icon: TicketIcon },
    { kind: "leaf", href: "/tickets",  label: "Tickets",   Icon: TicketsIcon },
    { kind: "leaf", href: "/reports",  label: "Reports",   Icon: ReportsIcon },

    ...(role === "admin" ? [securityGroup] : []),

    { kind: "divider" },

    { kind: "leaf", href: "/settings", label: "Settings",  Icon: SettingsIcon },
  ];
}

export default function Sidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useCurrentUser();
  const navEntries = buildNavEntries(user?.role ?? "admin");

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-slate-200/70 py-5 transition-[width] duration-300 ease-out ${
        collapsed ? "w-[72px] px-2" : "w-60 px-3"
      }`}
      style={{
        // Atmospheric vertical gradient — slate-50 fading to white at the bottom
        // Adds depth without using a flat fill (frontend-design skill: avoid solid backgrounds)
        background:
          "linear-gradient(180deg, rgb(248 250 252 / 0.7) 0%, rgb(248 250 252 / 0.5) 60%, rgb(255 255 255 / 0.6) 100%)",
      }}
    >
      {/* Brand header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26, mass: 0.7 }}
        className={`mb-6 flex items-center gap-2.5 ${collapsed ? "justify-center px-0" : "px-2"}`}
      >
        <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/imgs/logo.png" alt="Tripket PH" className="h-5 w-5 object-contain brightness-0 invert" />
          {/* Highlight edge — Vercel/Linear "inner-edge refraction" */}
          <span className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">Tripket PH</div>
          </div>
        )}
      </motion.div>

      <nav className="flex flex-1 flex-col gap-px">
        <NavRenderer entries={navEntries} path={path} collapsed={collapsed} />
      </nav>

      {/* User block — pinned to bottom */}
      <UserBlock collapsed={collapsed} />

      <button
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-brand-600 text-white shadow-[0_4px_12px_rgba(234,88,12,0.3)] ring-[2px] ring-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:scale-90"
      >
        <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${collapsed ? "rotate-180" : ""}`} />
      </button>
    </aside>
  );
}

// ─────────── NavRenderer — flat list with optional collapsible groups ───────────
function NavRenderer({
  entries,
  path,
  collapsed,
}: {
  entries: (NavEntry | { kind: "divider" })[];
  path: string;
  collapsed: boolean;
}) {
  // Cascading stagger index across all rendered rows.
  let cascadeIdx = 0;
  return (
    <>
      {entries.map((entry, i) => {
        if (entry.kind === "divider") {
          return <div key={`d-${i}`} className="my-2 mx-2 h-px bg-slate-200/70" />;
        }
        if (entry.kind === "leaf") {
          const idx = cascadeIdx++;
          return <NavLink key={entry.href} leaf={entry} active={isActive(entry.href, path)} collapsed={collapsed} cascadeIdx={idx} />;
        }
        // group
        const idx = cascadeIdx++;
        return <NavGroupItem key={entry.label} group={entry} path={path} collapsed={collapsed} cascadeIdx={idx} />;
      })}
    </>
  );
}

function isActive(href: string, path: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function NavLink({
  leaf, active, collapsed, cascadeIdx, indent,
}: {
  leaf: NavLeaf;
  active: boolean;
  collapsed: boolean;
  cascadeIdx: number;
  indent?: boolean;
}) {
  const { href, label, Icon } = leaf;
  // cascadeIdx of -1 means "no entrance stagger" — used when this NavLink
  // is rendered inside an already-animating container (e.g. the expanded
  // Security group) so it doesn't compound the delay.
  const useStagger = cascadeIdx >= 0;
  return (
    <motion.div
      initial={useStagger ? { opacity: 0, x: -4 } : false}
      animate={useStagger ? { opacity: 1, x: 0 } : undefined}
      transition={useStagger ? { type: "spring", stiffness: 240, damping: 26, mass: 0.7, delay: 0.1 + cascadeIdx * 0.035 } : undefined}
    >
      <Link
        href={href}
        title={collapsed ? label : undefined}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        className={`group relative flex items-center rounded-md text-[13.5px] transition-[background-color,color,transform] duration-200 active:scale-[0.97] ${
          collapsed ? "justify-center px-0 py-2.5" : indent ? "gap-3 py-1.5 pl-9 pr-3" : "gap-3 px-3 py-1.5"
        } ${
          active
            ? "font-medium tracking-tight text-slate-900"
            : "font-normal text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
        }`}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500" />
        )}
        <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-700"}`} />
        {!collapsed && <span>{label}</span>}
      </Link>
    </motion.div>
  );
}

function NavGroupItem({
  group, path, collapsed, cascadeIdx,
}: {
  group: NavGroup;
  path: string;
  collapsed: boolean;
  cascadeIdx: number;
}) {
  const hasActiveChild = group.children.some((c) => isActive(c.href, path));
  // Default open when a child is active; otherwise let user toggle.
  const [open, setOpen] = useState(hasActiveChild);
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const Icon = group.Icon;

  // Collapsed sidebar: render children as siblings so icons stack vertically
  // — no expansion affordance, matches Linear's compact mode.
  if (collapsed) {
    return (
      <>
        {group.children.map((leaf, i) => (
          <NavLink
            key={leaf.href}
            leaf={leaf}
            active={isActive(leaf.href, path)}
            collapsed={collapsed}
            cascadeIdx={cascadeIdx + i}
          />
        ))}
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26, mass: 0.7, delay: 0.1 + cascadeIdx * 0.035 }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-[13.5px] transition-[background-color,color,transform] duration-200 active:scale-[0.97] ${
          hasActiveChild
            ? "font-medium tracking-tight text-slate-900"
            : "font-normal text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
        }`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${hasActiveChild ? "text-brand-600" : "text-slate-400 group-hover:text-slate-700"}`} />
        <span className="flex-1">{group.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            // Snappy expand — Emil-ish curve, 140ms in / 100ms out. The
            // children inside skip their own cascade entrance (cascadeIdx=-1
            // → delay clamped to 0) so the whole group reveals together.
            transition={{
              height: { duration: 0.14, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.1, ease: "linear" },
            }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 flex flex-col gap-px">
              {group.children.map((leaf) => (
                <NavLink
                  key={leaf.href}
                  leaf={leaf}
                  active={isActive(leaf.href, path)}
                  collapsed={collapsed}
                  cascadeIdx={-1}
                  indent
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function UserBlock({ collapsed }: { collapsed: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user: currentUser, signOut } = useCurrentUser();

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    signOut();
  };

  // Sidebar only renders inside authenticated chrome, but guard for types.
  if (!currentUser) return null;

  const initials = currentUser.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "??";
  const roleLabel = currentUser.role === "admin" ? "Admin" : "Operator";
  const user = { email: currentUser.email, role: roleLabel, initials };

  return (
    <div className="relative mt-4 border-t border-slate-200/70 pt-3" ref={ref}>
      <button
        type="button"
        onClick={() => setMenuOpen(o => !o)}
        title={collapsed ? `${user.email} · ${user.role}` : undefined}
        className={`group flex w-full items-center rounded-lg transition-[background-color,transform] duration-150 ease-out hover:bg-white/70 active:scale-[0.98] ${
          collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2 py-2"
        }`}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-[11px] font-bold text-brand-600">
          {user.initials}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13px] font-medium text-slate-900">{user.role}</div>
              <div className="truncate text-[11px] text-slate-500">{user.email}</div>
            </div>
          </>
        )}
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.8 }}
            style={{ transformOrigin: "bottom left" }}
            className="absolute bottom-full left-0 right-0 z-40 mb-2 overflow-hidden rounded-xl bg-white py-1 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70"
          >
            <div className="border-b border-slate-100 px-3 py-2">
              <div className="truncate text-[12px] font-medium text-slate-900">{user.email}</div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{user.role}</div>
            </div>
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 transition-[background-color] duration-150 ease-out hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-500">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              Account settings
            </Link>

            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[13px] text-rose-600 transition-[background-color] duration-150 ease-out hover:bg-rose-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
