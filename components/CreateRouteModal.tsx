"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Stepper from "@/components/Stepper";
import WizardHeader from "@/components/wizard/WizardHeader";
import WizardFooter from "@/components/wizard/WizardFooter";
import RoutesStep, { type RoutesValue, PORTS, RouteContextCard, findPort } from "@/components/schedule-steps/RoutesStep";
import { getCustomPorts } from "@/lib/custom-ports";

/**
 * CreateRouteModal — 2-step dialog for adding a route from the Routes page.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ 1. Details   →   2. Review                   │
 *   └──────────────────────────────────────────────┘
 *
 * Step 1 reuses the same RoutesStep the schedule wizard uses (port pickers,
 * distance/duration auto-fill, return-route toggle). Step 2 is a read-only
 * confirmation surface mirroring the wizard's review pattern.
 */

function initialValue(): RoutesValue {
  return {
    originCode: "",
    destinationCode: "",
    distanceNm: "",
    durationLowHrs: "",
    durationHighHrs: "",
    createReturn: false,
  };
}

type StepId = "details" | "review";
const STEPS: { id: StepId; label: string; description: string }[] = [
  { id: "details", label: "Details", description: "Pick the origin and destination ports." },
  { id: "review",  label: "Review",  description: "Confirm and create." },
];

export type CreatedRoute = RoutesValue;

export default function CreateRouteModal({
  open,
  onClose,
  onCreate,
  editValue,
  onSave,
  editExtra,
  editMode = "edit",
}: {
  open: boolean;
  onClose: () => void;
  onCreate?: (payload: CreatedRoute) => void;
  /** When provided, the dialog opens in edit mode pre-filled with this route. */
  editValue?: RoutesValue | null;
  /** Persist edits (edit mode only). */
  onSave?: (payload: RoutesValue) => void;
  /** Extra content rendered below the form in edit mode (e.g. assigned vessels). */
  editExtra?: React.ReactNode;
  /** Which edit variant this is — drives chrome (title, icon, save label).
   *  "edit"   = tweak details on an existing route.
   *  "assign" = manage the route's vessel roster (the form is secondary). */
  editMode?: "edit" | "assign";
}) {
  const isEdit = !!editValue;
  const isAssign = isEdit && editMode === "assign";
  const [stepIdx, setStepIdx] = useState(0);
  const [value, setValue] = useState<RoutesValue>(initialValue);
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    setStepIdx(0);
    setValue(editValue ?? initialValue());
  }, [open, editValue]);

  // Step 1 gates step 2.
  const sameOriginDest = value.originCode !== "" && value.originCode === value.destinationCode;
  const detailsValid =
    value.originCode !== "" &&
    value.destinationCode !== "" &&
    !sameOriginDest &&
    Number(value.distanceNm) > 0 &&
    Number(value.durationLowHrs) > 0 &&
    Number(value.durationHighHrs) >= Number(value.durationLowHrs);

  const continueDisabled = step.id === "details" && !detailsValid;

  const saveEdit = () => {
    if (!detailsValid) return;
    onSave?.(value);
    onClose();
  };

  const goNext = () => {
    if (isLast) {
      onCreate?.(value);
      onClose();
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex max-h-[90vh] flex-col">
        <WizardHeader
          title={isAssign ? "Assign vessels" : isEdit ? "Edit route" : "Create route"}
          caption={
            isAssign
              ? "Pick the vessels that sail this route. Departures are managed in the schedule wizard."
              : isEdit
                ? "Update the distance, crossing time, or status."
                : step.description
          }
          onClose={onClose}
          icon={
            isAssign ? (
              // Ferry silhouette — signals the assignment domain.
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M3 17h18l-2 3H5l-2-3Z" />
                <rect x="5" y="11" width="14" height="6" rx="1" />
                <path d="M8 11V7h8v4" />
                <path d="M12 7V4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            )
          }
        />

        {/* Stepper — only in create mode. Editing is a single form, so the
            two-pip wizard chrome would be noise. */}
        {!isEdit && (
          <div className="border-b border-slate-100 px-6 py-4">
            <Stepper
              steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
              currentIdx={stepIdx}
              onStepClick={(idx) => {
                // Only allow jumping back to completed steps.
                if (idx <= stepIdx) setStepIdx(idx);
              }}
            />
          </div>
        )}

        <div
          className="min-h-[280px] flex-1 overflow-y-auto px-6 py-5"
          style={{ scrollbarGutter: "stable" }}
        >
          {isEdit ? (
            <div className="space-y-5">
              {isAssign ? (
                /* Assign mode: just the route context card + the vessel
                   editor. Distance, duration, and status all belong to
                   the Edit-route action — not here. */
                <>
                  <RouteContextCard value={value} />
                  {editExtra}
                </>
              ) : (
                <>
                  <RoutesStep value={value} onChange={setValue} hideReturnToggle showStatus lockPorts />
                  {editExtra}
                </>
              )}
            </div>
          ) : step.id === "details" ? (
            <RoutesStep value={value} onChange={setValue} />
          ) : (
            <RouteReview value={value} onEdit={() => setStepIdx(0)} />
          )}
        </div>

        {isEdit ? (
          <EditFooter
            onCancel={onClose}
            onSave={saveEdit}
            saveDisabled={!detailsValid}
            saveLabel={isAssign ? "Save assignments" : "Save changes"}
          />
        ) : (
          <WizardFooter
            stepIdx={stepIdx}
            stepCount={STEPS.length}
            onCancel={onClose}
            onBack={goBack}
            onContinue={goNext}
            isLast={isLast}
            continueLabel={isLast ? "Create route" : "Continue"}
            continueDisabled={continueDisabled}
          />
        )}
      </div>
    </Modal>
  );
}

// ─────────── Edit-mode footer ───────────
// Cancel · Save changes. Deleting a route lives in the table's row actions
// menu, not here — editing stays focused on changes.
function EditFooter({
  onCancel,
  onSave,
  saveDisabled,
  saveLabel,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saveLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled}
        className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saveLabel}
      </button>
    </div>
  );
}

