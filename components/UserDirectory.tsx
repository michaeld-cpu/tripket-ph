"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import Select from "@/components/Select";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import { TableSkeleton } from "@/components/Skeleton";
import UserFormModal, { type UserDraft } from "@/components/UserFormModal";
import { loadStore, saveStore } from "@/lib/persisted-store";
import {
  buildUsers,
  roleTone,
  userStatusTone,
  userStatusLabel,
  type User,
  type UserRole,
  type UserStatus,
} from "@/lib/users-data";

// Revive Date fields after a JSON round-trip — lastActive is a Date in
// the live model but lands as an ISO string in localStorage.
function reviveUsers(raw: unknown): User[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => ({
    ...(u as User),
    lastActive: (u as User).lastActive ? new Date((u as User).lastActive as unknown as string) : null,
  }));
}

const PAGE_SIZE = 12;

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300">
      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function relativeTime(d: Date | null): string {
  if (!d) return "—";
  const diffMin = Math.round((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

// Avatar — brand orange to match the vessel avatar.
function avatarFor(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  return { initials, cls: "bg-brand-100 text-brand-600" };
}

/**
 * Shared directory view for platform users, scoped to a single role. The
 * `/users` and `/operators` pages are thin wrappers that differ only in the
 * `role` slice they show and their page copy. Both read/write the same
 * persisted store ("users"/"all"); each renders only its own role's rows.
 *
 * The shipping-line column and its filter were removed here — line assignment
 * still lives on each user (and in the create/edit dialog) but is no longer
 * surfaced as a table column.
 */
export default function UserDirectory({
  role,
  title,
  subtitle,
  tableHeading,
  createLabel,
  noun,
}: {
  role: UserRole;
  title: string;
  subtitle: string;
  tableHeading: string;
  createLabel: string;
  /** Plural noun for the Pagination summary, e.g. "users" / "operators". */
  noun: string;
}) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [page, setPage] = useState(1);
  // Form dialog: open=create when editUser is null, edit when set.
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const openCreate = () => { setEditUser(null); setFormOpen(true); };
  const openEdit = (u: User) => { setEditUser(u); setFormOpen(true); };

  // Wrap setState so every mutation persists.
  const updateUsers = (next: (prev: User[]) => User[]) => {
    setUsers(prev => {
      const value = next(prev ?? []);
      saveStore("users", "all", value);
      return value;
    });
  };

  const handleSubmit = (draft: UserDraft) => {
    if (editUser) {
      updateUsers((prev) => prev.map((x) => x.id === editUser.id ? { ...x, ...draft } : x));
    } else {
      const nu: User = {
        id: `usr-${Date.now()}`,
        ...draft,
        lastActive: new Date(),
      };
      updateUsers((prev) => [nu, ...prev]);
    }
  };

  useEffect(() => {
    try {
      const persisted = loadStore<unknown>("users", "all");
      if (persisted) {
        const revived = reviveUsers(persisted);
        if (revived.length > 0) { setUsers(revived); return; }
      }
    } catch { /* fall through to mock */ }
    const t = setTimeout(() => {
      const seeded = buildUsers();
      setUsers(seeded);
      saveStore("users", "all", seeded);
    }, 180);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { setPage(1); }, [query, statusFilter]);

  // Rows for this page's role only.
  const scoped = useMemo(() => (users ?? []).filter((u) => u.role === role), [users, role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [scoped, query, statusFilter]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        showDateFilter={false}
        right={
          <button type="button" onClick={openCreate} className="btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {createLabel}
          </button>
        }
      />

      {!users ? (
        <TableSkeleton rows={10} />
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">{tableHeading}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span> of {scoped.length} {noun}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-brand-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email"
                  className="w-48 bg-transparent placeholder:text-gray-400 focus:outline-none"
                />
              </div>

              <Select
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Filter by status"
                className="w-32"
                options={[
                  { value: "all", label: "All status" },
                  { value: "Active", label: "Active" },
                  { value: "Suspended", label: "Disabled" },
                ]}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">User <SortIcon /></button>
                  </th>
                  <th className="px-5 py-2.5 font-medium">Role</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Last active</th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50 px-5 py-2.5 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                      No {noun} match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((u, i) => {
                  const av = avatarFor(u.name);
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                      className="group transition-colors duration-150 hover:bg-slate-50/60"
                    >
                      {/* User — avatar + name + email */}
                      <td className="relative px-5 py-3.5 align-middle">
                        <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                        <div className="flex items-center gap-3">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-[11px] font-bold ${av.cls}`}>
                            {av.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{u.name}</div>
                            <div className="truncate text-[11.5px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5 align-middle">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${roleTone[u.role]}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 align-middle">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${userStatusTone[u.status]}`}>
                          {userStatusLabel[u.status]}
                        </span>
                      </td>

                      {/* Last active */}
                      <td className="px-5 py-3.5 align-middle">
                        <span className="text-[12px] tabular-nums text-slate-500">{relativeTime(u.lastActive)}</span>
                      </td>

                      {/* Actions */}
                      <td
                        className="sticky right-0 z-10 bg-white px-5 py-3 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] transition-colors duration-150 group-hover:bg-slate-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowMenu
                          ariaLabel={`Actions for ${u.name}`}
                          items={[
                            {
                              label: "Edit user",
                              onClick: () => openEdit(u),
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              ),
                            },
                            {
                              label: u.status === "Suspended" ? "Enable" : "Disable",
                              danger: u.status !== "Suspended",
                              onClick: () =>
                                updateUsers((prev) =>
                                  prev.map((x) => x.id === u.id ? { ...x, status: x.status === "Suspended" ? "Active" : "Suspended" } : x)
                                ),
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M9 9l6 6M15 9l-6 6" />
                                </svg>
                              ),
                            },
                          ]}
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun={noun} />
        </section>
      )}

      <UserFormModal
        open={formOpen}
        editUser={editUser}
        defaultRole={role}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
