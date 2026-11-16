"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Stepper from "@/components/Stepper";
import WizardHeader from "@/components/wizard/WizardHeader";
import WizardFooter from "@/components/wizard/WizardFooter";
import { useCurrentUser } from "@/components/UserContext";
import DetailsStep from "@/components/voucher-steps/DetailsStep";
import DiscountStep, { discountValid } from "@/components/voucher-steps/DiscountStep";
import ValidityStep, { effectiveStart, validityValid } from "@/components/voucher-steps/ValidityStep";
import LimitsStep, { limitsValid } from "@/components/voucher-steps/LimitsStep";
import ReviewStep from "@/components/voucher-steps/ReviewStep";
import { NO_LOCKS, num, type VoucherDraft, type VoucherLocks } from "@/components/voucher-steps/shared";
import {
  CODE_PATTERN,
  fmtShortDate,
  parseISODate,
  peso,
  toISODate,
  voucherStatus,
  type Voucher,
  type VoucherHistoryEntry,
} from "@/lib/vouchers-data";

type StepId = "voucher" | "availability" | "review";

const STEPS: { id: StepId; label: string; description: string }[] = [
  { id: "voucher",      label: "Voucher",            description: "Name, code and discount." },
  { id: "availability", label: "Validity & limits",  description: "When it can be used, and how many times." },
  { id: "review",       label: "Review",             description: "Check everything before it goes live." },
];

export type VoucherSubmitIntent = "draft" | "publish" | "save";

function plusDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function emptyDraft(): VoucherDraft {
  const today = toISODate(new Date());
  return {
    name: "",
    code: "",
    codeTouched: false,
    description: "",
    discountType: "fixed",
    amount: "",
    maxDiscount: "",
    startMode: "now",
    startDate: today,
    endDate: plusDays(today, 29),
    limitUses: true,
    usageLimit: "",
    limitBudget: false,
    budgetLimit: "",
  };
}

function draftFromVoucher(v: Voucher): VoucherDraft {
  const today = toISODate(new Date());
  return {
    name: v.name,
    code: v.code,
    codeTouched: true,
    description: v.description,
    discountType: v.discountType,
    amount: String(v.amount),
    maxDiscount: v.maxDiscount != null ? String(v.maxDiscount) : "",
    // Drafts dated today (or earlier) read as "start on publish".
    startMode: v.state === "draft" && v.startDate <= today ? "now" : "scheduled",
    startDate: v.startDate,
    endDate: v.endDate,
    limitUses: v.usageLimit != null,
    usageLimit: v.usageLimit != null ? String(v.usageLimit) : "",
    limitBudget: v.budgetLimit != null,
    budgetLimit: v.budgetLimit != null ? String(v.budgetLimit) : "",
  };
}

function locksFor(v: Voucher | null | undefined): VoucherLocks {
  if (!v || v.state === "draft") return NO_LOCKS;
  const status = voucherStatus(v);
  return {
    terms: true,
    start: status !== "Scheduled",
    usedCount: v.stats.redeemed,
    granted: v.stats.discountGranted,
  };
}

/** Human summary of what changed on an edit, for the history trail. */
function changeSummary(before: Voucher, after: Voucher): string | undefined {
  const parts: string[] = [];
  if (before.name !== after.name) parts.push(`Name → ${after.name}`);
  if (before.code !== after.code) parts.push(`Code → ${after.code}`);
  if (before.discountType !== after.discountType || before.amount !== after.amount || before.maxDiscount !== after.maxDiscount) parts.push("Discount changed");
  if (before.startDate !== after.startDate) parts.push(`Start → ${fmtShortDate(after.startDate)}`);
  if (before.endDate !== after.endDate) parts.push(`End → ${fmtShortDate(after.endDate)}`);
  if (before.usageLimit !== after.usageLimit) parts.push(after.usageLimit != null ? `Uses → ${after.usageLimit.toLocaleString()}` : "Use limit removed");
  if (before.budgetLimit !== after.budgetLimit) parts.push(after.budgetLimit != null ? `Budget → ${peso(after.budgetLimit)}` : "Budget limit removed");
  if (before.description !== after.description) parts.push("Note updated");
  return parts.length ? parts.join(" · ") : undefined;
}

