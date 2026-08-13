"use client";
import { useState } from "react";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import DatePicker from "@/components/DatePicker";
import { defaultVehicleClasses } from "@/components/AddVesselModal";
import {
  ID_TYPE_LABELS,
  type PassengerSex,
  type Ticket,
  type Vehicle,
  type PassengerPatch,
  type VehiclePatch,
} from "@/lib/bookings-data";

/**
 * EditEntityDialog — one shared editor for a booking's passenger ticket OR its
 * vehicle, opened from three places (the Bookings detail dialog, the Passengers
 * module, the Vehicles module). Kept presentational: it owns a local draft and
 * validation, and hands a typed patch back via onSave. The caller applies it
 * through the shared updatePassenger / updateVehicle helpers and persists.
 *
 * Fare/amount fields are deliberately absent — they drive payment totals and
 * stay read-only. When `locked` is true (a settled/terminal booking) the fields
 * are read-only and Save is disabled, with a banner explaining why.
 */

type PassengerInit = { kind: "passenger"; ticket: Ticket };
type VehicleInit = { kind: "vehicle"; vehicle: Vehicle };
export type EditEntityInit = PassengerInit | VehicleInit;

export default function EditEntityDialog({
  open,
  init,
  locked = false,
  lockedReason,
  onClose,
  onSavePassenger,
  onSaveVehicle,
}: {
  open: boolean;
  init: EditEntityInit | null;
  locked?: boolean;
  lockedReason?: string;
  onClose: () => void;
  onSavePassenger: (patch: PassengerPatch) => void;
  onSaveVehicle: (patch: VehiclePatch) => void;
}) {
  return (
    <Modal open={open && !!init} onClose={onClose} maxWidth="max-w-lg" layer="top">
      {init?.kind === "passenger" && (
        <PassengerForm
          key={init.ticket.id}
          ticket={init.ticket}
          locked={locked}
          lockedReason={lockedReason}
          onClose={onClose}
          onSave={onSavePassenger}
        />
      )}
      {init?.kind === "vehicle" && (
        <VehicleForm
          key={init.vehicle.plateNumber}
          vehicle={init.vehicle}
          locked={locked}
          lockedReason={lockedReason}
          onClose={onClose}
          onSave={onSaveVehicle}
        />
      )}
    </Modal>
  );
}

// ─────────── Shared chrome ───────────
// Kind-distinct header: passenger reads brand-orange with a person glyph;
// vehicle reads indigo with a car glyph, so the two editors are unmistakable.
const KIND_THEME = {
  passenger: {
    accent: "bg-brand-50 text-brand-600 ring-brand-200/70",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>),
    tag: "Passenger",
    tagCls: "bg-brand-50 text-brand-700",
  },
  vehicle: {
    accent: "bg-indigo-50 text-indigo-600 ring-indigo-200/70",
    // Same mark as the sidebar's Vehicles item, so the two read as one entity.
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M9.0072 17C9.0072 18.1046 8.11177 19 7.0072 19C5.90263 19 5.0072 18.1046 5.0072 17C5.0072 15.8954 5.90263 15 7.0072 15C8.11177 15 9.0072 15.8954 9.0072 17Z" /><path d="M19.0072 17C19.0072 18.1046 18.1118 19 17.0072 19C15.9026 19 15.0072 18.1046 15.0072 17C15.0072 15.8954 15.9026 15 17.0072 15C18.1118 15 19.0072 15.8954 19.0072 17Z" /><path d="M2.00722 10H18.0072M3.64197 5.42C3.16234 6.2 2.22306 8.26 2.00722 10C2.00722 10.78 1.98723 13.04 2.01122 15.26C2.04719 15.98 2.1671 16.58 5.00893 17M9.00722 10V5M14.9973 17H9.00189M2.02321 5H12.2394C12.2394 5 12.779 5 13.2586 5.048C14.158 5.132 14.9134 5.54 15.6688 6.56C16.4687 7.64 17.0837 9.008 17.8991 9.74C19.2541 10.9564 21.8321 10.58 21.976 13.16C22.012 14.48 22.012 15.92 21.952 16.16C21.8557 16.8667 21.3108 16.9821 20.633 17C20.0448 17.0156 19.3357 16.9721 18.9903 17" /></svg>),
    tag: "Vehicle",
    tagCls: "bg-indigo-50 text-indigo-700",
  },
} as const;

function Header({ kind, title, subtitle }: { kind: "passenger" | "vehicle"; title: string; subtitle: string }) {
  const th = KIND_THEME[kind];
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-6 pb-4 pt-5">
      <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ${th.accent}`}>{th.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
          <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ${th.tagCls}`}>{th.tag}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

