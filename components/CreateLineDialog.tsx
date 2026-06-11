"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import type { Line } from "@/lib/shipping-lines";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (line: Line) => void;
  /** Existing line ids — used to keep the generated id unique. */
  existingIds: string[];
};

// Tailwind tint classes offered for the fallback tile (when no logo image).
const TINTS = [
  "bg-blue-600",
  "bg-emerald-700",
  "bg-rose-600",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-600",
  "bg-pink-600",
  "bg-yellow-500",
];

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

export default function CreateLineDialog({ open, onClose, onCreate, existingIds }: Props) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState(""); // data URL
  const [tint, setTint] = useState(TINTS[0]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setLogo("");
      setTint(TINTS[0]);
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
      id: uniqueId(),
      name: trimmed,
      members: 0,
      plan: "Starter",
      logo,
      fallbackTint: tint,
      initial: deriveInitial(trimmed),
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} maxWidth="max-w-md">
      <div className="px-6 pb-5 pt-6">
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
              Just a name and a logo to start. Contact details, fares, and booking
              rules are all set up afterward in Settings.
            </p>
          </div>
        </div>

        {/* ── Identity row: logo + name + tint ── */}
        <div className="mt-5 flex items-start gap-4">
          {/* Logo upload tile */}
          <div className="shrink-0">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              Logo
            </span>
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
                <span className={`grid h-full w-full place-items-center text-base font-bold text-white ${tint}`}>
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

          {/* Name + tint */}
          <div className="min-w-0 flex-1">
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              Line name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && valid) { e.preventDefault(); handleCreate(); } }}
              autoFocus
              placeholder="e.g. Sunrise Ferries"
              className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-3">
              <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                Fallback tint
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TINTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-label={t}
                    onClick={() => setTint(t)}
                    className={`h-[22px] w-[22px] rounded-md ${t} transition-transform hover:scale-110 ${
                      tint === t ? "ring-2 ring-slate-900 ring-offset-2" : ""
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-tight text-slate-400">
                Shown when no logo is uploaded.
              </p>
            </div>
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
