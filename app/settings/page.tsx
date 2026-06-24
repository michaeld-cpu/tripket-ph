"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { LogoTile } from "@/components/ShippingLineSwitcher";
import Select from "@/components/Select";
import SaveBar from "@/components/SaveBar";
import NumberInput from "@/components/NumberInput";
import {
  PASSENGER_REQUIREMENTS,
  VEHICLE_DETAIL_REQUIREMENTS,
  VEHICLE_DOCUMENT_REQUIREMENTS,
  loadSettings,
  saveSettings,
  defaultSettings,
  loadAccount,
  saveAccount,
  POLICY_OPTIONS,
  type LineSettings,
  type LineCatalog,
  type Requirement,
  type RequirementKey,
  type BookingPolicy,
  type AccountProfile,
  type VehicleClass,
  type PassengerType,
  type AddOn,
} from "@/lib/settings-data";
import type { Line } from "@/lib/shipping-lines";
import { useCurrentUser } from "@/components/UserContext";
import { getLineStatus, setLineStatus, type LineStatus } from "@/lib/line-status";
import SuspendLineDialog from "@/components/SuspendLineDialog";

type TabId = "account" | "booking";
const TABS: { id: TabId; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "booking", label: "Configurations" },
];

export default function SettingsPage() {
  const { active } = useShippingLine();
  const [tab, setTab] = useState<TabId>("booking");

  return (
    <div>
      <PageHeader title="Settings" subtitle={active.name} showDateFilter={false} />

      {/* Tab bar */}
      <div className="mb-5 flex items-center gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "relative px-4 py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300 " +
                (on ? "text-brand-600" : "text-slate-500 hover:text-slate-800")
              }
            >
              {t.label}
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>

      {tab === "booking" ? (
        <BookingTab lineId={active.id} />
      ) : (
        <AccountTab line={active} />
      )}
    </div>
  );
}

// Section descriptors drive both the left navigator and the anchor ids.
const CONFIG_SECTIONS = [
  { id: "vehicle-classes", label: "Vehicle classes" },
  { id: "passenger-types", label: "Passenger types" },
  { id: "add-ons",         label: "Add-ons" },
  { id: "passenger-reqs", label: "Passenger requirements" },
  { id: "vehicle-reqs",   label: "Vehicle requirements" },
  { id: "booking-policy", label: "Booking policy" },
  { id: "booking-window", label: "Booking window" },
  { id: "cancellation",   label: "Cancellation & refunds" },
  { id: "passenger-rules", label: "Passenger rules" },
];