// ─────────── PhotoField ───────────
// Local (no-backend) image field: pick a file, read it to a data URL for
// preview, and hand the URL up via onChange. Renders a thumbnail with Replace
// when a photo exists, or a dashed "Upload" drop-zone with a required marker
// when it's missing.
function PhotoField({ label, value, required, disabled, onChange }: {
  label: string; value?: string; required?: boolean; disabled?: boolean; onChange: (url: string) => void;
}) {
  const inputId = `photo-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") onChange(reader.result); };
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-picking the same file
  };
  const missing = !value;
  return (
    // Column stretches to the row's height and the upload area is pushed to
    // the bottom, so a label that wraps to two lines (e.g. "Certificate of
    // Registration (CR)") doesn't drop its box below the neighbouring one.
    <div className="flex h-full flex-col">
      <div className="mb-1 flex flex-1 items-start gap-1.5">
        <span className="text-[11.5px] font-semibold leading-snug text-slate-600">{label}</span>
        {required && missing && <span className="mt-px shrink-0 whitespace-nowrap rounded bg-rose-50 px-1 py-0.5 text-[9px] font-bold uppercase text-rose-500">Missing</span>}
      </div>
      <input id={inputId} type="file" accept="image/*" disabled={disabled} onChange={pick} className="hidden" />
      {value ? (
        <div className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-24 w-full object-cover" />
          {!disabled && (
            <label htmlFor={inputId} className="absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-900/0 text-[11px] font-semibold text-white opacity-0 transition-opacity hover:bg-slate-900/45 group-hover:opacity-100">
              Replace
            </label>
          )}
        </div>
      ) : (
        <label htmlFor={inputId} className={"flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-[11.5px] font-medium transition-colors " + (disabled ? "cursor-not-allowed border-slate-200 text-slate-300" : required ? "border-rose-200 text-rose-400 hover:bg-rose-50/40" : "border-slate-200 text-slate-400 hover:bg-slate-50")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 5v14M5 12h14" /></svg>
          Upload
        </label>
      )}
    </div>
  );
}

function LockedBanner({ reason }: { reason?: string }) {
  return (
    <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0">
        <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span>{reason ?? "This booking has settled and can no longer be edited."}</span>
    </div>
  );
}

function Footer({ dirty, valid, locked, onClose, onSave }: {
  dirty: boolean; valid: boolean; locked: boolean; onClose: () => void; onSave: () => void;
}) {
  const canSave = dirty && valid && !locked;
  return (
    <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={!canSave}
        onClick={onSave}
        className={
          "rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition-colors " +
          (canSave ? "bg-brand-500 hover:bg-brand-600" : "cursor-not-allowed bg-brand-300")
        }
      >
        Save changes
      </button>
    </div>
  );
}

// A labelled field wrapper with an optional error line.
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-[11px] font-medium text-rose-500">{error}</span>}
    </label>
  );
}

const inputCls = (bad?: boolean) =>
  "w-full rounded-lg border px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 " +
  (bad ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:border-brand-400 focus:ring-brand-200");

// Split a stored full name into first + last. The last whitespace-separated
// token is the surname; everything before it is the given name, so "Maria
// Clara Torres" round-trips as "Maria Clara" + "Torres". A single-word name
// becomes the first name with an empty surname.
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

// ─────────── Passenger form ───────────
function PassengerForm({ ticket, locked, lockedReason, onClose, onSave }: {
  ticket: Ticket; locked: boolean; lockedReason?: string; onClose: () => void; onSave: (p: PassengerPatch) => void;
}) {
  // The ticket stores a single `name`; the form edits it as first + last and
  // recombines on save, so the stored shape (and every consumer of it) is
  // unchanged. Everything before the last space is the first name, so multi-word
  // given names survive the round-trip.
  const [firstName, setFirstName] = useState(splitName(ticket.name).first);
  const [lastName, setLastName] = useState(splitName(ticket.name).last);
  // Birth date is edited directly; age is derived from it on save so the two
  // can't drift apart. <input type="date"> wants YYYY-MM-DD.
  const [birthDate, setBirthDate] = useState(toDateInput(ticket.birthDate));
  const [sex, setSex] = useState<PassengerSex>(ticket.sex);
  const [nationality, setNationality] = useState(ticket.nationality);
  const [documentType, setDocumentType] = useState(ticket.documentType);
  const [documentRef, setDocumentRef] = useState(ticket.documentRef);
  const [idFrontUrl, setIdFrontUrl] = useState(ticket.idFrontUrl);
  const [idBackUrl, setIdBackUrl] = useState(ticket.idBackUrl);
  const [touched, setTouched] = useState(false);

  const parsedBirth = birthDate ? new Date(`${birthDate}T00:00:00`) : null;
  const age = parsedBirth ? ageFromBirthDate(parsedBirth) : ticket.age;
  const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  const errs = {
    firstName: firstName.trim() ? "" : "First name is required.",
    lastName: lastName.trim() ? "" : "Last name is required.",
    birthDate:
      !parsedBirth || Number.isNaN(parsedBirth.getTime()) ? "Birth date is required."
        : parsedBirth > new Date() ? "Birth date can't be in the future."
        : age > 120 ? "Check the birth date — that's over 120 years."
        : "",
    documentType: documentType.trim() ? "" : "ID type is required.",
    documentRef: documentRef.trim() ? "" : "ID number is required.",
  };
  const valid = Object.values(errs).every((e) => !e);

  const dirty =
    name !== ticket.name || birthDate !== toDateInput(ticket.birthDate) || sex !== ticket.sex ||
    nationality !== ticket.nationality ||
    documentType !== ticket.documentType || documentRef !== ticket.documentRef ||
    idFrontUrl !== ticket.idFrontUrl || idBackUrl !== ticket.idBackUrl;

  const show = (k: keyof typeof errs) => (touched ? errs[k] : "");

  const submit = () => {
    setTouched(true);
    if (!valid || !dirty || locked) return;
    onSave({
      name,
      age,
      birthDate: parsedBirth ?? undefined,
      sex,
      nationality: nationality.trim(),
      // Not editable here — fare category and class are set at booking time and
      // carried through untouched so the patch doesn't clear them.
      paxType: ticket.paxType,
      fareClass: ticket.fareClass,
      documentType: documentType.trim(),
      documentRef: documentRef.trim(),
      idFrontUrl,
      idBackUrl,
    });
  };

  return (
    <div className="flex max-h-[90vh] flex-col">
      <Header kind="passenger" title="Edit passenger" subtitle={`Ticket ${ticket.ticketNumber ?? ticket.id}`} />
      {locked && <LockedBanner reason={lockedReason} />}
      <div className="grid grid-cols-1 gap-3.5 overflow-y-auto px-6 py-4 sm:grid-cols-2">
        <Field label="First name" error={show("firstName")}>
          <input disabled={locked} value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls(!!show("firstName"))} placeholder="e.g. Ana" />
        </Field>
        <Field label="Last name" error={show("lastName")}>
          <input disabled={locked} value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls(!!show("lastName"))} placeholder="e.g. Torres" />
        </Field>
        <Field label="Birth date" error={show("birthDate")}>
          <DatePicker
            disabled={locked}
            value={birthDate}
            onChange={setBirthDate}
            max={toDateInput(new Date())}
            placeholder="Select birth date"
            ariaLabel="Birth date"
            className="w-full"
          />
        </Field>
        <Field label="Gender">
          <Select<PassengerSex> disabled={locked} value={sex} onChange={setSex} className="w-full" options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
        </Field>
        <Field label="Nationality">
          <input disabled={locked} value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls()} placeholder="e.g. Filipino" />
        </Field>
        <div className="sm:col-span-2 mt-1 border-t border-dashed border-slate-200 pt-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Valid ID</span>
        </div>
        <Field label="ID type" error={show("documentType")}>
          <Select
            disabled={locked}
            value={documentType}
            onChange={setDocumentType}
            options={ID_TYPE_LABELS.map((l) => ({ value: l, label: l }))}
            placeholder="No ID type"
            ariaLabel="ID type"
            className="w-full"
          />
        </Field>
        <Field label="ID number" error={show("documentRef")}>
          <input disabled={locked} value={documentRef} onChange={(e) => setDocumentRef(e.target.value)} className={inputCls(!!show("documentRef"))} />
        </Field>
        <PhotoField label="ID photo — front" value={idFrontUrl} required disabled={locked} onChange={setIdFrontUrl} />
        <PhotoField label="ID photo — back" value={idBackUrl} required disabled={locked} onChange={setIdBackUrl} />
      </div>
      <Footer dirty={dirty} valid={valid} locked={locked} onClose={onClose} onSave={submit} />
    </div>
  );
}

// <input type="date"> speaks YYYY-MM-DD in local time; toISOString() would
// shift the day across timezones, so build the string from local parts.
function toDateInput(d?: Date): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Completed years since the birth date — age only ticks over once the
// birthday has passed this year.
function ageFromBirthDate(b: Date): number {
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// ─────────── Vehicle form ───────────
function VehicleForm({ vehicle, locked, lockedReason, onClose, onSave }: {
  vehicle: Vehicle; locked: boolean; lockedReason?: string; onClose: () => void; onSave: (p: VehiclePatch) => void;
}) {
  const [vClass, setVClass] = useState(vehicle.class);
  const [plate, setPlate] = useState(vehicle.plateNumber);
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [yearStr, setYearStr] = useState(String(vehicle.year));
  const [orUrl, setOrUrl] = useState(vehicle.orUrl);
  const [crUrl, setCrUrl] = useState(vehicle.crUrl);
  const [photoUrl, setPhotoUrl] = useState(vehicle.photoUrl ?? "");
  const [touched, setTouched] = useState(false);

  const year = Number(yearStr);
  const nowYear = new Date().getFullYear();
  const errs = {
    plate: plate.trim() ? "" : "Plate number is required.",
    make: make.trim() ? "" : "Make is required.",
    year: /^\d{4}$/.test(yearStr) && year >= 1950 && year <= nowYear + 1 ? "" : `Enter a year 1950–${nowYear + 1}.`,
  };
  const valid = Object.values(errs).every((e) => !e);

  const dirty =
    vClass !== vehicle.class || plate !== vehicle.plateNumber || make !== vehicle.make ||
    model !== vehicle.model || year !== vehicle.year ||
    orUrl !== vehicle.orUrl || crUrl !== vehicle.crUrl || photoUrl !== (vehicle.photoUrl ?? "");

  const show = (k: keyof typeof errs) => (touched ? errs[k] : "");

  const submit = () => {
    setTouched(true);
    if (!valid || !dirty || locked) return;
    onSave({
      class: vClass.trim(),
      plateNumber: plate.trim().toUpperCase(),
      make: make.trim(),
      model: model.trim(),
      year,
      // Not editable here — carried through untouched so the patch doesn't
      // clear them.
      label: vehicle.label,
      includedSeats: vehicle.includedSeats,
      orUrl,
      crUrl,
      photoUrl: photoUrl || undefined,
    });
  };

  return (
    <div className="flex max-h-[90vh] flex-col">
      <Header kind="vehicle" title="Edit vehicle" subtitle={vehicle.ticketNumber ? `Vehicle ${vehicle.ticketNumber}` : "Vehicle details"} />
      {locked && <LockedBanner reason={lockedReason} />}
      <div className="grid grid-cols-1 gap-3.5 overflow-y-auto px-6 py-4 sm:grid-cols-2">
        <Field label="Plate conduction" error={show("plate")}>
          <input disabled={locked} value={plate} onChange={(e) => setPlate(e.target.value)} className={inputCls(!!show("plate"))} placeholder="e.g. ABC-1234" />
        </Field>
        <Field label="Vehicle class">
          <Select
            disabled={locked}
            value={vClass}
            onChange={setVClass}
            options={defaultVehicleClasses.map((c) => ({ value: c.label, label: c.label }))}
            placeholder="Select a class"
            ariaLabel="Vehicle class"
            className="w-full"
          />
        </Field>
        <Field label="Make" error={show("make")}>
          <input disabled={locked} value={make} onChange={(e) => setMake(e.target.value)} className={inputCls(!!show("make"))} placeholder="e.g. Toyota" />
        </Field>
        <Field label="Model">
          <input disabled={locked} value={model} onChange={(e) => setModel(e.target.value)} className={inputCls()} placeholder="e.g. Vios" />
        </Field>
        <Field label="Year" error={show("year")}>
          <input disabled={locked} inputMode="numeric" value={yearStr} onChange={(e) => setYearStr(e.target.value.replace(/\D/g, "").slice(0, 4))} className={inputCls(!!show("year"))} />
        </Field>
        <div className="sm:col-span-2 mt-1 border-t border-dashed border-slate-200 pt-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Documents &amp; photo</span>
        </div>
        <PhotoField label="Official Receipt (OR)" value={orUrl} required disabled={locked} onChange={setOrUrl} />
        <PhotoField label="Certificate of Registration (CR)" value={crUrl} required disabled={locked} onChange={setCrUrl} />
        <div className="sm:col-span-2">
          <PhotoField label="Vehicle photo" value={photoUrl || undefined} disabled={locked} onChange={setPhotoUrl} />
        </div>
      </div>
      <Footer dirty={dirty} valid={valid} locked={locked} onClose={onClose} onSave={submit} />
    </div>
  );
}
