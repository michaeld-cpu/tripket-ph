"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/UserContext";

// Sign-in only — no sign-up (accounts are provisioned by admins). Fields:
// email + password, with a forgot-password link.
export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 1;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!valid || submitting) return;
    setSubmitting(true);
    // Simulate a round-trip, then verify against the seeded credentials.
    setTimeout(() => {
      const res = signIn(email, password);
      if (res.ok) {
        router.replace("/");
        return;
      }
      setSubmitting(false);
      setError(
        res.error === "unknown_email"
          ? "No account found for that email."
          : "Incorrect password. Please try again."
      );
    }, 450);
  };

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 shadow-[0_8px_24px_-8px_rgba(234,88,12,0.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/imgs/logo.png" alt="Tripket PH" className="h-6 w-6 object-contain brightness-0 invert" />
            <span className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" />
          </div>
          <h1 className="mt-3 text-[18px] font-semibold tracking-tight text-slate-900">Sign in to Tripket PH</h1>
          <p className="mt-1 text-[12.5px] text-slate-500">Admin operations dashboard</p>
        </div>

        {/* Card */}
        <form
          onSubmit={submit}
          className="rounded-2xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70"
        >
          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold tracking-tight text-slate-700">Email</span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@operator.ph"
              className={inputCls + (error ? " border-rose-300 focus:border-rose-300 focus:ring-rose-100" : "")}
            />
          </label>

          <label className="mt-4 block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12.5px] font-semibold tracking-tight text-slate-700">Password</span>
              <a href="/login/forgot" className="text-[11.5px] font-medium text-brand-700 transition-colors hover:text-brand-800">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                className={inputCls + " pr-10" + (error ? " border-rose-300 focus:border-rose-300 focus:ring-rose-100" : "")}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300"
              >
                {showPw ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.8" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={!valid || submitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

      </div>
    </div>
  );
}
