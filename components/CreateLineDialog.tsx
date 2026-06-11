"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import type { Line } from "@/lib/shipping-lines";

export type NewLine = {
  line: Line;
  /** Whether the line accepts bookings from the moment it's created. */
  enabled: boolean;
  /** Contact details to seed the line's account profile. */
  contact: { contactEmail: string; contactPhone: string; website: string; address: string };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (created: NewLine) => void;
  /** Existing line ids — used to keep the generated id unique. */
  existingIds: string[];
};

// Logo-less lines fall back to their initials on a neutral gray tile — no
// per-line color picking; this keeps new lines visually consistent.
const FALLBACK_TINT = "bg-slate-500";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** First two significant initials, e.g. "Trans-Asia" → "TA". */
function deriveInitial(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const inputCls =
  "mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100";
const labelCls = "block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500";

export default function CreateLineDialog({ open, onClose, onCreate, existingIds }: Props) {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [logo, setLogo] = useState(""); // data URL
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setEnabled(true);
      setLogo("");
      setWebsite("");
      setEmail("");
      setPhone("");
      setAddress("");
      setDragging(false);
      setSubmitting(false);
    }
  }, [open]);

  const trimmed = name.trim();
  const valid = trimmed.length > 0;
  const initial = deriveInitial(trimmed || "?");

  const readImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const uniqueId = () => {
    const base = slugify(trimmed) || "line";
    let id = base;
    let n = 2;
    while (existingIds.includes(id)) id = `${base}-${n++}`;
    return id;
  };

  const handleCreate = () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    onCreate({
      line: {
        id: uniqueId(),
        name: trimmed,
        members: 0,
        plan: "Starter",
        logo,
        fallbackTint: FALLBACK_TINT,
        initial: deriveInitial(trimmed),
      },
      enabled,
      contact: {
        contactEmail: email.trim(),
        contactPhone: phone.trim(),
        website: website.trim(),
        address: address.trim(),
      },
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} maxWidth="max-w-lg">
      <div className="max-h-[78vh] overflow-y-auto px-6 pb-5 pt-6">
        {/* ── Header ── */}
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-200/70"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">
              Add a shipping line
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              Only the name is required — everything else is optional and can be
              changed later in Settings.
            </p>
          </div>
        </div>

        {/* ── Identity row: logo + name ── */}
        <div className="mt-5 flex items-start gap-4">
          {/* Logo upload tile */}
          <div className="shrink-0">
            <span className={`mb-1.5 ${labelCls}`}>Logo</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); readImage(e.dataTransfer.files?.[0]); }}
              aria-label="Upload logo"
              className={`group relative grid h-[68px] w-[68px] place-items-center overflow-hidden rounded-xl ring-1 transition-[box-shadow,background-color] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                dragging
                  ? "bg-brand-50 ring-2 ring-brand-400"
                  : "bg-slate-50 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {logo ? (
                <img src={logo} alt="Logo preview" className="h-full w-full object-cover" />
              ) : (
                <span className={`grid h-full w-full place-items-center text-base font-bold text-white ${FALLBACK_TINT}`}>
                  {initial}
                </span>
              )}
              <span className="absolute inset-0 grid place-items-center bg-slate-900/55 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                  <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </span>
            </button>
            {logo ? (
              <button
                type="button"
                onClick={() => setLogo("")}
                className="mt-1.5 block w-full text-center text-[11px] font-medium text-slate-400 transition-colors hover:text-rose-600"
              >
                Remove
              </button>
            ) : (
              <p className="mt-1.5 w-[68px] text-center text-[10.5px] leading-tight text-slate-400">
                Drop or click
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { readImage(e.target.files?.[0]); e.target.value = ""; }}
            />
          </div>

          {/* Name */}
          <div className="min-w-0 flex-1">
            <label className={labelCls}>
              Line name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && valid) { e.preventDefault(); handleCreate(); } }}
              autoFocus
              placeholder="e.g. Sunrise Ferries"
              className={inputCls}
            />
            <p className="mt-2 text-[11px] leading-snug text-slate-400">
              No logo? The line shows its initials on a neutral tile.
            </p>
          </div>
        </div>

        {/* ── Status toggle ── */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
          <div className="min-w-0 pr-3">
            <p className="text-[13px] font-semibold tracking-tight text-slate-800">Enable shipping line</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
              {enabled
                ? "The line is active and available right away."
                : "The line is created disabled — enable it whenever you're ready."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Enable shipping line"
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
              enabled ? "bg-brand-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-150 ${
                enabled ? "translate-x-[18px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </div>

        {/* ── Contact details ── */}
        <div className="mt-6">
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-semibold tracking-tight text-slate-700">Contact details</span>
            <span className="text-[11px] font-normal text-slate-400">Optional</span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Website</span>
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Support email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@line.ph" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Contact number</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 2 8888 0000" className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Business address</span>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Pier 4, North Harbor, Manila" className={inputCls} />
            </label>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!valid || submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-brand-700 hover:shadow-[0_6px_16px_-6px_rgba(234,88,12,0.55)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100"
        >
          {submitting ? "Adding…" : "Add line"}
        </button>
      </div>
    </Modal>
  );
}
