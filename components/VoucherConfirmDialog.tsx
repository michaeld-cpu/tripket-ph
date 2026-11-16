"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

export type VoucherConfirmKind = "pause" | "resume" | "end" | "publish" | "delete";

const COPY: Record<VoucherConfirmKind, { title: string; body: string; cta: string; tone: "brand" | "danger" | "amber"; reason?: boolean }> = {
  publish: {
    title: "Publish voucher?",
    body: "Customers will be able to apply this code at checkout from its start date. The code and discount can't be changed after publishing.",
    cta: "Publish",
    tone: "brand",
  },
  pause: {
    title: "Pause voucher?",
    body: "Customers can't apply the code while it's paused. You can resume any time before the end date.",
    cta: "Pause voucher",
    tone: "amber",
    reason: true,
  },
  resume: {
    title: "Resume voucher?",
    body: "Customers will be able to apply the code again straight away.",
    cta: "Resume",
    tone: "brand",
  },
  end: {
    title: "End voucher now?",
    body: "The code stops working immediately and can't be restarted. Redemption history is kept for reporting.",
    cta: "End voucher",
    tone: "danger",
    reason: true,
  },
  delete: {
    title: "Delete draft?",
    body: "This draft was never published, so no customer has used it. It will be removed permanently.",
    cta: "Delete draft",
    tone: "danger",
  },
};

const TONE = {
  brand: "bg-brand-600 hover:bg-brand-700",
  amber: "bg-amber-600 hover:bg-amber-700",
  danger: "bg-rose-600 hover:bg-rose-700",
};

export default function VoucherConfirmDialog({
  kind,
  code,
  onClose,
  onConfirm,
}: {
  kind: VoucherConfirmKind | null;
  code: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (kind) setReason(""); }, [kind]);
  if (!kind) return null;
  const c = COPY[kind];

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{c.title}</h2>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-slate-600">{code}</span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{c.body}</p>
        {c.reason && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12.5px] font-semibold tracking-tight text-slate-700">Reason <span className="font-normal text-slate-400">(optional)</span></span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Shown in the voucher history"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { onConfirm(reason.trim()); onClose(); }}
          className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors ${TONE[c.tone]}`}
        >
          {c.cta}
        </button>
      </div>
    </Modal>
  );
}
