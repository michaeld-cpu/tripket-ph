"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { TableSkeleton } from "@/components/Skeleton";
import RowMenu, { type RowMenuItem } from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/ToastContext";
import { useCurrentUser } from "@/components/UserContext";
import CreateVoucherModal, { type VoucherSubmitIntent } from "@/components/CreateVoucherModal";
import VoucherConfirmDialog, { type VoucherConfirmKind } from "@/components/VoucherConfirmDialog";
import {
  StatusBadge,
  UsageText,
  validityCaption,
  EyeIcon,
  PencilIcon,
  CopyIcon,
  CheckIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from "@/components/voucher-ui";
import {
  actionToast,
  applyVoucherAction,
  discountLabel,
  duplicateVoucher,
  fmtShortDate,
  loadVouchers,
  peso,
  saveVouchers,
  voucherStatus,
  type Voucher,
  type VoucherStatus,
} from "@/lib/vouchers-data";

const TABS: ("All" | VoucherStatus)[] = ["All", "Active", "Scheduled", "Paused", "Draft", "Ended"];
const STATUS_ORDER: Record<VoucherStatus, number> = { Active: 0, Scheduled: 1, Paused: 2, Draft: 3, Ended: 4 };
const DEFAULT_PAGE_SIZE = 10;

export default function VouchersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useCurrentUser();
  const actor = user?.name ?? "Admin User";
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [tab, setTab] = useState<"All" | VoucherStatus>("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [confirm, setConfirm] = useState<{ kind: VoucherConfirmKind; voucher: Voucher } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVouchers(loadVouchers()), 150);
    return () => clearTimeout(t);
  }, []);

  const update = (fn: (prev: Voucher[]) => Voucher[]) => {
    setVouchers((prev) => {
      const next = fn(prev ?? []);
      saveVouchers(next);
      return next;
    });
  };

  const withStatus = useMemo(
    () => (vouchers ?? []).map((v) => ({ v, status: voucherStatus(v) })),
    [vouchers],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: withStatus.length };
    for (const { status } of withStatus) c[status] = (c[status] ?? 0) + 1;
    return c;
  }, [withStatus]);

  const kpis = useMemo(() => {
    const live = withStatus.filter((x) => x.status === "Active");
    return {
      active: live.length,
      scheduled: counts.Scheduled ?? 0,
      redemptions: withStatus.reduce((s, x) => s + x.v.stats.redeemed, 0),
      granted: withStatus.reduce((s, x) => s + x.v.stats.discountGranted, 0),
    };
  }, [withStatus, counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus
      .filter(({ v, status }) => {
        if (tab !== "All" && status !== tab) return false;
        if (q && !v.name.toLowerCase().includes(q) && !v.code.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.v.updatedAt.localeCompare(a.v.updatedAt));
  }, [withStatus, tab, query]);

  useEffect(() => { setPage(1); }, [tab, query]);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSubmit = (v: Voucher, intent: VoucherSubmitIntent) => {
    update((prev) => (prev.some((x) => x.id === v.id) ? prev.map((x) => (x.id === v.id ? v : x)) : [v, ...prev]));
    const status = voucherStatus(v);
    showToast(
      intent === "draft" ? `${v.code} saved as draft`
      : intent === "save" ? `${v.code} updated`
      : status === "Scheduled" ? `${v.code} scheduled for ${fmtShortDate(v.startDate)}`
      : `${v.code} is live`,
    );
  };

  const handleConfirm = (kind: VoucherConfirmKind, target: Voucher, reason: string) => {
    if (kind === "delete") {
      update((prev) => prev.filter((x) => x.id !== target.id));
      showToast(`${target.code} deleted`, "error");
      return;
    }
    update((prev) => prev.map((x) => (x.id === target.id ? applyVoucherAction(x, kind, actor, reason) : x)));
    showToast(`${target.code} ${actionToast[kind]}`, kind === "end" ? "error" : "success");
  };

  const handleDuplicate = (v: Voucher) => {
    const copy = duplicateVoucher(v, actor, (vouchers ?? []).map((x) => x.code));
    update((prev) => [copy, ...prev]);
    showToast(`Duplicated as ${copy.code} (draft)`);
    setEditing(copy);
  };

  const menuFor = (v: Voucher, status: VoucherStatus): RowMenuItem[] => {
    const items: RowMenuItem[] = [
      { label: "View details", onClick: () => router.push(`/vouchers/${v.id}`), icon: <EyeIcon /> },
    ];
    if (status !== "Ended") items.push({ label: "Edit", onClick: () => setEditing(v), icon: <PencilIcon /> });
    items.push({ label: "Duplicate", onClick: () => handleDuplicate(v), icon: <CopyIcon /> });
    if (status === "Draft") items.push({ label: "Publish", tone: "success", onClick: () => setConfirm({ kind: "publish", voucher: v }), icon: <CheckIcon /> });
    if (status === "Active" || status === "Scheduled") items.push({ label: "Pause", tone: "warning", onClick: () => setConfirm({ kind: "pause", voucher: v }), icon: <PauseIcon /> });
    if (status === "Paused") items.push({ label: "Resume", tone: "success", onClick: () => setConfirm({ kind: "resume", voucher: v }), icon: <PlayIcon /> });
    if (status === "Active" || status === "Scheduled" || status === "Paused") items.push({ label: "End now", danger: true, divider: true, onClick: () => setConfirm({ kind: "end", voucher: v }), icon: <StopIcon /> });
    if (status === "Draft") items.push({ label: "Delete draft", danger: true, divider: true, onClick: () => setConfirm({ kind: "delete", voucher: v }), icon: <TrashIcon /> });
    return items;
  };

  const isEmpty = vouchers !== null && vouchers.length === 0;

  return (
    <div>
      <PageHeader
        title="Vouchers"
        showDateFilter={false}
        right={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create voucher
          </button>
        }
      />

      <CreateVoucherModal
        open={createOpen || editing !== null}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        existing={vouchers ?? []}
        editVoucher={editing}
        onSubmit={handleSubmit}
      />

      <VoucherConfirmDialog
        kind={confirm?.kind ?? null}
        code={confirm?.voucher.code ?? ""}
        onClose={() => setConfirm(null)}
        onConfirm={(reason) => confirm && handleConfirm(confirm.kind, confirm.voucher, reason)}
      />

      {!vouchers ? (
        <TableSkeleton rows={8} />
      ) : isEmpty ? (
        <EmptyState
          kind="catalog"
          title="No vouchers yet"
          body="Create a voucher code with a fixed or percentage discount, a validity window and a use or budget limit."
          action={
            <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
              Create first voucher
            </button>
          }
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Live now" value={kpis.active.toLocaleString()} caption={`${kpis.scheduled} scheduled`} />
            <Kpi label="Redemptions" value={kpis.redemptions.toLocaleString()} caption="All vouchers, all time" />
            <Kpi label="Discount granted" value={peso(kpis.granted)} caption="Tripket-funded" />
            <Kpi label="Drafts" value={(counts.Draft ?? 0).toLocaleString()} caption="Not yet published" />
          </div>

          <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-1">
                {TABS.map((t) => {
                  const on = tab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors " +
                        (on ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100")
                      }
                    >
                      {t}
                      <span className={"tabular-nums " + (on ? "text-brand-500" : "text-slate-400")}>{counts[t] ?? 0}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-brand-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or code"
                  className="w-48 bg-transparent placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Voucher</th>
                  <th className="px-5 py-2.5 font-medium">Discount</th>
                  <th className="px-5 py-2.5 font-medium">Validity</th>
                  <th className="px-5 py-2.5 font-medium">Usage</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="w-10 px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                      No vouchers match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map(({ v, status }, i) => (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 130, damping: 22, delay: Math.min(i * 0.04, 0.4) }}
                    onClick={() => router.push(`/vouchers/${v.id}`)}
                    className="group relative cursor-pointer transition-colors duration-150 ease-out hover:bg-slate-50/60"
                  >
                    <td className="relative px-5 py-3.5 align-middle">
                      <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                      <div className="font-mono text-[13px] font-semibold tracking-wide text-slate-900">{v.code}</div>
                      <div className="truncate text-[12px] text-slate-500">{v.name}</div>
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <div className="font-medium text-slate-900">{discountLabel(v)}</div>
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <div className="tabular-nums text-slate-900">{fmtShortDate(v.startDate)} – {fmtShortDate(v.endDate)}</div>
                      <div className="text-[12px] text-slate-500">{validityCaption(v, status)}</div>
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      {status === "Draft" ? <span className="text-[12px] text-slate-400">—</span> : <UsageText v={v} />}
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-5 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <RowMenu ariaLabel={`Actions for ${v.code}`} items={menuFor(v, status)} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              noun="vouchers"
            />
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1.5 text-[22px] font-semibold tabular-nums tracking-tight text-slate-900">{value}</div>
      <div className="text-[12px] text-slate-400">{caption}</div>
    </div>
  );
}
