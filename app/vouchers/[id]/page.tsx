"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ToastContext";
import { useCurrentUser } from "@/components/UserContext";
import CreateVoucherModal, { type VoucherSubmitIntent } from "@/components/CreateVoucherModal";
import VoucherConfirmDialog, { type VoucherConfirmKind } from "@/components/VoucherConfirmDialog";
import EmptyState from "@/components/EmptyState";
import RowMenu, { type RowMenuItem } from "@/components/RowMenu";
import { StatusBadge, validityCaption, CopyIcon, PencilIcon, PauseIcon, PlayIcon, StopIcon, CheckIcon, TrashIcon } from "@/components/voucher-ui";
import {
  actionToast,
  applyVoucherAction,
  discountLabel,
  duplicateVoucher,
  fmtDate,
  fmtShortDate,
  historyLabel,
  loadVouchers,
  maxExposure,
  peso,
  sampleRedemptions,
  saveVouchers,
  voucherStatus,
  type Voucher,
} from "@/lib/vouchers-data";

const CARD = "overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70";
const SECTION_HEADER = "flex items-center justify-between border-b border-slate-100 px-5 py-3.5";

// Newest entry gets the solid brand dot; older ones a softer brand tint.
const HISTORY_DOT_LATEST = "bg-brand-500";
const HISTORY_DOT_OLDER = "bg-brand-200";

function fmtDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useCurrentUser();
  const actor = user?.name ?? "Admin User";
  const [all, setAll] = useState<Voucher[] | null>(null);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [confirm, setConfirm] = useState<VoucherConfirmKind | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setAll(loadVouchers()); }, []);

  const voucher = all?.find((v) => v.id === id) ?? null;
  const status = voucher ? voucherStatus(voucher) : null;
  const redemptions = useMemo(() => (voucher ? sampleRedemptions(voucher, 6) : []), [voucher]);

  const update = (fn: (prev: Voucher[]) => Voucher[]) => {
    setAll((prev) => {
      const next = fn(prev ?? []);
      saveVouchers(next);
      return next;
    });
  };

  if (all && !voucher) {
    return (
      <EmptyState
        kind="search"
        title="Voucher not found"
        body="It may have been deleted, or the link is wrong."
        action={<Link href="/vouchers" className="btn-primary">Back to vouchers</Link>}
      />
    );
  }
  if (!voucher || !status) return null;

  const used = voucher.stats.redeemed;
  const exposure = maxExposure(voucher);
  const newest = [...voucher.history].reverse();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      showToast(`${voucher.code} copied`);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  const handleSubmit = (v: Voucher, intent: VoucherSubmitIntent) => {
    update((prev) => (prev.some((x) => x.id === v.id) ? prev.map((x) => (x.id === v.id ? v : x)) : [v, ...prev]));
    showToast(intent === "draft" ? `${v.code} saved as draft` : intent === "save" ? `${v.code} updated` : `${v.code} published`);
    if (v.id !== voucher.id) router.push(`/vouchers/${v.id}`);
  };

  const handleConfirm = (kind: VoucherConfirmKind, reason: string) => {
    if (kind === "delete") {
      update((prev) => prev.filter((x) => x.id !== voucher.id));
      showToast(`${voucher.code} deleted`, "error");
      router.push("/vouchers");
      return;
    }
    update((prev) => prev.map((x) => (x.id === voucher.id ? applyVoucherAction(x, kind, actor, reason) : x)));
    showToast(`${voucher.code} ${actionToast[kind]}`, kind === "end" ? "error" : "success");
  };

  const duplicate = () => {
    const copy = duplicateVoucher(voucher, actor, all!.map((x) => x.code));
    update((prev) => [copy, ...prev]);
    showToast(`Duplicated as ${copy.code} (draft)`);
    router.push(`/vouchers/${copy.id}`);
  };

  const remaining =
    voucher.usageLimit != null
      ? `${Math.max(0, voucher.usageLimit - used).toLocaleString()} uses`
      : peso(Math.max(0, (voucher.budgetLimit ?? 0) - voucher.stats.discountGranted));

  // Primary actions stay visible; the rest go in the overflow menu.
  const moreItems: RowMenuItem[] = [];
  if (status !== "Ended") moreItems.push({ label: "Duplicate", onClick: duplicate, icon: <CopyIcon /> });
  if (status === "Active" || status === "Scheduled" || status === "Paused")
    moreItems.push({ label: "End now", danger: true, divider: true, onClick: () => setConfirm("end"), icon: <StopIcon /> });
  if (status === "Draft")
    moreItems.push({ label: "Delete draft", danger: true, divider: true, onClick: () => setConfirm("delete"), icon: <TrashIcon /> });

  return (
    <div>
      <CreateVoucherModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        existing={all ?? []}
        editVoucher={editing}
        onSubmit={handleSubmit}
      />
      <VoucherConfirmDialog
        kind={confirm}
        code={voucher.code}
        onClose={() => setConfirm(null)}
        onConfirm={(reason) => confirm && handleConfirm(confirm, reason)}
      />

      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Link href="/vouchers" className="transition-colors duration-150 ease-out hover:text-slate-900">Vouchers</Link>
        <span className="text-slate-300">›</span>
        <span className="truncate text-slate-700">{voucher.code}</span>
      </nav>

      {/* Title row */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/vouchers"
            aria-label="Back to vouchers"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-[20px] font-semibold tracking-wide text-slate-900">{voucher.code}</h1>
              <button
                type="button"
                onClick={copyCode}
                aria-label={`Copy ${voucher.code}`}
                className="grid h-6 w-6 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                {copied ? <span className="text-emerald-600"><CheckIcon /></span> : <CopyIcon />}
              </button>
              <StatusBadge status={status} />
            </div>
            <p className="truncate text-[12.5px] text-slate-500">{voucher.name} · {validityCaption(voucher, status)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "Draft" && (
            <>
              <ActionButton onClick={() => setEditing(voucher)}><PencilIcon /> Edit</ActionButton>
              <ActionButton onClick={() => setConfirm("publish")} tone="primary"><CheckIcon /> Publish</ActionButton>
            </>
          )}
          {(status === "Active" || status === "Scheduled") && (
            <>
              <ActionButton onClick={() => setEditing(voucher)}><PencilIcon /> Edit</ActionButton>
              <ActionButton onClick={() => setConfirm("pause")}><PauseIcon /> Pause</ActionButton>
            </>
          )}
          {status === "Paused" && (
            <>
              <ActionButton onClick={() => setEditing(voucher)}><PencilIcon /> Edit</ActionButton>
              <ActionButton onClick={() => setConfirm("resume")} tone="primary"><PlayIcon /> Resume</ActionButton>
            </>
          )}
          {status === "Ended" && <ActionButton onClick={duplicate}><CopyIcon /> Duplicate</ActionButton>}
          {moreItems.length > 0 && (
            <div className="grid h-[34px] w-[34px] place-items-center rounded-lg border border-slate-200 bg-white">
              <RowMenu ariaLabel="More actions" items={moreItems} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* Left — usage, redemptions, history */}
        <div className="space-y-5 lg:col-span-2">
          {status === "Draft" ? (
            <section className={CARD + " px-5 py-6"}>
              <div className="text-[13.5px] font-semibold tracking-tight text-slate-900">Not published yet</div>
              <p className="mt-1 text-[12.5px] text-slate-500">Usage and redemptions show here once the voucher is live.</p>
            </section>
          ) : (
            <section className={CARD}>
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                <Stat label="Redeemed" value={voucher.stats.redeemed.toLocaleString()} />
                <Stat label="Discount granted" value={peso(voucher.stats.discountGranted)} />
                <Stat label="Remaining" value={remaining} />
              </div>
            </section>
          )}

          {status !== "Draft" && (
            <section className={CARD}>
              <div className={SECTION_HEADER}>
                <h2 className="text-[14px] font-semibold tracking-tight text-slate-900">Recent redemptions</h2>
                {used > redemptions.length && <span className="text-[12px] text-slate-500">Latest {redemptions.length} of {used.toLocaleString()}</span>}
              </div>
              {redemptions.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <div className="text-[13px] font-medium text-slate-700">No redemptions yet</div>
                  <div className="mt-0.5 text-[12px] text-slate-400">Bookings that use {voucher.code} will show here.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                        <th className="px-3.5 py-2.5 font-medium">Booking</th>
                        <th className="px-3.5 py-2.5 font-medium">Customer</th>
                        <th className="px-3.5 py-2.5 font-medium">Route</th>
                        <th className="px-3.5 py-2.5 text-right font-medium">Discount</th>
                        <th className="px-3.5 py-2.5 font-medium">Redeemed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {redemptions.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3.5 py-3 font-mono text-[12px] font-semibold text-slate-900">{r.bookingRef}</td>
                          <td className="px-3.5 py-3 text-slate-700">{r.customer}</td>
                          <td className="px-3.5 py-3 text-slate-500">{r.route}</td>
                          <td className="px-3.5 py-3 text-right tabular-nums text-slate-900">{peso(r.amount)}</td>
                          <td className="px-3.5 py-3 text-[12.5px] tabular-nums text-slate-500">{fmtDateTime(r.at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section className={CARD}>
            <div className={SECTION_HEADER}>
              <h2 className="text-[14px] font-semibold tracking-tight text-slate-900">History</h2>
            </div>
            <ol className="space-y-4 px-5 py-4">
              {newest.map((h, i) => (
                <li key={`${h.at}-${i}`} className="relative flex gap-3">
                  {i < newest.length - 1 && <span className="absolute left-[4px] top-4 h-[calc(100%+4px)] w-px bg-slate-200" aria-hidden />}
                  <span className={`mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full ring-2 ring-white ${i === 0 ? HISTORY_DOT_LATEST : HISTORY_DOT_OLDER}`} />
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-4 text-[12.5px]">
                    <div className="min-w-0">
                      <div className="text-slate-900">
                        <span className="font-semibold">{historyLabel[h.action]}</span>
                        <span className="text-slate-500"> by {h.actor}</span>
                      </div>
                      {h.detail && <div className="mt-0.5 text-slate-600">{h.detail}</div>}
                    </div>
                    <div className="shrink-0 text-[11.5px] tabular-nums text-slate-400">{fmtDateTime(h.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right — the voucher's terms */}
        <section className={CARD}>
          <div className={SECTION_HEADER}>
            <h2 className="text-[14px] font-semibold tracking-tight text-slate-900">Details</h2>
          </div>
          <dl className="divide-y divide-slate-100 text-[12.5px]">
            <Row label="Discount" value={discountLabel(voucher)} />
            <Row label="Valid from" value={fmtDate(voucher.startDate)} />
            <Row label="Valid until" value={`${fmtDate(voucher.endDate)}, 11:59 PM`} />
            <Row label="Total uses" value={voucher.usageLimit != null ? voucher.usageLimit.toLocaleString() : "No limit"} />
            <Row label="Discount budget" value={voucher.budgetLimit != null ? peso(voucher.budgetLimit) : "No limit"} />
            {exposure != null && <Row label="Max possible cost" value={peso(exposure)} />}
          </dl>
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">Applied automatically</div>
            <ul className="space-y-1 text-[12px] text-slate-600">
              <li>1 use per customer · 1 voucher per booking</li>
              <li>Everyone, on all participating trips</li>
              <li>Funded by {voucher.funding}</li>
            </ul>
          </div>
          <div className="border-t border-slate-100 px-5 py-3.5 text-[12px] text-slate-500">
            Created {fmtShortDate(voucher.createdAt.slice(0, 10))} by {voucher.createdBy}
            {voucher.description && <p className="mt-1.5 text-slate-600">{voucher.description}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, tone = "default" }: { children: React.ReactNode; onClick: () => void; tone?: "default" | "primary" | "danger" }) {
  const cls =
    tone === "primary"
      ? "bg-brand-600 text-white hover:bg-brand-700"
      : tone === "danger"
        ? "border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] [&_svg]:h-3.5 [&_svg]:w-3.5 ${cls}`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 text-[20px] font-semibold tabular-nums tracking-tight text-slate-900">{value}</div>
      {sub && <div className="text-[11.5px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-2.5">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
