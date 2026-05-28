"use client";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { lines } from "@/lib/shipping-lines";
import { LogoTile } from "@/components/ShippingLineSwitcher";
import type { User, UserRole, UserStatus } from "@/lib/users-data";

/**
 * UserFormModal — shared create/edit dialog for platform users.
 *
 * Create mode (no `editUser`): name, email, role, shipping line.
 * Edit mode (`editUser` provided): the same fields pre-filled, plus a Status
 * segmented control. Title/CTA adapt to the mode.
 */

type Draft = {
  name: string;
  email: string;
  role: UserRole;
  lineId: string;
  status: UserStatus;
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "Admin", label: "Admin" },
  { value: "Operator", label: "Operator" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserFormModal({
  open,
  editUser,
  lockedLineId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  /** When provided, the dialog edits this user; otherwise it creates a new one. */
  editUser?: User | null;
  /** When set, the shipping line is fixed to this id (Team tab) — the line
      picker is shown read-only. */
  lockedLineId?: string;
  onClose: () => void;
  onSubmit: (draft: Draft) => void;
}) {
  const isEdit = !!editUser;
  const defaultLine = lockedLineId ?? lines[0]?.id ?? "";
  const [draft, setDraft] = useState<Draft>({
    name: "", email: "", role: "Operator", lineId: defaultLine, status: "Active",
  });

  useEffect(() => {
    if (!open) return;
    setDraft(
      editUser
        ? { name: editUser.name, email: editUser.email, role: editUser.role, lineId: editUser.lineId, status: editUser.status }
        : { name: "", email: "", role: "Operator", lineId: defaultLine, status: "Active" }
    );
  }, [open, editUser, defaultLine]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const valid = draft.name.trim().length > 1 && EMAIL_RE.test(draft.email.trim()) && draft.lineId !== "";
  const lineOptions = useMemo(() => lines.map((l) => ({ value: l.id, label: l.name })), []);
  const selectedLine = lines.find((l) => l.id === draft.lineId);

  const submit = () => {
    if (!valid) return;
    onSubmit({ ...draft, name: draft.name.trim(), email: draft.email.trim() });
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
            <h2 className="text-[15.5px] font-semibold tracking-tight text-slate-900">{isEdit ? "Edit user" : "Create user"}</h2>
            <p className="text-[12px] text-slate-500">{isEdit ? "Update this user's details and access." : "Add a user and assign them to a shipping line."}</p>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field label="Full name">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Ada Reyes"
              autoFocus
              className={inputCls}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@operator.ph"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select
                value={draft.role}
                onChange={(v) => set("role", v as UserRole)}
                ariaLabel="Role"
                className="w-full"
                options={ROLE_OPTIONS}
              />
            </Field>
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
                        {s}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </div>

          {/* Shipping line — the operator this user is tied to. Read-only when
              locked (e.g. invited from a line's Team tab). */}
          <Field label="Shipping line">
            {lockedLineId ? (
              selectedLine && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50/70 px-3 py-2.5 ring-1 ring-slate-200/60">
                  <LogoTile line={selectedLine} size={20} />
                  <span className="text-[12.5px] font-medium tracking-tight text-slate-700">{selectedLine.name}</span>
                  <span className="ml-auto text-[11px] text-slate-400">Assigned operator</span>
                </div>
              )
            ) : (
              <>
                <Select
                  value={draft.lineId}
                  onChange={(v) => set("lineId", v)}
                  ariaLabel="Shipping line"
                  className="w-full"
                  options={lineOptions}
                />
                {selectedLine && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50/70 px-3 py-2 ring-1 ring-slate-200/60">
                    <LogoTile line={selectedLine} size={20} />
                    <span className="text-[12px] font-medium tracking-tight text-slate-700">{selectedLine.name}</span>
                    <span className="ml-auto text-[11px] text-slate-400">Assigned operator</span>
                  </div>
                )}
              </>
            )}
          </Field>
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
            {isEdit ? "Save changes" : "Create user"}
          </button>
        </div>
      </div>
    </Modal>
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

export type { Draft as UserDraft };