// ─────────── Configurations tab (merged requirements + policy) ───────────
function BookingTab({ lineId }: { lineId: string }) {
  // Two copies: `saved` = last persisted, `draft` = live edits. Dirty when
  // they differ; Save commits draft→storage, Discard reverts draft←saved.
  const [saved, setSaved] = useState<LineSettings>(() => defaultSettings());
  const [draft, setDraft] = useState<LineSettings>(() => defaultSettings());
  const [activeSection, setActiveSection] = useState(CONFIG_SECTIONS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadSettings(lineId);
    setSaved(loaded);
    setDraft(loaded);
  }, [lineId]);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  // Required-field gate — every catalog row needs a non-empty label so
  // the vessel dialog can render it. Empty rows would surface as blank
  // toggles. Save stays disabled until every row has one.
  const catalogValid = useMemo(() => {
    const allLabeled = [
      ...draft.catalog.vehicleClasses,
      ...draft.catalog.passengerTypes,
      ...draft.catalog.addOns,
    ].every((row) => row.label.trim() !== "");
    return allLabeled;
  }, [draft.catalog]);

  const toggleReq = (key: RequirementKey) =>
    setDraft((s) => ({ ...s, requirements: { ...s.requirements, [key]: !s.requirements[key] } }));
  const setPolicy = <K extends keyof BookingPolicy>(k: K, v: BookingPolicy[K]) =>
    setDraft((s) => ({ ...s, policy: { ...s.policy, [k]: v } }));
  const setCatalog = <K extends keyof LineCatalog>(k: K, v: LineCatalog[K]) =>
    setDraft((s) => ({ ...s, catalog: { ...s.catalog, [k]: v } }));

  const onSave = () => { saveSettings(lineId, draft); setSaved(draft); };
  const onDiscard = () => setDraft(saved);

  // Tab-style navigation — clicking a rail topic swaps the visible panel
  // (each section renders only when active), reset scroll to top.
  const jumpTo = (id: string) => {
    setActiveSection(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  return (
    <div className="flex gap-6">
      {/* Left navigator — sticky table of contents. */}
      <nav className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-4">
          <div className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">On this page</div>
          <ul className="space-y-0.5">
            {CONFIG_SECTIONS.map((s) => {
              const on = activeSection === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(s.id)}
                    className={
                      "relative flex w-full items-center rounded-md px-3 py-1.5 text-left text-[12.5px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300 " +
                      (on ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900")
                    }
                  >
                    {on && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500" />}
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Scrollable content column. The save bar is pinned to its bottom. */}
      <div ref={scrollRef} className="relative max-h-[calc(100vh-180px)] min-w-0 flex-1 overflow-y-auto pb-24 pr-1" style={{ scrollbarGutter: "stable" }}>
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="space-y-5"
        >
          {activeSection === "vehicle-classes" && (
          <section id="vehicle-classes">
            <Card title="Vehicle classes" subtitle="Define the vehicle catalog for this shipping line. Vessels toggle which classes they accept; edits here flow live into every vessel that uses them.">
              <VehicleClassesEditor
                value={draft.catalog.vehicleClasses}
                onChange={(v) => setCatalog("vehicleClasses", v)}
              />
            </Card>
          </section>
          )}

          {activeSection === "passenger-types" && (
          <section id="passenger-types">
            <Card title="Passenger types" subtitle="Fare categories with their default discount and required document. These appear when pricing every departure.">
              <PassengerTypesEditor
                value={draft.catalog.passengerTypes}
                onChange={(v) => setCatalog("passengerTypes", v)}
              />
            </Card>
          </section>
          )}

          {activeSection === "add-ons" && (
          <section id="add-ons">
            <Card title="Add-ons" subtitle="Optional extras passengers can buy on top of their base ticket. Vessels toggle which extras they offer; the price comes from here.">
              <AddOnsEditor
                value={draft.catalog.addOns}
                onChange={(v) => setCatalog("addOns", v)}
              />
            </Card>
          </section>
          )}

          {activeSection === "passenger-reqs" && (
          <section id="passenger-reqs">
            <Card title="Passenger requirements" subtitle="Fields collected from passengers during booking. Full name and age are always required.">
              <RequirementGrid items={PASSENGER_REQUIREMENTS} state={draft.requirements} onToggle={toggleReq} />
            </Card>
          </section>
          )}

          {activeSection === "vehicle-reqs" && (
          <section id="vehicle-reqs">
            <Card title="Vehicle requirements" subtitle="Fields and documents required when a passenger boards with a vehicle (RoRo).">
              <Eyebrow>Required details</Eyebrow>
              <RequirementGrid items={VEHICLE_DETAIL_REQUIREMENTS} state={draft.requirements} onToggle={toggleReq} />
              <div className="mt-5">
                <Eyebrow>Required documents from driver</Eyebrow>
                <RequirementGrid items={VEHICLE_DOCUMENT_REQUIREMENTS} state={draft.requirements} onToggle={toggleReq} />
              </div>
            </Card>
          </section>
          )}

          {activeSection === "booking-policy" && (
          <section id="booking-policy">
            <Card title="Booking policy" subtitle="Rules that govern how bookings are accepted, paid for, and cancelled on this line.">
              <PolicySection title="Cutoff & cancellation">
                <PolicyNumber label="Booking cutoff" hint="Booking closes this long before departure" value={draft.policy.bookingCutoffHours} onChange={(v) => setPolicy("bookingCutoffHours", v)} suffix="hours" />
                <PolicyNumber label="Free cancellation" hint="Full-refund window before departure" value={draft.policy.freeCancelHours} onChange={(v) => setPolicy("freeCancelHours", v)} suffix="hours" />
                <PolicyNumber label="Refund within window" value={draft.policy.refundPct} onChange={(v) => setPolicy("refundPct", v)} suffix="%" />
                <PolicyToggle label="No-show forfeits fare" hint="No-shows are not refunded" value={draft.policy.noShowForfeit} onChange={(v) => setPolicy("noShowForfeit", v)} />
              </PolicySection>
              <PolicySection title="Capacity & overbooking">
                <PolicyNumber label="Overbooking allowance" value={draft.policy.overbookingPct} onChange={(v) => setPolicy("overbookingPct", v)} suffix="%" />
                <PolicyToggle label="Waitlist" hint="Let passengers join a waitlist when full" value={draft.policy.waitlistEnabled} onChange={(v) => setPolicy("waitlistEnabled", v)} />
                <PolicyNumber label="Seat hold" hint="Hold an unpaid seat this long" value={draft.policy.seatHoldMinutes} onChange={(v) => setPolicy("seatHoldMinutes", v)} suffix="min" />
              </PolicySection>
              <PolicySection title="Payment & fees">
                <PolicyToggle label="Tripket Wallet" hint="Accept wallet payments" value={draft.policy.acceptWallet} onChange={(v) => setPolicy("acceptWallet", v)} />
                <PolicyToggle label="Card" hint="Accept card payments" value={draft.policy.acceptCard} onChange={(v) => setPolicy("acceptCard", v)} />
                <PolicyNumber label="Booking fee" hint="Flat convenience fee per booking" value={draft.policy.bookingFee} onChange={(v) => setPolicy("bookingFee", v)} prefix="₱" />
                <PolicyToggle label="Partial payment" hint="Allow downpayment then balance" value={draft.policy.allowPartialPayment} onChange={(v) => setPolicy("allowPartialPayment", v)} />
              </PolicySection>
              <PolicySection title="Vehicle & baggage">
                <PolicyNumber label="Comped seats per vehicle" hint="Free seats bundled with a vehicle fare" value={draft.policy.compedSeatsPerVehicle} onChange={(v) => setPolicy("compedSeatsPerVehicle", v)} suffix="seats" />
                <PolicyNumber label="Free baggage allowance" value={draft.policy.baggageAllowanceKg} onChange={(v) => setPolicy("baggageAllowanceKg", v)} suffix="kg" />
                <PolicyToggle label="Oversized needs approval" hint="Overweight/oversized vehicles require operator approval" value={draft.policy.oversizedNeedsApproval} onChange={(v) => setPolicy("oversizedNeedsApproval", v)} />
              </PolicySection>
              <PolicySection title="Boarding" last>
                <PolicyNumber label="Boarding notice" hint="Passengers must board this long before departure" value={draft.policy.boardingNoticeMinutes} onChange={(v) => setPolicy("boardingNoticeMinutes", v)} suffix="min" />
              </PolicySection>
            </Card>
          </section>
          )}

          {activeSection === "booking-window" && (
          <section id="booking-window">
            <PresetCard title="Booking window" subtitle="Control when bookings open and close relative to the departure time.">
              <PolicySelect label="Booking opens" value={draft.policy.bookingOpens} options={POLICY_OPTIONS.bookingOpens} onChange={(v) => setPolicy("bookingOpens", v)} />
              <PolicySelect label="Booking closes" value={draft.policy.bookingCloses} options={POLICY_OPTIONS.bookingCloses} onChange={(v) => setPolicy("bookingCloses", v)} />
              <PolicySelect label="Overbooking allowance" value={draft.policy.overbookingMode} options={POLICY_OPTIONS.overbookingMode} onChange={(v) => setPolicy("overbookingMode", v)} full />
            </PresetCard>
          </section>
          )}

          {activeSection === "cancellation" && (
          <section id="cancellation">
            <PresetCard title="Cancellation & refunds" subtitle="Define the default refund rules passengers see when booking.">
              <PolicySelect label="Cancellation policy" value={draft.policy.cancellationPolicy} options={POLICY_OPTIONS.cancellationPolicy} onChange={(v) => setPolicy("cancellationPolicy", v)} full />
              <PolicySelect label="Reschedule allowed" value={draft.policy.rescheduleAllowed} options={POLICY_OPTIONS.rescheduleAllowed} onChange={(v) => setPolicy("rescheduleAllowed", v)} />
              <PolicySelect label="Rescheduling fee" value={draft.policy.reschedulingFee} options={POLICY_OPTIONS.reschedulingFee} onChange={(v) => setPolicy("reschedulingFee", v)} />
            </PresetCard>
          </section>
          )}

          {activeSection === "passenger-rules" && (
          <section id="passenger-rules">
            <PresetCard title="Passenger rules" subtitle="Age and group restrictions applied at checkout.">
              <PolicySelect label="Minimum age (unaccompanied)" value={draft.policy.minUnaccompaniedAge} options={POLICY_OPTIONS.minUnaccompaniedAge} onChange={(v) => setPolicy("minUnaccompaniedAge", v)} />
              <PolicySelect label="Infant age threshold" value={draft.policy.infantAgeThreshold} options={POLICY_OPTIONS.infantAgeThreshold} onChange={(v) => setPolicy("infantAgeThreshold", v)} />
              <PolicySelect label="ID verification" value={draft.policy.idVerification} options={POLICY_OPTIONS.idVerification} onChange={(v) => setPolicy("idVerification", v)} full />
            </PresetCard>
          </section>
          )}
        </motion.div>

      </div>

      {/* App-level save bar — pinned to the viewport bottom, spanning the
          content area beside the sidebar. */}
      <SaveBar
        open={dirty}
        onSave={onSave}
        onDiscard={onDiscard}
        saveDisabled={!catalogValid}
        disabledHint="Every catalog row needs a label"
      />
    </div>
  );
}

// ─────────── Building blocks ───────────
function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Preset-style policy card — grid of custom dropdowns. No per-card save:
// edits flow into the page draft and surface in the sticky bottom bar.
function PresetCard({
  title, subtitle, children,
}: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
      <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// Uses the app's custom Select popover (not a native <select>) for a
// consistent dropdown across the product.
function PolicySelect({
  label, value, options, onChange, full,
}: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void; full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-[12px] text-slate-500">{label}</span>
      <Select
        value={value}
        onChange={onChange}
        ariaLabel={label}
        className="w-full"
        options={options.map((o) => ({ value: o, label: o }))}
      />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">{children}</div>;
}

function RequirementGrid({
  items, state, onToggle,
}: {
  items: Requirement[];
  state: Record<RequirementKey, boolean>;
  onToggle: (key: RequirementKey) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {items.map((r) => {
        const on = state[r.key];
        return (
          <button
            key={r.key}
            type="button"
            disabled={r.locked}
            onClick={() => !r.locked && onToggle(r.key)}
            className={
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300 " +
              (on ? "border-brand-200 bg-brand-50/40" : "border-slate-200 bg-white hover:bg-slate-50") +
              (r.locked ? " cursor-default" : "")
            }
          >
            <div className="min-w-0">
              <div className="text-[13px] font-medium tracking-tight text-slate-900">{r.label}</div>
              <div className={"text-[11px] " + (on && !r.locked ? "text-brand-600" : "text-slate-400")}>{r.hint}</div>
            </div>
            {r.locked ? (
              <span className="shrink-0 whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Always required
              </span>
            ) : (
              <Switch on={on} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Switch({ on, dim }: { on: boolean; dim?: boolean }) {
  return (
    <span
      className={
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 " +
        (on ? (dim ? "bg-brand-300" : "bg-brand-500") : "bg-slate-200")
      }
    >
      <span className={"block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-transform duration-150 " + (on ? "translate-x-4" : "translate-x-0")} />
    </span>
  );
}

function PolicySection({ title, last, children }: { title: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={last ? "" : "mb-5 border-b border-slate-100 pb-5"}>
      <Eyebrow>{title}</Eyebrow>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function PolicyRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium tracking-tight text-slate-900">{label}</div>
        {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function PolicyNumber({
  label, hint, value, onChange, suffix, prefix,
}: {
  label: string; hint?: string; value: number; onChange: (v: number) => void; suffix?: string; prefix?: string;
}) {
  return (
    <PolicyRow label={label} hint={hint}>
      <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
        {prefix && <span className="text-[12px] text-slate-400">{prefix}</span>}
        <NumberInput
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-12 bg-transparent text-right text-[13px] font-semibold tabular-nums text-slate-900 focus:outline-none"
        />
        {suffix && <span className="text-[11px] text-slate-400">{suffix}</span>}
      </div>
    </PolicyRow>
  );
}

function PolicyToggle({
  label, hint, value, onChange,
}: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <PolicyRow label={label} hint={hint}>
      <button type="button" onClick={() => onChange(!value)} role="switch" aria-checked={value} aria-label={label} className="shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-300 rounded-full">
        <Switch on={value} />
      </button>
    </PolicyRow>
  );
}

// ─────────── Catalog editors ───────────
// Three master-catalog editors for vehicle classes, passenger types, and
// add-ons. Each shares a row → edit-in-place model and a "+ Add" button.
// Deletes are immediate (operator-owned data; the bottom SaveBar handles
// the commit). No special handling for built-in vs custom rows — once a
// line's catalog drifts from defaults, the operator owns it end-to-end.

function CatalogHeader({
  label, hint, count, onAdd, addLabel,
}: {
  label: string;
  hint: string;
  count: { used: number; total: number };
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <p className="mt-1 text-[11.5px] text-slate-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] tabular-nums text-slate-400">
          <span className="font-medium text-slate-700">{count.used}</span> of {count.total}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

const catalogInputCls =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] tracking-tight placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}

function VehicleClassesEditor({
  value, onChange,
}: {
  value: VehicleClass[];
  onChange: (next: VehicleClass[]) => void;
}) {
  const update = (key: string, patch: Partial<VehicleClass>) =>
    onChange(value.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const remove = (key: string) => onChange(value.filter((c) => c.key !== key));
  const add = () => onChange([
    ...value,
    { key: `custom-${Date.now()}`, label: "", descriptor: "", enabled: true, defaultPrice: 0, includedCompanions: 1 },
  ]);

  const usedCount = value.filter((c) => c.label.trim()).length;

  return (
    <div>
      <CatalogHeader
        label="Catalog"
        hint="Set the label, descriptor, default fare, and weight or length limit for each class."
        count={{ used: usedCount, total: value.length }}
        onAdd={add}
        addLabel="Add class"
      />
      <div className="grid grid-cols-[1.4fr_1.2fr_96px_80px_96px_72px_36px] items-center gap-2 border-b border-slate-100 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        <span className="whitespace-nowrap">Label</span>
        <span className="whitespace-nowrap">Descriptor</span>
        <span className="whitespace-nowrap text-right">Max (kg / m)</span>
        <span className="whitespace-nowrap text-right">Quantity</span>
        <span className="whitespace-nowrap text-right">Default fare</span>
        <span className="whitespace-nowrap text-right" title="Extra companion seats bundled into the vehicle fare (driver always rides free)">Companions</span>
        <span />
      </div>
      <div className="divide-y divide-slate-100">
        {value.length === 0 ? (
          <div className="py-6 text-center text-[11.5px] text-slate-400">No vehicle classes. Add one to make it available to vessels.</div>
        ) : (
          value.map((c) => (
            <div key={c.key} className="grid grid-cols-[1.4fr_1.2fr_96px_80px_96px_72px_36px] items-center gap-2 py-2">
              <input
                type="text"
                value={c.label}
                onChange={(e) => update(c.key, { label: e.target.value })}
                placeholder="e.g. Motorcycle / Tricycle"
                className={catalogInputCls}
              />
              <input
                type="text"
                value={c.descriptor}
                onChange={(e) => update(c.key, { descriptor: e.target.value })}
                placeholder="e.g. ≤ 300 kg GVW"
                className={catalogInputCls}
              />
              <input
                type="text"
                inputMode="numeric"
                value={c.maxLengthM ? `${c.maxLengthM} m` : c.maxWeightKg ? String(c.maxWeightKg) : ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const isLength = /m$/i.test(raw);
                  const num = Number(raw.replace(/[^0-9.]/g, "")) || undefined;
                  if (isLength) update(c.key, { maxLengthM: num, maxWeightKg: undefined });
                  else update(c.key, { maxWeightKg: num, maxLengthM: undefined });
                }}
                placeholder="3500"
                className={catalogInputCls + " text-right font-mono tabular-nums"}
              />
              <div className="flex items-center rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={c.capacity != null ? String(c.capacity) : ""}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, ""));
                    update(c.key, { capacity: e.target.value === "" ? undefined : n });
                  }}
                  placeholder="—"
                  aria-label="Quantity the vessel can store"
                  className="w-full bg-transparent text-right font-mono text-[12.5px] tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
                />
                <span className="text-[10.5px] font-medium text-slate-400">qty</span>
              </div>
              <div className="flex items-center rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <span className="text-[11px] font-medium text-slate-400">₱</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(c.defaultPrice ?? 0)}
                  onChange={(e) => update(c.key, { defaultPrice: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                  className="w-full bg-transparent text-right font-mono text-[12.5px] tabular-nums text-slate-900 focus:outline-none"
                />
              </div>
              <div className="flex items-center rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(c.includedCompanions ?? 1)}
                  onChange={(e) => update(c.key, { includedCompanions: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                  placeholder="1"
                  aria-label="Bundled companion seats"
                  className="w-full bg-transparent text-right font-mono text-[12.5px] tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
                />
                <span className="text-[10.5px] font-medium text-slate-400">pax</span>
              </div>
              <RemoveButton onClick={() => remove(c.key)} label={`Remove ${c.label || "class"}`} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PassengerTypesEditor({
  value, onChange,
}: {
  value: PassengerType[];
  onChange: (next: PassengerType[]) => void;
}) {
  const update = (key: string, patch: Partial<PassengerType>) =>
    onChange(value.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const remove = (key: string) => onChange(value.filter((p) => p.key !== key));
  const add = () => onChange([
    ...value,
    { key: `custom-${Date.now()}`, label: "", discountKind: "percent", discountPct: 0, requiredDoc: "" },
  ]);

  const usedCount = value.filter((p) => p.label.trim()).length;

  return (
    <div>
      <CatalogHeader
        label="Catalog"
        hint="Set the discount % and required document for each fare category. Mark Infant if the row is the free-fare / no-seat type."
        count={{ used: usedCount, total: value.length }}
        onAdd={add}
        addLabel="Add type"
      />
      <div className="grid grid-cols-[1.4fr_160px_1.4fr_36px] items-center gap-2 border-b border-slate-100 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        <span className="whitespace-nowrap">Category</span>
        <span className="whitespace-nowrap text-right">Discount <span className="text-slate-300">(% or ₱)</span></span>
        <span className="whitespace-nowrap">Required document</span>
        <span />
      </div>
      <div className="divide-y divide-slate-100">
        {value.length === 0 ? (
          <div className="py-6 text-center text-[11.5px] text-slate-400">No passenger types. Add one to make it available to vessels.</div>
        ) : (
          value.map((p) => {
            const kind = p.discountKind ?? "percent";
            const isPct = kind === "percent";
            const amount = isPct ? p.discountPct : (p.discountFlat ?? 0);
            return (
            <div key={p.key} className="grid grid-cols-[1.4fr_160px_1.4fr_36px] items-center gap-2 py-2">
              <input
                type="text"
                value={p.label}
                onChange={(e) => update(p.key, { label: e.target.value })}
                placeholder="e.g. Senior Citizen"
                className={catalogInputCls}
              />
              {/* Discount = [unit kind segmented] + [number with bold unit].
                  The segmented control reads as "what kind of discount,"
                  and the input shows the active unit so the value is never
                  ambiguous at a glance. */}
              <div className="flex h-9 items-stretch rounded-md border border-slate-200 bg-white transition-[border-color,box-shadow] focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100">
                <button
                  type="button"
                  onClick={() => update(p.key, { discountKind: isPct ? "flat" : "percent" })}
                  aria-label={`Switch to ${isPct ? "flat peso amount" : "percentage"}`}
                  title={isPct ? "Switch to ₱ flat amount" : "Switch to % discount"}
                  className="group/unit flex shrink-0 items-center gap-0.5 rounded-l-[5px] border-r border-slate-200 bg-slate-50 pl-2 pr-1 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:bg-slate-100"
                >
                  <span>{isPct ? "%" : "₱"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-slate-400 transition-colors group-hover/unit:text-slate-600" aria-hidden>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(amount)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, "")) || 0;
                    update(p.key, isPct ? { discountPct: n } : { discountFlat: n });
                  }}
                  aria-label={isPct ? "Discount percentage" : "Discount in pesos"}
                  className="w-full min-w-0 bg-transparent px-2 text-right font-mono text-[13px] tabular-nums text-slate-900 focus:outline-none"
                />
                <span className="hidden items-center pr-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-slate-400 sm:flex">
                  off
                </span>
              </div>
              <input
                type="text"
                value={p.requiredDoc}
                onChange={(e) => update(p.key, { requiredDoc: e.target.value })}
                placeholder="e.g. OSCA ID / Senior Citizen ID"
                className={catalogInputCls}
              />
              <RemoveButton onClick={() => remove(p.key)} label={`Remove ${p.label || "type"}`} />
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AddOnsEditor({
  value, onChange,
}: {
  value: AddOn[];
  onChange: (next: AddOn[]) => void;
}) {
  const update = (key: string, patch: Partial<AddOn>) =>
    onChange(value.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  const remove = (key: string) => onChange(value.filter((a) => a.key !== key));
  const add = () => onChange([
    ...value,
    { key: `custom-${Date.now()}`, label: "", descriptor: "", defaultPrice: 0, enabled: true },
  ]);

  const usedCount = value.filter((a) => a.label.trim()).length;

  return (
    <div>
      <CatalogHeader
        label="Catalog"
        hint="Default prices for every add-on. Vessels can toggle them on or off but cannot override the price."
        count={{ used: usedCount, total: value.length }}
        onAdd={add}
        addLabel="Add add-on"
      />
      <div className="grid grid-cols-[1.3fr_1.5fr_96px_36px] items-center gap-2 border-b border-slate-100 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        <span className="whitespace-nowrap">Name</span>
        <span className="whitespace-nowrap">Descriptor</span>
        <span className="whitespace-nowrap text-right">Default price</span>
        <span />
      </div>
      <div className="divide-y divide-slate-100">
        {value.length === 0 ? (
          <div className="py-6 text-center text-[11.5px] text-slate-400">No add-ons. Add one to make it available to vessels.</div>
        ) : (
          value.map((a) => (
            <div key={a.key} className="grid grid-cols-[1.3fr_1.5fr_96px_36px] items-center gap-2 py-2">
              <input
                type="text"
                value={a.label}
                onChange={(e) => update(a.key, { label: e.target.value })}
                placeholder="e.g. Extra Cabin Bag"
                className={catalogInputCls}
              />
              <input
                type="text"
                value={a.descriptor}
                onChange={(e) => update(a.key, { descriptor: e.target.value })}
                placeholder="e.g. Beyond included carry-on"
                className={catalogInputCls}
              />
              <div className="flex items-center rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <span className="text-[11px] font-medium text-slate-400">₱</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(a.defaultPrice)}
                  onChange={(e) => update(a.key, { defaultPrice: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                  className="w-full bg-transparent text-right font-mono text-[12.5px] tabular-nums text-slate-900 focus:outline-none"
                />
              </div>
              <RemoveButton onClick={() => remove(a.key)} label={`Remove ${a.label || "add-on"}`} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────── Account tab ───────────
function AccountTab({ line }: { line: Line }) {
  // Draft/saved model — edits surface in the shared bottom SaveBar.
  const [saved, setSaved] = useState<AccountProfile | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    const loaded = loadAccount(line.id, line.name);
    setSaved(loaded);
    setProfile(loaded);
  }, [line.id, line.name]);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(profile), [saved, profile]);

  // Line enable/disable — admin-only. Operators are locked to their line and
  // must not be able to lock themselves out of it.
  // NOTE: every hook below must run on every render, so they live ABOVE the
  // `if (!profile)` early return — otherwise React sees a changing hook count.
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [status, setStatus] = useState<LineStatus>("active");
  // Suspend opens a type-to-confirm dialog (same pattern as DeleteVesselDialog);
  // re-activate is immediate.
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => { setStatus(getLineStatus(line.id)); setConfirmOpen(false); }, [line.id]);

  if (!profile) return null;

  const confirmTarget = profile.displayName || line.name;
  const set = <K extends keyof AccountProfile>(k: K, v: AccountProfile[K]) =>
    setProfile((p) => (p ? { ...p, [k]: v } : p));
  const onSave = () => { if (profile) { saveAccount(line.id, profile); setSaved(profile); } };
  const onDiscard = () => setProfile(saved);
  const applyStatus = (next: LineStatus) => {
    setLineStatus(line.id, next);
    setStatus(next);
  };

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="space-y-5 pb-24">
      <Card title="Line Profile" subtitle="How this shipping line appears across Tripket. Saved to this line only.">
        {/* Identity row — editable logo (hover to change) + display name */}
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50/70 px-4 py-3 ring-1 ring-slate-200/60">
          <LogoUploader line={line} value={profile.logoUrl} onChange={(url) => set("logoUrl", url)} />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold tracking-tight text-slate-900">{profile.displayName || line.name}</div>
            <div className="font-mono text-[11px] text-slate-400">{line.id}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AccountField label="Display name">
            <input type="text" value={profile.displayName} onChange={(e) => set("displayName", e.target.value)} className={inputCls} />
          </AccountField>
          <AccountField label="Website">
            <input type="text" value={profile.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className={inputCls} />
          </AccountField>
          <AccountField label="Support email">
            <input type="email" value={profile.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputCls} />
          </AccountField>
          <AccountField label="Contact number">
            <input type="text" value={profile.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={inputCls} />
          </AccountField>
          <div className="sm:col-span-2">
            <AccountField label="Business address">
              <input type="text" value={profile.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
            </AccountField>
          </div>
        </div>

      </Card>

      {/* Danger zone — admin-only. Operators are scoped to a single line and
          can't be allowed to suspend (and lock themselves out of) it. */}
      {isAdmin && (
        <section className="rounded-2xl bg-white p-6 ring-1 ring-rose-200/70">
          <h2 className="text-[15px] font-semibold tracking-tight text-rose-700">Danger zone</h2>
          {status === "active" ? (
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              Deactivating stops new bookings and hides future schedules for this line.
              Existing bookings are honored. You can activate it again at any time.
            </p>
          ) : (
            <p className="mt-0.5 text-[12.5px] text-rose-600">
              This line is deactivated — it is not accepting new bookings and its future
              schedules are hidden. Activate to restore it.
            </p>
          )}
          <button
            type="button"
            onClick={() => (status === "active" ? setConfirmOpen(true) : applyStatus("active"))}
            className={
              status === "active"
                ? "mt-4 inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors duration-150 hover:bg-rose-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-300"
                : "mt-4 inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors duration-150 hover:bg-emerald-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-300"
            }
          >
            {status === "active" ? "Deactivate shipping line" : "Activate shipping line"}
          </button>

          <SuspendLineDialog
            open={confirmOpen}
            line={line}
            name={confirmTarget}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => applyStatus("suspended")}
          />
        </section>
      )}

      <SaveBar open={dirty} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}

// Editable line logo — click the tile to pick an image (stored as a data URL
// on the draft profile). Falls back to the line's default LogoTile when empty.
function LogoUploader({ line, value, onChange }: { line: Line; value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Change logo"
        className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {value ? (
          <img src={value} alt="Line logo" className="h-11 w-11 rounded-lg object-cover ring-1 ring-slate-200" />
        ) : (
          <LogoTile line={line} size={44} />
        )}
        {/* Hover/focus camera overlay */}
        <span className="absolute inset-0 grid place-items-center rounded-lg bg-slate-900/55 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );
}

function AccountField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold tracking-tight text-slate-700">{label}</span>
      {children}
    </label>
  );
}

