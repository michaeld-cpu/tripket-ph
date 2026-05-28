"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { LogoTile } from "@/components/ShippingLineSwitcher";
import Select from "@/components/Select";
import SaveBar from "@/components/SaveBar";
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
  type Requirement,
  type RequirementKey,
  type BookingPolicy,
  type AccountProfile,
} from "@/lib/settings-data";
import type { Line } from "@/lib/shipping-lines";

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

  const toggleReq = (key: RequirementKey) =>
    setDraft((s) => ({ ...s, requirements: { ...s.requirements, [key]: !s.requirements[key] } }));
  const setPolicy = <K extends keyof BookingPolicy>(k: K, v: BookingPolicy[K]) =>
    setDraft((s) => ({ ...s, policy: { ...s.policy, [k]: v } }));

  const onSave = () => { saveSettings(lineId, draft); setSaved(draft); };
  const onDiscard = () => setDraft(saved);

  // Scroll-spy — highlight the section currently in view.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const els = CONFIG_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { root, rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lineId]);

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
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
        <div className="space-y-5">
          <section id="passenger-reqs" className="scroll-mt-4">
            <Card title="Passenger requirements" subtitle="Fields collected from passengers during booking. Full name and age are always required.">
              <RequirementGrid items={PASSENGER_REQUIREMENTS} state={draft.requirements} onToggle={toggleReq} />
            </Card>
          </section>

          <section id="vehicle-reqs" className="scroll-mt-4">
            <Card title="Vehicle requirements" subtitle="Fields and documents required when a passenger boards with a vehicle (RoRo).">
              <Eyebrow>Required details</Eyebrow>
              <RequirementGrid items={VEHICLE_DETAIL_REQUIREMENTS} state={draft.requirements} onToggle={toggleReq} />
              <div className="mt-5">
                <Eyebrow>Required documents from driver</Eyebrow>
                <RequirementGrid items={VEHICLE_DOCUMENT_REQUIREMENTS} state={draft.requirements} onToggle={toggleReq} />
              </div>
            </Card>
          </section>

          <section id="booking-policy" className="scroll-mt-4">
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

          <section id="booking-window" className="scroll-mt-4">
            <PresetCard title="Booking window" subtitle="Control when bookings open and close relative to the departure time.">
              <PolicySelect label="Booking opens" value={draft.policy.bookingOpens} options={POLICY_OPTIONS.bookingOpens} onChange={(v) => setPolicy("bookingOpens", v)} />
              <PolicySelect label="Booking closes" value={draft.policy.bookingCloses} options={POLICY_OPTIONS.bookingCloses} onChange={(v) => setPolicy("bookingCloses", v)} />
              <PolicySelect label="Overbooking allowance" value={draft.policy.overbookingMode} options={POLICY_OPTIONS.overbookingMode} onChange={(v) => setPolicy("overbookingMode", v)} full />
            </PresetCard>
          </section>

          <section id="cancellation" className="scroll-mt-4">
            <PresetCard title="Cancellation & refunds" subtitle="Define the default refund rules passengers see when booking.">
              <PolicySelect label="Cancellation policy" value={draft.policy.cancellationPolicy} options={POLICY_OPTIONS.cancellationPolicy} onChange={(v) => setPolicy("cancellationPolicy", v)} full />
              <PolicySelect label="Reschedule allowed" value={draft.policy.rescheduleAllowed} options={POLICY_OPTIONS.rescheduleAllowed} onChange={(v) => setPolicy("rescheduleAllowed", v)} />
              <PolicySelect label="Rescheduling fee" value={draft.policy.reschedulingFee} options={POLICY_OPTIONS.reschedulingFee} onChange={(v) => setPolicy("reschedulingFee", v)} />
            </PresetCard>
          </section>

          <section id="passenger-rules" className="scroll-mt-4">
            <PresetCard title="Passenger rules" subtitle="Age and group restrictions applied at checkout.">
              <PolicySelect label="Minimum age (unaccompanied)" value={draft.policy.minUnaccompaniedAge} options={POLICY_OPTIONS.minUnaccompaniedAge} onChange={(v) => setPolicy("minUnaccompaniedAge", v)} />
              <PolicySelect label="Infant age threshold" value={draft.policy.infantAgeThreshold} options={POLICY_OPTIONS.infantAgeThreshold} onChange={(v) => setPolicy("infantAgeThreshold", v)} />
              <PolicySelect label="ID verification" value={draft.policy.idVerification} options={POLICY_OPTIONS.idVerification} onChange={(v) => setPolicy("idVerification", v)} full />
            </PresetCard>
          </section>
        </div>

      </div>

      {/* App-level save bar — pinned to the viewport bottom, spanning the
          content area beside the sidebar. */}
      <SaveBar open={dirty} onSave={onSave} onDiscard={onDiscard} />
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
            <Switch on={on} dim={r.locked} />
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
        <input
          type="number"
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

  if (!profile) return null;

  const set = <K extends keyof AccountProfile>(k: K, v: AccountProfile[K]) =>
    setProfile((p) => (p ? { ...p, [k]: v } : p));
  const onSave = () => { if (profile) { saveAccount(line.id, profile); setSaved(profile); } };
  const onDiscard = () => setProfile(saved);

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

      {/* Danger zone */}
      <section className="rounded-2xl bg-white p-6 ring-1 ring-rose-200/70">
        <h2 className="text-[15px] font-semibold tracking-tight text-rose-700">Danger zone</h2>
        <p className="mt-0.5 text-[12.5px] text-slate-500">Deactivating suspends all bookings and schedules for this line.</p>
        <button type="button" className="mt-4 inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors duration-150 hover:bg-rose-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-300">
          Deactivate shipping line
        </button>
      </section>

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

