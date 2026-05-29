"use client";
import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import SaveBar from "@/components/SaveBar";
import { useCurrentUser } from "@/components/UserContext";

// The authenticated user's OWN account — distinct from a shipping line's
// settings. Reached from the sidebar user menu ("Account settings"). For the
// admin this is a global account not tied to any line.

type AccountForm = {
  name: string;
  email: string;
  phone: string;
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

export default function AccountPage() {
  const { user } = useCurrentUser();
  const roleLabel = user?.role === "admin" ? "Administrator" : "Operator";

  const initial = useMemo<AccountForm>(
    () => ({ name: user?.name ?? "", email: user?.email ?? "", phone: "" }),
    [user?.name, user?.email]
  );
  const [saved, setSaved] = useState<AccountForm>(initial);
  const [form, setForm] = useState<AccountForm>(initial);
  const dirty = JSON.stringify(saved) !== JSON.stringify(form);
  // Required-field gate — Save disables until name + email are non-empty
  // and the email is a sane shape.
  const valid =
    form.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const set = <K extends keyof AccountForm>(k: K, v: AccountForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onSave = () => setSaved(form);
  const onDiscard = () => setForm(saved);

  const initials = (user?.name ?? "").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Account settings" subtitle="Your personal account" showDateFilter={false} />

      <div className="space-y-5 pb-24">
        {/* Identity */}
        <section className="rounded-2xl bg-white p-6 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-100 text-[18px] font-bold text-brand-600">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold tracking-tight text-slate-900">{form.name || "—"}</div>
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] text-slate-500">{form.email}</span>
                <span className="inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-700 ring-1 ring-brand-100">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Profile */}
        <section className="rounded-2xl bg-white p-6 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Profile</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">Your name and how teammates reach you.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+63 9XX XXX XXXX" className={inputCls} />
            </Field>
            <Field label="Role">
              <input type="text" value={roleLabel} disabled className={inputCls + " cursor-not-allowed bg-slate-50 text-slate-500"} />
            </Field>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-2xl bg-white p-6 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Security</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">Password and sign-in protection.</p>
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            <SecurityRow
              title="Password"
              detail="Last changed 3 months ago"
              action="Change"
            />
          </div>
        </section>

        {/* Sign out */}
        <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium tracking-tight text-slate-900">Sign out</div>
              <div className="text-[11.5px] text-slate-400">End your session on this device.</div>
            </div>
            <button type="button" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300">
              Sign out
            </button>
          </div>
        </section>
      </div>

      <SaveBar
        open={dirty}
        onSave={onSave}
        onDiscard={onDiscard}
        saveDisabled={!valid}
        disabledHint="Name and a valid email are required"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold tracking-tight text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SecurityRow({ title, detail, action }: { title: string; detail: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium tracking-tight text-slate-900">{title}</div>
        <div className="text-[11.5px] text-slate-400">{detail}</div>
      </div>
      <button type="button" className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300">
        {action}
      </button>
    </div>
  );
}
