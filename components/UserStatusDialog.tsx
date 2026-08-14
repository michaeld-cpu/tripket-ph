"use client";
import Modal from "@/components/Modal";

/**
 * UserStatusDialog — confirms suspending or reactivating an account.
 *
 * Suspending revokes someone's access, so it asks first and names who it
 * affects. Reactivating is the benign direction and reads green rather than
 * red, so the two can't be mistaken for each other at a glance.
 */
export default function UserStatusDialog({
  open,
  name,
  noun = "user",
  mode,
  onClose,
  onConfirm,
}: {
  open: boolean;
  /** Whose access is changing — shown in the body copy. */
  name: string;
  /** "user" or "operator", so the copy matches the surface. */
  noun?: "user" | "operator";
  mode: "suspend" | "reactivate";
  onClose: () => void;
  onConfirm: () => void;
}) {
  const suspending = mode === "suspend";

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={
              "grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 " +
              (suspending
                ? "bg-rose-50 text-rose-600 ring-rose-200/70"
                : "bg-emerald-50 text-emerald-600 ring-emerald-200/70")
            }
          >
            {suspending ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9l6 6M15 9l-6 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 12.5l2.5 2.5 4.5-5" />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
              {suspending ? `Suspend this ${noun}?` : `Reactivate this ${noun}?`}
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">{name}</span>{" "}
              {suspending ? (
                <>
                  will be marked <span className="font-semibold text-rose-600">Suspended</span> and
                  won&rsquo;t be able to sign in. Their record stays on file and access can be
                  restored at any time.
                </>
              ) : (
                <>
                  will be marked <span className="font-semibold text-emerald-600">Active</span> and
                  can sign in again straight away.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              "rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition-colors " +
              (suspending ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700")
            }
          >
            {suspending ? "Suspend" : "Reactivate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