// ─────────── Review pane ───────────
function RouteReview({ value, onEdit }: { value: RoutesValue; onEdit: () => void }) {
  const allPorts = [...PORTS, ...getCustomPorts()];
  const origin = findPort(allPorts, value.originCode);
  const destination = findPort(allPorts, value.destinationCode);

  return (
    <div className="space-y-4">
      {/* Hero — directional pair, mirrors the schedule wizard's review hero. */}
      <div className="overflow-hidden rounded-2xl bg-brand-500 p-1.5">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white">
            New route
          </span>
          {value.createReturn && (
            <span className="text-[10.5px] font-medium text-white/85">+ return leg</span>
          )}
        </div>
        <div className="rounded-xl bg-white px-5 py-5">
          <div className="flex items-center justify-center gap-3">
            <div className="min-w-0 text-center">
              <div className="truncate font-mono text-[22px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">
                {origin?.code ?? "—"}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-slate-500">{origin?.city ?? "—"}</div>
            </div>
            <svg viewBox="0 0 48 12" className="h-3 w-12 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 6 H38" strokeDasharray="3 3" />
              <path d="M38 2 L44 6 L38 10" />
            </svg>
            <div className="min-w-0 text-center">
              <div className="truncate font-mono text-[22px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">
                {destination?.code ?? "—"}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-slate-500">{destination?.city ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
          <h4 className="text-[13px] font-semibold tracking-tight text-slate-900">Details</h4>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium text-brand-700 transition-colors duration-150 hover:bg-brand-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Edit
          </button>
        </div>
        <dl className="divide-y divide-slate-100 px-4 pb-3.5">
          <Row label="Origin" value={origin ? `${origin.city} (${origin.code})` : "—"} />
          <Row label="Destination" value={destination ? `${destination.city} (${destination.code})` : "—"} />
          <Row
            label="Distance"
            value={
              <span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">{value.distanceNm || "—"}</span>
                <span className="ml-1 text-[10.5px] text-slate-400">nm</span>
              </span>
            }
          />
          <Row
            label="Crossing"
            value={
              value.durationLowHrs && value.durationHighHrs ? (
                <span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {value.durationLowHrs}–{value.durationHighHrs}
                  </span>
                  <span className="ml-1 text-[10.5px] text-slate-400">hrs</span>
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )
            }
          />
          <Row
            label="Return leg"
            value={value.createReturn ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-medium text-brand-700 ring-1 ring-brand-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                  <path d="M17 4l4 4-4 4M3 8h18M7 20l-4-4 4-4M21 16H3" />
                </svg>
                Will be created
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          />
        </dl>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-emerald-600">
          <path d="M5 12l5 5L20 7" />
        </svg>
        <span className="text-[12.5px] tracking-tight text-slate-700">
          <span className="font-semibold text-slate-900">Ready to create.</span>{" "}
          <span className="text-slate-500">
            {value.createReturn ? "1 route + return leg" : "1 route"} will be added to your catalog.
          </span>
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-[12px] text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-[12.5px] font-medium tracking-tight text-slate-900">{value}</dd>
    </div>
  );
}
