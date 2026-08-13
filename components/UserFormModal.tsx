"use client";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { lines } from "@/lib/shipping-lines";
import { userStatusLabel, type User, type UserRole, type UserStatus } from "@/lib/users-data";

/**
 * UserFormModal — shared create/edit dialog for platform users.
 *
 * Create mode (no `editUser`): name, email, role, shipping line.
 * Edit mode (`editUser` provided): the same fields pre-filled, plus a Status
 * segmented control. Title/CTA adapt to the mode.
 */

type Draft = {
  /** Composed from firstName + lastName on submit — the stored User keeps a
   *  single `name`, so consumers are unchanged. */
  name: string;
  email: string;
  role: UserRole;
  lineId: string;
  status: UserStatus;
  /** Set only when creating (or when an admin resets it). Never populated from
   *  an existing user — passwords aren't read back. */
  password?: string;
};

// Platform users govern the product, so they're Admin or Super Admin only.
// Operators aren't offered here — an operator's role is implied by the surface
// they're created from, and the Role field is hidden there entirely.
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "Superadmin", label: "Super Admin" },
  { value: "Admin", label: "Admin" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserFormModal({
  open,
  editUser,
  lockedLineId,
  defaultRole = "Operator",
  entityNoun = "user",
  onClose,
  onSubmit,
}: {
  open: boolean;
  /** When provided, the dialog edits this user; otherwise it creates a new one. */
  editUser?: User | null;
  /** When set, the shipping line is fixed to this id (Team tab) — the line
      picker is shown read-only. */
  lockedLineId?: string;
  /** Role a freshly-created user starts on. Lets the Users page default to
      Admin and the Operators page default to Operator. */
  defaultRole?: UserRole;
  /** What this dialog is managing — drives the title, subtitle and CTA so the
      Operators page reads "Create operator" rather than "Create user". */
  entityNoun?: "user" | "operator";
  onClose: () => void;
  onSubmit: (draft: Draft) => void;
}) {
  const isEdit = !!editUser;
  const defaultLine = lockedLineId ?? lines[0]?.id ?? "";
  const [draft, setDraft] = useState<Draft>({
    name: "", email: "", role: defaultRole, lineId: defaultLine, status: "Active",
  });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editUser
        ? { name: editUser.name, email: editUser.email, role: editUser.role, lineId: editUser.lineId, status: editUser.status }
        : { name: "", email: "", role: defaultRole, lineId: defaultLine, status: "Active" }
    );
    // Everything before the last space is the first name, so multi-word given
    // names survive the split/rejoin round-trip.
    const parts = (editUser?.name ?? "").trim().split(/\s+/);
    setLastName(parts.length > 1 ? parts[parts.length - 1] : "");
    setFirstName(parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "");
    setPassword("");
    setConfirm("");
    setShowPw(false);
    setShowConfirm(false);
    setTouched(false);
  }, [open, editUser, defaultLine, defaultRole]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  // Passwords are required on create and optional on edit — leaving them blank
  // when editing keeps the existing one rather than clearing it.
  const pwRequired = !isEdit;
  const errs = {
    firstName: firstName.trim() ? "" : "First name is required.",
    lastName: lastName.trim() ? "" : "Last name is required.",
    email: EMAIL_RE.test(draft.email.trim()) ? "" : "Enter a valid email.",
    password:
      pwRequired && password.length === 0 ? "Password is required."
        : password.length > 0 && password.length < 8 ? "Use at least 8 characters."
        : "",
    confirm:
      (pwRequired || password.length > 0) && confirm !== password ? "Passwords don't match."
        : "",
  };
  const valid = Object.values(errs).every((e) => !e) && draft.lineId !== "";
  const show = (k: keyof typeof errs) => (touched ? errs[k] : "");

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSubmit({
      ...draft,
      name: fullName,
      email: draft.email.trim(),
      password: password || undefined,
    });
    onClose();
  };

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex max-h-[88vh] flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-4">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">
              {isEdit ? `Edit ${entityNoun}` : `Create ${entityNoun}`}
            </h2>
            <p className="text-[12px] text-slate-500">
              {isEdit
                ? `Update this ${entityNoun}'s details and access.`
                : `Add a ${entityNoun} and assign them to the current shipping line.`}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required error={show("firstName")}>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="E.g. Juan"
                autoFocus
                className={inputCls}
              />
            </Field>
            <Field label="Last name" required error={show("lastName")}>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="E.g. Dela Cruz"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Email" required error={show("email")}>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@operator.ph"
              className={inputCls}
            />
          </Field>

          {/* Passwords are set at creation only — an existing account's
              password is changed through a reset, not this form. */}
          {!isEdit && (
            <>
              <Field label="Password" required error={show("password")}>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  revealed={showPw}
                  onToggle={() => setShowPw((v) => !v)}
                  className={inputCls}
                  ariaLabel="Password"
                />
              </Field>

              <Field label="Confirm Password" required error={show("confirm")}>
                <PasswordInput
                  value={confirm}
                  onChange={setConfirm}
                  revealed={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  className={inputCls}
                  ariaLabel="Confirm password"
                />
              </Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Operators have exactly one role, so there's nothing to choose —
                the field only appears for platform users. */}
            {entityNoun !== "operator" && (
              <Field label="Role">
                <Select
                  value={draft.role}
                  onChange={(v) => set("role", v as UserRole)}
                  ariaLabel="Role"
                  className="w-full"
                  options={ROLE_OPTIONS}
                />
              </Field>
            )}
            {isEdit && (
              <Field label="Status">
                <div className="flex rounded-lg bg-slate-100 p-0.5">
                  {(["Active", "Suspended"] as UserStatus[]).map((s) => {
                    const on = draft.status === s;
                    const tone = s === "Active" ? "text-emerald-700" : "text-slate-700";
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("status", s)}
                        className={"flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none " + (on ? `bg-white ${tone} shadow-[0_1px_2px_rgba(15,23,42,0.08)]` : "text-slate-500 hover:text-slate-700")}
                      >
                        {userStatusLabel[s]}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isEdit ? "Save changes" : `Create ${entityNoun}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold tracking-tight text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11.5px] font-medium text-rose-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11.5px] text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

// Password field with a reveal toggle. The eye sits inside the input's right
// edge, so the field keeps the same footprint as every other one.
function PasswordInput({
  value,
  onChange,
  revealed,
  onToggle,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  revealed: boolean;
  onToggle: () => void;
  className: string;
  ariaLabel: string;
}) {
  return (
    <span className="relative block">
      <input
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        aria-label={ariaLabel}
        className={className + " pr-10"}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={revealed ? `Hide ${ariaLabel.toLowerCase()}` : `Show ${ariaLabel.toLowerCase()}`}
        aria-pressed={revealed}
        className="absolute right-1 top-1/2 grid h-7 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        {revealed ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M3 3l18 18" />
            <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c7 0 11 7 11 7a19 19 0 0 1-3.1 3.9M6.2 6.4A19 19 0 0 0 1 12s4 7 11 7a9.9 9.9 0 0 0 4.3-1" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}

export type { Draft as UserDraft };