export default function CreateVoucherModal({
  open,
  onClose,
  existing,
  editVoucher,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** All vouchers, for code-uniqueness checks. */
  existing: Voucher[];
  /** When set, the wizard edits this voucher. */
  editVoucher?: Voucher | null;
  onSubmit: (voucher: Voucher, intent: VoucherSubmitIntent) => void;
}) {
  const { user } = useCurrentUser();
  const actor = user?.name ?? "Admin User";
  const isEdit = !!editVoucher;
  const isLiveEdit = isEdit && editVoucher!.state !== "draft";
  const locks = locksFor(editVoucher);
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<VoucherDraft>(emptyDraft);
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    setStepIdx(0);
    setDraft(editVoucher ? draftFromVoucher(editVoucher) : emptyDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editVoucher?.id]);

  // ── Validation ──
  const codeTaken = existing.some((v) => v.id !== editVoucher?.id && v.code === draft.code);
  const codeError =
    draft.code === "" ? null
    : !CODE_PATTERN.test(draft.code) ? "Use 3–20 letters, numbers or dashes."
    : codeTaken ? "Another voucher already uses this code."
    : null;
  const detailsOk = draft.name.trim() !== "" && draft.code !== "" && !codeError;
  const discountOk = discountValid(draft);
  const validityOk = validityValid(draft, locks);
  const limitsOk = limitsValid(draft, locks);
  const allOk = detailsOk && discountOk && validityOk && limitsOk;
  const stepValid: Record<StepId, boolean> = {
    voucher: detailsOk && discountOk,
    availability: validityOk && limitsOk,
    review: allOk,
  };

  const build = (intent: VoucherSubmitIntent): Voucher => {
    const now = new Date().toISOString();
    const today = toISODate(new Date());
    const fields = {
      name: draft.name.trim(),
      code: draft.code,
      description: draft.description.trim(),
      discountType: draft.discountType,
      amount: num(draft.amount),
      maxDiscount: draft.discountType === "percent" ? num(draft.maxDiscount) : null,
      // "Start on publish" pins to today at the moment it's saved.
      startDate: locks.start ? editVoucher!.startDate : draft.startMode === "now" ? today : draft.startDate,
      endDate: draft.endDate,
      usageLimit: draft.limitUses ? Math.round(num(draft.usageLimit)) : null,
      budgetLimit: draft.limitBudget ? num(draft.budgetLimit) : null,
    };

    if (editVoucher) {
      const next: Voucher = { ...editVoucher, ...fields, updatedAt: now };
      const history: VoucherHistoryEntry[] = [...editVoucher.history];
      const detail = changeSummary(editVoucher, next);
      if (detail) history.push({ at: now, actor, action: "updated", detail });
      if (intent === "publish") {
        next.state = "published";
        history.push({ at: now, actor, action: "published" });
      }
      return { ...next, history };
    }

    const history: VoucherHistoryEntry[] = [{ at: now, actor, action: "created" }];
    if (intent === "publish") history.push({ at: now, actor, action: "published" });
    return {
      id: `vch-${Date.now().toString(36)}`,
      ...fields,
      perCustomerLimit: 1,
      eligibility: { audience: "everyone", trips: "all" },
      funding: "Tripket",
      state: intent === "publish" ? "published" : "draft",
      stats: { redeemed: 0, discountGranted: 0 },
      createdBy: actor,
      createdAt: now,
      updatedAt: now,
      history,
    };
  };

  const finish = (intent: VoucherSubmitIntent) => {
    if (!allOk) return;
    onSubmit(build(intent), intent);
    onClose();
  };

  const goNext = () => {
    if (isLast) return finish(isLiveEdit ? "save" : "publish");
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const startsLater = draft.startMode === "scheduled" && draft.startDate > toISODate(new Date());
  const primaryLabel = !isLast
    ? "Continue"
    : isLiveEdit
      ? "Save changes"
      : startsLater ? "Schedule voucher" : "Publish voucher";

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex max-h-[90vh] flex-col">
        <WizardHeader
          title={isEdit ? `Edit ${editVoucher!.code}` : "Create voucher"}
          caption={step.description}
          onClose={onClose}
          icon={<VoucherGlyph className="h-4 w-4" />}
        />

        <div className="border-b border-slate-100 px-6 py-4">
          <Stepper
            steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
            currentIdx={stepIdx}
            onStepClick={setStepIdx}
          />
        </div>

        <div className="min-h-[440px] flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarGutter: "stable" }}>
          {step.id === "voucher" ? (
            <div className="space-y-8">
              <DetailsStep value={draft} onChange={setDraft} locks={locks} codeError={codeError} />
              <DiscountStep value={draft} onChange={setDraft} locks={locks} />
            </div>
          ) : step.id === "availability" ? (
            <div className="space-y-8">
              <ValidityStep value={draft} onChange={setDraft} locks={locks} />
              <LimitsStep value={draft} onChange={setDraft} locks={locks} />
            </div>
          ) : (
            <ReviewStep value={draft} locks={locks} onEdit={setStepIdx} />
          )}
        </div>

        <WizardFooter
          stepIdx={stepIdx}
          stepCount={STEPS.length}
          onCancel={onClose}
          onBack={() => setStepIdx((i) => Math.max(0, i - 1))}
          onContinue={goNext}
          isLast={isLast}
          continueLabel={primaryLabel}
          continueDisabled={!stepValid[step.id]}
          secondaryAction={
            isLast && !isLiveEdit
              ? { label: isEdit ? "Save draft" : "Save as draft", onClick: () => finish("draft"), disabled: !allOk }
              : undefined
          }
        />
      </div>
    </Modal>
  );
}

/** Voucher / coupon glyph — a ticket with a percent sign. Shared with the sidebar. */
export function VoucherGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
      <path d="M9.5 14.5l5-5" />
      <circle cx="9.75" cy="9.75" r=".9" fill="currentColor" stroke="none" />
      <circle cx="14.25" cy="14.25" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}
