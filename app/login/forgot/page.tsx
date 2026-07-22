"use client";
import { useState } from "react";
import Link from "next/link";

// Forgot-password — email entry → confirmation. No account creation here.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 shadow-[0_8px_24px_-8px_rgba(234,88,12,0.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/imgs/logo.png" alt="Tripket PH" className="h-6 w-6 object-contain brightness-0 invert" />
          </div>
          <h1 className="mt-3 text-[18px] font-semibold tracking-tight text-slate-900">Request a temporary password</h1>
          <p className="mt-1 text-[12.5px] text-slate-500">We&apos;ll email you a temporary password.</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70">
          <form onSubmit={(e) => { e.preventDefault(); if (valid && !sent) setSent(true); }}>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold tracking-tight text-slate-700">Email</span>
              <input type="email" autoFocus value={email} disabled={sent} onChange={(e) => setEmail(e.target.value)} placeholder="you@operator.ph" className={`${inputCls} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`} />
            </label>
            <button
              type="submit"
              disabled={!valid || sent}
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sent && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12l5 5 9-11" /></svg>
              )}
              {sent ? "Sent" : "Request"}
            </button>
            {sent && (
              <p className="mt-3 text-center text-[12px] leading-relaxed text-slate-500">
                The temporary password sent is valid for 30 days only. Be sure to change it in your settings before it expires.
              </p>
            )}
          </form>
        </div>

        <div className="mt-5 text-center">
          <Link href="/login" className="text-[12px] font-medium text-brand-700 transition-colors hover:text-brand-800">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
