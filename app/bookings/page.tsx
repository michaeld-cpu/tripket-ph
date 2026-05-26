"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { useShippingLine } from "@/components/ShippingLineContext";
import { TableSkeleton } from "@/components/Skeleton";
import Select from "@/components/Select";
import RowMenu from "@/components/RowMenu";
import Pagination from "@/components/Pagination";
import DateRangePicker, { type DateRange } from "@/components/DateRangePicker";
import { useToast } from "@/components/ToastContext";
import { LogoTile } from "@/components/ShippingLineSwitcher";
import type { Line } from "@/lib/shipping-lines";

// ─────────── Booking shape ───────────
// Bookings are derived synthetically from the voyages an operator has created
// (stored in `tripket.voyages` localStorage). Each voyage seeds 1-3 mock
// bookings so the table has something to render before a real booking system
// is wired up.
type BookingStatus = "Confirmed" | "Pending" | "Cancelled" | "Refunded";

type FareClass = "Economy" | "Tourist" | "Business";
type PassengerSex = "Male" | "Female";
// Per-ticket lifecycle. Paid is the default once payment clears; tickets
// can be Voided (issued in error, no refund), Cancelled (refund pending),
// or Refunded (money returned).
type TicketStatus = "Paid" | "Void" | "Cancelled" | "Refunded";

// Per-pax ticket carried under one booking. Each ticket has its own ID
// suffixed off the booking ref (TKT-0001-A, TKT-0001-B, …) so passengers can
// be checked in individually while staying grouped under the booking.
type Ticket = {
  id: string;
  name: string;
  fareClass: FareClass;
  age: number;
  sex: PassengerSex;
  nationality: string;
  /** Type of valid ID presented at check-in (e.g. "PhilSys ID", "Driver's License"). */
  documentType: string;
  /** Document number — formatted to match Philippine ID conventions. */
  documentRef: string;
  /** Fare paid for this ticket — fareClass-multiplied off the voyage's base fare. */
  fare: number;
  /** Per-ticket gate status, distinct from the booking-level status. */
  status: TicketStatus;
  /** Optional per-pax contact. Lead pax usually inherits the booking's
      contact details; companions may or may not have their own captured. */
  phone?: string;
  email?: string;
  /** Required photo of the valid ID, front side. */
  idFrontUrl: string;
  /** Required photo of the valid ID, back side. */
  idBackUrl: string;
  /** Whether this ticket is bundled with a vehicle booking and what role it
      plays. Driver/Companion seats ride with the vehicle and may be comped
      depending on the shipping line's policy. */
  vehicleRole?: "Driver" | "Companion";
  /** True when the ticket was bundled free under the vehicle fee. Surfaces
      in the payment breakdown as "Comped (vehicle)". */
  comped?: boolean;
};

// Per-booking vehicle details. Present only when the booking includes a
// vehicle slot. Plate + driver name are captured at checkout so the gate
// crew can match the vehicle and its driver against the manifest.
type Vehicle = {
  class: string;
  plateNumber: string;
  driverName: string;
  /** Vehicle registration year. */
  year: number;
  /** Manufacturer / brand (Toyota, Honda, Mitsubishi…). */
  make: string;
  /** Model name (Vios, Civic, L300…). */
  model: string;
  /** Operator-chosen short label (e.g. "Family SUV", "Tito's truck"). */
  label: string;
  /** Optional vehicle photo URL uploaded by the user. */
  photoUrl?: string;
  /** Required Official Receipt photo. Captured at booking — together with
      the CR it forms the legal proof of registration the gate crew checks. */
  orUrl: string;
  /** Required Certificate of Registration photo. */
  crUrl: string;
};

const VEHICLE_MAKES = ["Toyota", "Honda", "Mitsubishi", "Hyundai", "Isuzu", "Nissan", "Suzuki", "Ford", "Yamaha", "Kawasaki"];
const VEHICLE_MODELS_BY_MAKE: Record<string, string[]> = {
  Toyota: ["Vios", "Innova", "Hilux", "Fortuner"],
  Honda: ["Civic", "City", "BR-V", "Click 125i"],
  Mitsubishi: ["L300", "Mirage", "Xpander", "Strada"],
  Hyundai: ["Accent", "Tucson", "H-100"],
  Isuzu: ["Crosswind", "D-Max", "Elf"],
  Nissan: ["Almera", "Navara", "Urvan"],
  Suzuki: ["Ertiga", "APV", "Carry"],
  Ford: ["Ranger", "Everest", "Territory"],
  Yamaha: ["Mio i 125", "NMAX", "Sniper 150"],
  Kawasaki: ["Barako II", "CT125", "Rouser NS160"],
};
const VEHICLE_LABEL_PREFIXES = ["Family", "Backup", "Daily", "Cargo", "Tito's", "Lola's", "Beach"];

// Fare-class multipliers applied to the voyage's cheapestFare to derive a
// per-ticket rate. Keeps the per-pax table honest with the booking total.
const FARE_CLASS_MULTIPLIER: Record<FareClass, number> = {
  Economy: 1,
  Tourist: 1.5,
  Business: 2.4,
};

// Philippine valid-ID catalogue. Each entry knows how to mint a realistic-
// looking number so the mock data reads like a real check-in roster rather
// than a placeholder sequence.
const ID_TYPES: { label: string; format: (rand: () => number) => string }[] = [
  // PhilSys (national ID) — 16-digit PCN, displayed in 4-4-4-4 blocks.
  { label: "PhilSys ID", format: (r) => {
    const block = () => String(1000 + Math.floor(r() * 8999));
    return `${block()}-${block()}-${block()}-${block()}`;
  }},
  // LTO driver's license — letter + 2 digits + 6 digits.
  { label: "Professional Driver's License", format: (r) => {
    const L = String.fromCharCode(65 + Math.floor(r() * 26));
    return `${L}${String(10 + Math.floor(r() * 89))}-${String(100000 + Math.floor(r() * 899999))}`;
  }},
  // UMID / SSS card.
  { label: "UMID", format: (r) => `CRN-${String(1000 + Math.floor(r() * 8999))}-${String(1000000 + Math.floor(r() * 8999999))}-${Math.floor(r() * 10)}` },
  // Passport — 1 letter + 7 digits + 1 letter.
  { label: "Passport", format: (r) => {
    const L = () => String.fromCharCode(65 + Math.floor(r() * 26));
    return `${L()}${String(1000000 + Math.floor(r() * 8999999))}${L()}`;
  }},
  // PRC professional license — 7 digits.
  { label: "PRC ID", format: (r) => String(1000000 + Math.floor(r() * 8999999)) },
  // Voter's ID — VIN style.
  { label: "Voter's ID", format: (r) => `${String(1000 + Math.floor(r() * 8999))}-${String(1000 + Math.floor(r() * 8999))}A-${String(1000 + Math.floor(r() * 8999))}` },
];

type Booking = {
  ref: string;
  ticketholder: string;
  pax: number;
  vehicleClass?: string;
  /** Full vehicle record when the booking includes a vehicle slot. */
  vehicle?: Vehicle;
  routeOriginCode: string;
  routeDestinationCode: string;
  routeOriginCity: string;
  routeDestinationCity: string;
  vesselName: string;
  /** Departure timestamp. */
  departureDate: Date;
  amount: number;
  status: BookingStatus;
  bookingDate: Date;
  /** Contact details captured at booking. */
  contactMobile: string;
  contactEmail: string;
  /** Payment metadata. */
  paymentMethod: "Tripket Wallet";
  paymentStatus: "Paid" | "Pending" | "Refunded";
  /** Per-pax tickets. tickets.length === pax. */
  tickets: Ticket[];
};

// ─────────── Voyage shape (slice of what we need from localStorage) ───────────
// Mirrors the fields VoyagesPage writes. Defensive — fields may be missing on
// older payloads, so we tolerate optionals everywhere.
type StoredVoyage = {
  id: string;
  date: string;
  hour: number;
  minute: number;
  vesselName?: string;
  originCode?: string;
  destinationCode?: string;
  originCity?: string;
  destinationCity?: string;
  paxCapacity?: number;
  cheapestFare?: number;
  priciestFare?: number;
};

// Single placeholder image used across every uploaded-document slot while
// real upload pipelines are being wired up. One Unsplash cat for now.
// Gray tabby kitten leaning on white wall — Unsplash photo VwqecUsYKvs.
const PLACEHOLDER_CAT = "https://images.unsplash.com/photo-1506755855567-92ff770e8d00?w=900&q=80";

// Signature kept for API stability with the call sites — every bucket now
// returns the same image. Swap PLACEHOLDER_CAT for real upload URLs later.
function pickMockImage(_bucket: "idFront" | "idBack" | "vehiclePhoto" | "or" | "cr", _rand: () => number): string {
  return PLACEHOLDER_CAT;
}

// ─────────── Deterministic pseudo-random helpers ───────────
// We want each voyage's bookings to look randomly-distributed but stay stable
// across re-renders so users don't see rows shuffle when filters change.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ["Maria", "Juan", "Ana", "Carlos", "Lorna", "Roberto", "Elena", "Mark", "Gloria", "Dennis", "Patricia", "Jose", "Andrea", "Rafael", "Camille", "Miguel", "Sofia", "Diego", "Bianca", "Noel"];
const LAST_NAMES = ["Santos", "dela Cruz", "Reyes", "Mendoza", "Garcia", "Flores", "Cruz", "Villanueva", "Tan", "Aquino", "Lim", "Bautista", "Castro", "Ramos", "Torres", "Diaz", "Navarro", "Pascual"];
const VEHICLE_LABELS = ["Motorcycle", "Car / SUV", "Pickup / AUV", "Light Truck"];

function deriveBookings(voyages: StoredVoyage[]): Booking[] {
  const bookings: Booking[] = [];
  let counter = 1;
  voyages.forEach((v) => {
    const seed = hashStr(v.id);
    const rand = rng(seed);
    // Skip voyages with missing core fields rather than emit garbage rows.
    if (!v.originCode || !v.destinationCode) return;
    const dep = new Date(v.date);
    if (isNaN(dep.getTime())) return;
    dep.setHours(v.hour, v.minute, 0, 0);
    const baseFare = v.cheapestFare || 1200;

    // 1-3 bookings per voyage.
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      // Force every booking to carry a vehicle so the Vehicle Information
      // section is always visible during dialog development. Flip back to
      // `rand() < 0.35` once real bookings flow in.
      const hasVehicle = true;
      // Vehicle bookings always include a driver + 1 companion (both comped
      // under the vehicle fee), so we floor pax at 2 in that case.
      const pax = hasVehicle
        ? 2 + Math.floor(rand() * 3) // 2-4 pax when a vehicle is involved
        : 1 + Math.floor(rand() * 4);
      const vehicleClass = hasVehicle ? VEHICLE_LABELS[Math.floor(rand() * VEHICLE_LABELS.length)] : undefined;
      // Realistic PH plate format: 3 letters + space + 4 digits (e.g. ABC 1234).
      let vehicle: Vehicle | undefined;
      if (hasVehicle) {
        const make = VEHICLE_MAKES[Math.floor(rand() * VEHICLE_MAKES.length)];
        const models = VEHICLE_MODELS_BY_MAKE[make] ?? ["Standard"];
        const model = models[Math.floor(rand() * models.length)];
        const labelPrefix = VEHICLE_LABEL_PREFIXES[Math.floor(rand() * VEHICLE_LABEL_PREFIXES.length)];
        vehicle = {
          class: vehicleClass!,
          plateNumber: `${String.fromCharCode(65 + Math.floor(rand() * 26))}${String.fromCharCode(65 + Math.floor(rand() * 26))}${String.fromCharCode(65 + Math.floor(rand() * 26))} ${String(1000 + Math.floor(rand() * 8999))}`,
          driverName: "", // finalized after the tickets loop
          year: 2015 + Math.floor(rand() * 11), // 2015 – 2025
          make,
          model,
          label: `${labelPrefix} ${model}`,
          // 60% of bookings include an optional vehicle photo.
          // Optional vehicle photo — every booking gets one so the dialog
          // always has something to preview.
          photoUrl: pickMockImage("vehiclePhoto", rand),
          // OR + CR are both required at checkout — always present in mock data.
          orUrl: pickMockImage("or", rand),
          crUrl: pickMockImage("cr", rand),
        };
      }
      const statusRoll = rand();
      // First booking minted is forced to "Refunded" so the table has one
      // representative entry for that status without disturbing the
      // distribution of the rest.
      // Forced samples so every status has a deterministic representative in
      // the table:
      //   counter === 1  → Refunded
      //   counter === 17 → Cancelled
      //   counter === 18 → Confirmed booking with all tickets voided (sample)
      const status: BookingStatus = counter === 1
        ? "Refunded"
        : counter === 17
          ? "Cancelled"
          : counter === 18
            ? "Confirmed"
            : statusRoll < 0.65 ? "Confirmed" : statusRoll < 0.9 ? "Pending" : "Cancelled";
      const forceTicketsVoid = counter === 18;
      const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      // Booking date sits 1-14 days before departure.
      const bookedDaysBefore = 1 + Math.floor(rand() * 14);
      const bookingDate = new Date(dep);
      bookingDate.setDate(bookingDate.getDate() - bookedDaysBefore);
      bookingDate.setHours(0, 0, 0, 0);

      const ref = `TKT-${String(counter).padStart(4, "0")}`;

      // Booking-level contact — captured once at checkout and inherited by
      // the lead passenger. Companions may or may not have their own contact
      // on file, so we roll independently below.
      const contactMobile = `+63 ${900 + Math.floor(rand() * 99)}${String(1000000 + Math.floor(rand() * 8999999))}`.slice(0, 14);
      const contactEmail = `${first}.${last.replace(/\s+/g, "").toLowerCase()}@example.com`;

      // Per-pax tickets. Each gets a letter suffix off the booking ref. The
      // first ticket carries the ticketholder's name; subsequent tickets get
      // randomized companions with the same surname (kept as a deterministic
      // family-feel without overcommitting to a real-relations model).
      const fareClasses: FareClass[] = ["Economy", "Tourist", "Business"];
      const tickets: Ticket[] = [];
      for (let p = 0; p < pax; p++) {
        const isLead = p === 0;
        const tFirst = isLead ? first : FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
        // Vehicle role: first ticket is the Driver, second is the
        // Companion. Both are comped (fare = 0) under the vehicle fee.
        const vehicleRole: Ticket["vehicleRole"] | undefined = hasVehicle
          ? p === 0 ? "Driver" : p === 1 ? "Companion" : undefined
          : undefined;
        const comped = !!vehicleRole;
        const fareClass: FareClass = rand() < 0.55 ? "Economy" : rand() < 0.85 ? "Tourist" : "Business";
        const sex: PassengerSex = rand() < 0.5 ? "Female" : "Male";
        // Driver must be of driving age — bump if the roll came in low.
        let age = 3 + Math.floor(rand() * 70);
        if (vehicleRole === "Driver" && age < 21) age = 21 + Math.floor(rand() * 30);
        // Driver's valid ID is forced to Professional Driver's License so
        // the document type aligns with the role.
        const idType = vehicleRole === "Driver"
          ? ID_TYPES.find((t) => t.label === "Professional Driver's License")!
          : ID_TYPES[Math.floor(rand() * ID_TYPES.length)];
        // Lead pax inherits the booking contact; companions get their own
        // ~45% of the time so the dialog has a believable mix of filled and
        // blank cells.
        // Every passenger gets phone + email captured so the dialog always
        // has channels to surface. Lead pax inherits the booking contact;
        // companions get their own minted off their name.
        const paxPhone = isLead
          ? contactMobile
          : `+63 ${900 + Math.floor(rand() * 99)}${String(1000000 + Math.floor(rand() * 8999999))}`.slice(0, 14);
        const paxEmail = isLead
          ? contactEmail
          : `${tFirst.toLowerCase()}.${last.replace(/\s+/g, "").toLowerCase()}@example.com`;
        tickets.push({
          id: `${ref}-${String.fromCharCode(65 + p)}`, // A, B, C, …
          name: `${tFirst} ${last}`,
          fareClass,
          age,
          sex,
          nationality: "Filipino",
          documentType: idType.label,
          documentRef: idType.format(rand),
          idFrontUrl: pickMockImage("idFront", rand),
          idBackUrl: pickMockImage("idBack", rand),
          fare: comped ? 0 : Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          phone: paxPhone,
          email: paxEmail,
          vehicleRole,
          comped: comped || undefined,
          // Per-ticket lifecycle. Cancelled/Refunded bookings push every
          // ticket into the matching terminal state. Otherwise tickets are
          // Paid by default with a small chance of being Voided.
          status: (() => {
            if (status === "Cancelled") return "Cancelled" as TicketStatus;
            if (status === "Refunded")  return "Refunded"  as TicketStatus;
            if (forceTicketsVoid)       return "Void"      as TicketStatus;
            // Tiny chance of Void to give the table some realistic variance.
            if (rand() < 0.05) return "Void" as TicketStatus;
            return "Paid" as TicketStatus;
          })(),
        });
        void fareClasses; // silence lint
      }

      // Finalize the driver name on the vehicle record now that we know who
      // got assigned the Driver role.
      if (vehicle) {
        const driverTicket = tickets.find((t) => t.vehicleRole === "Driver");
        if (driverTicket) vehicle.driverName = driverTicket.name;
      }

      // Payment metadata — deterministic per booking via the same rng.
      // Single source of payment for the platform — Tripket Wallet routes
      // both customer top-ups and operator settlements through the same
      // ledger, so every booking lands here.
      const paymentMethod: Booking["paymentMethod"] = "Tripket Wallet";
      const paymentStatus: Booking["paymentStatus"] =
        status === "Cancelled" || status === "Refunded"
          ? "Refunded"
          : status === "Pending" ? "Pending" : "Paid";

      bookings.push({
        ref,
        ticketholder: `${first} ${last}`,
        pax,
        vehicleClass,
        vehicle,
        routeOriginCode: v.originCode,
        routeDestinationCode: v.destinationCode,
        routeOriginCity: v.originCity ?? v.originCode,
        routeDestinationCity: v.destinationCity ?? v.destinationCode,
        vesselName: v.vesselName ?? "Unknown vessel",
        departureDate: dep,
        amount: pax * baseFare + (hasVehicle ? 500 + Math.floor(rand() * 2000) : 0),
        status,
        bookingDate,
        contactMobile,
        contactEmail,
        paymentMethod,
        paymentStatus,
        tickets,
      });
      counter++;
    }
  });
  // Newest bookings first.
  return bookings.sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());
}

const PAGE_SIZE = 10;

function fmtDepartureDate(d: Date): string {
  // "May 18, 2026" — single-row pairing with the time inline.
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDepartureTime(d: Date): string {
  // "01:00 PM" — zero-padded 12-hour clock so widths stay consistent.
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
// "ETD 45 minutes" / "ETD 3h 20m" / "Departed 12m ago" — humanizes the gap
// between now and the voyage's departure. Past-tense flips wording so the
// caption still reads cleanly after the boat has left.
function fmtEtd(d: Date): string {
  const diffMin = Math.round((d.getTime() - Date.now()) / 60_000);
  const past = diffMin < 0;
  const mins = Math.abs(diffMin);
  let body: string;
  if (mins < 60) body = `${mins} minute${mins === 1 ? "" : "s"}`;
  else if (mins < 60 * 24) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    body = m === 0 ? `${h}h` : `${h}h ${m}m`;
  } else {
    const days = Math.floor(mins / (60 * 24));
    body = `${days} day${days === 1 ? "" : "s"}`;
  }
  return past ? `Departed ${body} ago` : `ETD ${body}`;
}

function fmtDate(d: Date): string {
  // "May 7, 2026" — matches the natural-language style of the departure cell.
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Unified status palette — uppercase labels, no dots, restrained tones.
// Confirmed = opaque emerald (settled / good); Pending = brand-orange
// (needs attention); Cancelled = struck slate.
const statusTone: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800",
  Pending:   "bg-brand-50 text-brand-700",
  Cancelled: "bg-slate-50 text-slate-400 line-through decoration-slate-300",
  Refunded:  "bg-sky-50 text-sky-700",
};

// Per-ticket palette — Paid is the healthy default (emerald), Void reads
// as quietly invalidated (slate), Cancelled is struck-through, Refunded
// matches the booking-level refund tone.
const ticketStatusTone: Record<TicketStatus, string> = {
  Paid:      "bg-emerald-100 text-emerald-800",
  Void:      "bg-slate-100 text-slate-500",
  Cancelled: "bg-slate-50 text-slate-400 line-through decoration-slate-300",
  Refunded:  "bg-sky-50 text-sky-700",
};

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300">
      <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BookingsPage() {
  const { active } = useShippingLine();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [vesselFilter, setVesselFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [page, setPage] = useState(1);

  // ── Ref copy state (matches PendingAgingList on the dashboard) ──
  // Tracks the most-recently-copied ref so the button can flash a check mark
  // for 1.5s before reverting to the copy icon. Toast confirms the action.
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null);
  const { showToast } = useToast();
  const handleCopyRef = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedRef(ref);
      showToast(`Booking ref ${ref} copied`);
      setTimeout(() => setCopiedRef((prev) => (prev === ref ? null : prev)), 1500);
    } catch {
      showToast("Failed to copy", "error");
    }
  };
  const handleCopyTicket = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedTicket(id);
      showToast(`Ticket ${id} copied`);
      setTimeout(() => setCopiedTicket((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  const openBooking = useMemo(
    () => (bookings ?? []).find((b) => b.ref === openRef) ?? null,
    [bookings, openRef]
  );

  // Esc to close dialog.
  useEffect(() => {
    if (!openRef) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpenRef(null); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openRef]);

  const handleCancel = (ref: string) => {
    setBookings((prev) => prev ? prev.map((x) => x.ref === ref ? { ...x, status: "Cancelled", paymentStatus: "Refunded" } : x) : prev);
    showToast(`Booking ${ref} cancelled`);
  };
  const handleApprove = (ref: string) => {
    setBookings((prev) => prev ? prev.map((x) => x.ref === ref ? { ...x, status: "Confirmed", paymentStatus: "Paid" } : x) : prev);
    showToast(`Booking ${ref} approved`);
  };
  const handleRefund = (ref: string) => {
    setBookings((prev) => prev ? prev.map((x) => x.ref === ref ? { ...x, paymentStatus: "Refunded" } : x) : prev);
    showToast(`Booking ${ref} refunded`);
  };
  // Edit booking — the editable field set isn't finalized yet, so for now
  // the action surfaces a toast acknowledging the intent and stays clickable
  // across statuses. Wire up the editor form once requirements are nailed.
  const handleEdit = (ref: string) => {
    showToast(`Edit booking ${ref} — coming soon`);
  };

  // Booking-date range filter — drives the dashboard-style picker.
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  }));

  // Hydrate bookings from localStorage voyages on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("tripket.voyages");
      const voyages: StoredVoyage[] = raw ? JSON.parse(raw) : [];
      // Fake the loading shimmer briefly so the page matches the routes/vessels feel.
      const t = setTimeout(() => setBookings(deriveBookings(voyages)), 180);
      return () => clearTimeout(t);
    } catch {
      setBookings([]);
    }
  }, [active.id]);

  useEffect(() => { setPage(1); }, [query, routeFilter, vesselFilter, statusFilter, dateRange]);

  // Filter dropdown options derived from the data.
  const routeOptions = useMemo(() => {
    const seen = new Set<string>();
    (bookings ?? []).forEach((b) => seen.add(`${b.routeOriginCode}→${b.routeDestinationCode}`));
    return [{ value: "all", label: "All routes" }, ...Array.from(seen).sort().map((r) => ({ value: r, label: r.replace("→", " → ") }))];
  }, [bookings]);
  const vesselOptions = useMemo(() => {
    const seen = new Set<string>();
    (bookings ?? []).forEach((b) => seen.add(b.vesselName));
    return [{ value: "all", label: "All vessels" }, ...Array.from(seen).sort().map((v) => ({ value: v, label: v }))];
  }, [bookings]);

  const filtered = useMemo(() => {
    if (!bookings) return [];
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (routeFilter !== "all" && `${b.routeOriginCode}→${b.routeDestinationCode}` !== routeFilter) return false;
      if (vesselFilter !== "all" && b.vesselName !== vesselFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (b.bookingDate < dateRange.start || b.bookingDate > dateRange.end) return false;
      if (q) {
        const hay = `${b.ref} ${b.ticketholder} ${b.routeOriginCode} ${b.routeDestinationCode} ${b.vesselName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, query, routeFilter, vesselFilter, statusFilter, dateRange]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isEmpty = bookings !== null && bookings.length === 0;

  return (
    <div>
      <PageHeader title="Bookings" subtitle={active.name} showDateFilter={false} />

      {!bookings ? (
        <TableSkeleton rows={8} />
      ) : isEmpty ? (
        <section className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-white px-8 py-16 ring-1 ring-slate-200/70">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-slate-400">
            <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
            <path d="M10 6v12" strokeDasharray="2 2" />
          </svg>
          <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-slate-900">No bookings yet</h2>
          <p className="mt-1.5 max-w-sm text-center text-[12.5px] leading-relaxed text-slate-500">
            Bookings appear here once passengers reserve seats on your scheduled voyages. Create a voyage from the Voyages page to seed mock bookings.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl bg-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Recent bookings</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span> of {bookings.length} bookings
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-brand-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or ref…"
                  className="w-52 bg-transparent placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <Select
                size="sm"
                value={routeFilter}
                onChange={setRouteFilter}
                ariaLabel="Filter by route"
                className="w-40"
                options={routeOptions}
              />
              <Select
                size="sm"
                value={vesselFilter}
                onChange={setVesselFilter}
                ariaLabel="Filter by vessel"
                className="w-40"
                options={vesselOptions}
              />
              <Select
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Filter by status"
                className="w-32"
                options={[
                  { value: "all", label: "All status" },
                  { value: "Confirmed", label: "Confirmed" },
                  { value: "Pending", label: "Pending" },
                  { value: "Cancelled", label: "Cancelled" },
                  { value: "Refunded", label: "Refunded" },
                ]}
              />

              {/* Booking-date range — pinned to the end of the toolbar. */}
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>

          {/* Table — horizontally scrollable so columns can breathe past the
              viewport. `min-w-[1280px]` forces real spacing per column, no
              cramming. `scrollbar-gutter: stable` reserves the gutter so the
              table doesn't reflow when the bar appears/disappears. */}
          <div className="overflow-x-auto" style={{ scrollbarGutter: "stable" }}>
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="whitespace-nowrap px-6 py-3 text-center font-medium">#</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Ref</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Status</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Ticketholder <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Route</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Vessel</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Pax <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">Vehicle</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Departure <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Amount <SortIcon /></button>
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    <button className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.08em] transition-colors hover:text-slate-900">Booking date <SortIcon /></button>
                  </th>
                  <th className="sticky right-0 z-10 w-10 bg-slate-50 px-6 py-3 font-medium shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-sm text-slate-400">
                      No bookings match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((b, i) => {
                  const rowNo = (page - 1) * PAGE_SIZE + i + 1;
                  return (
                  <motion.tr
                    key={b.ref}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.02, ease: "easeOut" }}
                    onClick={() => setOpenRef(b.ref)}
                    className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50/60"
                  >
                    <td className="relative whitespace-nowrap px-6 py-4 align-middle text-center font-mono text-[12px] tabular-nums text-slate-400">
                      <span className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-y-100" />
                      {rowNo}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{b.ref}</span>
                        {copiedRef === b.ref ? (
                          <span aria-label="Copied" className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                              <path d="M5 12l5 5 9-11" />
                            </svg>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleCopyRef(b.ref); }}
                            aria-label={`Copy ${b.ref}`}
                            className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                              <rect x="9" y="9" width="11" height="11" rx="2" />
                              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[b.status]}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="text-[13.5px] font-semibold tracking-tight text-slate-900">{b.ticketholder}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <div className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-[13px] font-medium tracking-tight text-slate-900">
                        <span>{b.routeOriginCity}</span>
                        <span className="font-mono text-[10.5px] tabular-nums text-slate-400">({b.routeOriginCode})</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-slate-300">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                        <span>{b.routeDestinationCity}</span>
                        <span className="font-mono text-[10.5px] tabular-nums text-slate-400">({b.routeDestinationCode})</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className="truncate text-[13px] font-medium tracking-tight text-slate-900">{b.vesselName}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">{b.pax}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      {b.vehicleClass ? (
                        <span className="text-[12.5px] font-medium tracking-tight text-slate-700">{b.vehicleClass}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle whitespace-nowrap text-[13px] font-semibold tracking-tight text-slate-900">
                      {fmtDepartureDate(b.departureDate)}
                      <span className="ml-1.5 font-mono font-medium tabular-nums text-slate-600">{fmtDepartureTime(b.departureDate)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle">
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">₱{b.amount.toLocaleString()}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 align-middle text-[12.5px] font-medium tracking-tight text-slate-700">{fmtDate(b.bookingDate)}</td>
                    <td
                      // `:has([role=menu])` lifts the cell above its siblings
                      // while the kebab popover is open, so the floating menu
                      // is never clipped by later sticky cells in the table.
                      className="sticky right-0 z-10 whitespace-nowrap bg-white px-6 py-4 align-middle shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.08)] transition-colors duration-150 group-hover:bg-slate-50 has-[[role=menu]]:z-30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenu
                        ariaLabel={`Actions for ${b.ref}`}
                        items={[
                          // View — always available; pure read action.
                          {
                            label: "View booking",
                            onClick: () => setOpenRef(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            ),
                          },
                          // Approve — only meaningful on Pending bookings.
                          {
                            label: "Approve",
                            disabled: b.status !== "Pending",
                            onClick: () => handleApprove(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M5 12l5 5 9-11" />
                              </svg>
                            ),
                          },
                          // Refund — disabled once the booking is in a terminal state.
                          {
                            label: "Refund",
                            disabled: b.status === "Cancelled" || b.status === "Refunded",
                            onClick: () => handleRefund(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M3 12a9 9 0 1 0 3-6.7" />
                                <path d="M3 4v5h5" />
                              </svg>
                            ),
                          },
                          // Cancel — terminal states have nothing left to cancel.
                          {
                            label: "Cancel booking",
                            danger: true,
                            disabled: b.status === "Cancelled" || b.status === "Refunded",
                            onClick: () => handleCancel(b.ref),
                            icon: (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M6 6l12 12" />
                              </svg>
                            ),
                          },
                        ]}
                      />
                    </td>
                  </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            noun="bookings"
          />
        </section>
      )}

      <BookingDetailDialog
        booking={openBooking}
        line={active}
        onClose={() => setOpenRef(null)}
        onCancel={(ref) => { handleCancel(ref); }}
        onApprove={(ref) => { handleApprove(ref); }}
        onRefund={(ref) => { handleRefund(ref); }}
        onEdit={(ref) => { handleEdit(ref); }}
        copiedTicket={copiedTicket}
        onCopyTicket={handleCopyTicket}
        copiedRef={copiedRef}
        onCopyRef={handleCopyRef}
      />
    </div>
  );
}

// ─────────── Booking detail dialog ───────────
// Four sections matching the project's visual language:
//  1. Header — booking ref + ticketholder + status + close
//  2. Route summary card — origin → destination, departure, vessel
//  3. Contact + payment grid — two columns of metadata
//  4. Per-pax ticket list — one card per ticket with copyable TKT-####-X id
function BookingDetailDialog({
  booking,
  line,
  onClose,
  onCancel,
  onApprove,
  onRefund,
  onEdit,
  copiedTicket,
  onCopyTicket,
  copiedRef,
  onCopyRef,
}: {
  booking: Booking | null;
  line: Line;
  onClose: () => void;
  onCancel: (ref: string) => void;
  onApprove: (ref: string) => void;
  onRefund: (ref: string) => void;
  onEdit: (ref: string) => void;
  copiedTicket: string | null;
  onCopyTicket: (id: string) => void;
  copiedRef: string | null;
  onCopyRef: (ref: string) => void;
}) {
  return (
    <AnimatePresence>
      {booking && (
        <motion.div
          key="booking-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] font-semibold tabular-nums tracking-[0.04em] text-slate-900">{booking.ref}</span>
                  {copiedRef === booking.ref ? (
                    <span className="grid h-5 w-5 place-items-center rounded text-emerald-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <path d="M5 12l5 5 9-11" />
                      </svg>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCopyRef(booking.ref)}
                      aria-label={`Copy ${booking.ref}`}
                      className="grid h-5 w-5 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <rect x="9" y="9" width="11" height="11" rx="2" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                      </svg>
                    </button>
                  )}
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[booking.status]}`}>
                    {booking.status}
                  </span>
                </div>
                <h2 className="mt-1.5 truncate text-[17px] font-semibold tracking-tight text-slate-900">{booking.ticketholder}</h2>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Booked {fmtDate(booking.bookingDate)} · {booking.pax} {booking.pax === 1 ? "passenger" : "passengers"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {/* Body — scrollable region holding the route card, meta grid, and tickets */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Route summary card — matches the voyage dialog's anatomy:
                  port-code headlines flanking a dashed arrow + shipping line
                  avatar in the middle, with a quiet meta row underneath. */}
              <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center justify-center gap-4">
                    {/* Origin */}
                    <div className="min-w-0 flex-1 text-center">
                      <div className="truncate font-mono text-[22px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">
                        {booking.routeOriginCode}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{booking.routeOriginCity}</div>
                    </div>

                    <DialogDashedArrow />

                    {/* Avatar + line name */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="shrink-0">
                        <LogoTile line={line} size={32} />
                      </span>
                      <span className="max-w-[120px] truncate text-[10px] font-medium text-slate-500">{line.name}</span>
                    </div>

                    <DialogDashedArrow />

                    {/* Destination */}
                    <div className="min-w-0 flex-1 text-center">
                      <div className="truncate font-mono text-[22px] font-bold uppercase tabular-nums tracking-[0.06em] text-slate-900">
                        {booking.routeDestinationCode}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{booking.routeDestinationCity}</div>
                    </div>
                  </div>
                  {/* ETD countdown — humanized gap between now and departure. */}
                  <p className="mt-3 text-center text-[11px] font-medium tracking-tight text-slate-500">
                    ( {fmtEtd(booking.departureDate)} )
                  </p>
                </div>

                {/* Meta row — vessel + departure + vehicle, divided like
                    aircraft boarding-pass spec lines. */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Departure</div>
                    <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">
                      {fmtDepartureDate(booking.departureDate)}
                    </div>
                    <div className="mt-0.5 font-mono text-[11.5px] font-medium tabular-nums text-slate-600">
                      {fmtDepartureTime(booking.departureDate)}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Vessel</div>
                    <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{booking.vesselName}</div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Vehicle</div>
                    <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">
                      {booking.vehicleClass ?? <span className="font-normal text-slate-300">—</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact + payment grid */}
              {/* Booking-level contact captured at checkout. */}
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200/70">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Contact</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Mobile</dt>
                    <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-900">{booking.contactMobile}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] text-slate-500">Email</dt>
                    <dd className="mt-0.5 truncate font-medium text-slate-900">{booking.contactEmail}</dd>
                  </div>
                </dl>
              </div>

              {/* Passenger roster — tabular layout (# · Passenger · Class ·
                  Rate) inspired by the ferry ticket spec. Each row expands to
                  reveal the per-pax Ticket ID (the load-bearing identifier),
                  valid-ID type/number, and demographic meta. */}
              <PassengerTable
                tickets={booking.tickets}
                copiedTicket={copiedTicket}
                onCopyTicket={onCopyTicket}
              />

              {/* Vehicle Information — only present when the booking includes
                  a vehicle slot. Shows class, plate, driver, and the comped
                  companions tied to the vehicle fee. */}
              {booking.vehicle && <VehicleInformation booking={booking} />}

              {/* Dedicated Payment Information section — itemized breakdown
                  of tickets, vehicle charge, and booking fee, totalled at
                  the bottom. Method + status sit at the top as meta. */}
              <PaymentInformation booking={booking} />
            </div>

            {/* Footer — actions scoped to the booking's current status:
                  Pending   → Approve (primary) + ⋯ menu (Cancel / Refund)
                  Confirmed → Cancel (ghost rose)
                  Cancelled → no destructive actions
                Edit is always present. */}
            <DialogFooter
              booking={booking}
              onClose={onClose}
              onCancel={onCancel}
              onApprove={onApprove}
              onRefund={onRefund}
              onEdit={onEdit}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────── DialogFooter ───────────
// Status-aware footer for the booking detail dialog.
//   - Pending bookings need explicit approval → Approve (primary) + ⋯ menu
//     with Cancel + Refund so the destructive actions don't crowd the row.
//   - Confirmed bookings only expose Cancel (ghost rose), since approval
//     already happened.
//   - Cancelled bookings show no destructive actions (terminal state).
// Edit is always present.
function DialogFooter({
  booking,
  onClose,
  onCancel,
  onApprove,
  onRefund,
  onEdit,
}: {
  booking: Booking;
  onClose: () => void;
  onCancel: (ref: string) => void;
  onApprove: (ref: string) => void;
  onRefund: (ref: string) => void;
  onEdit: (ref: string) => void;
}) {
  const fire = (fn: (ref: string) => void) => {
    fn(booking.ref);
    onClose();
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100"
      >
        Close
      </button>

      <div className="flex items-center gap-1">
        {/* Pending — destructive ghost buttons sit before the primary so the
            eye lands on Approve last. Cancel uses rose to mark it as the
            terminal action; Refund stays neutral. */}
        {booking.status === "Pending" && (
          <>
            <button
              type="button"
              onClick={() => fire(onCancel)}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-rose-500 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => fire(onRefund)}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100"
            >
              Refund
            </button>
            <button
              type="button"
              onClick={() => fire(onApprove)}
              className="ml-1 rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-brand-600"
            >
              Approve
            </button>
          </>
        )}

        {/* Confirmed — only Cancel is destructive; Edit is the primary. */}
        {booking.status === "Confirmed" && (
          <>
            <button
              type="button"
              onClick={() => fire(onCancel)}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-rose-500 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600"
            >
              Cancel booking
            </button>
            <button
              type="button"
              onClick={() => onEdit(booking.ref)}
              className="ml-1 rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-brand-600"
            >
              Edit
            </button>
          </>
        )}

        {/* Cancelled — terminal state, only Edit remains. */}
        {booking.status === "Cancelled" && (
          <button
            type="button"
            onClick={() => onEdit(booking.ref)}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-brand-600"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────── PassengerTable ───────────
// Tabular passenger roster for the booking dialog. Rows are clickable to
// expand a detail strip revealing the per-pax Ticket ID + valid-ID details.
function PassengerTable({
  tickets,
  copiedTicket,
  onCopyTicket,
}: {
  tickets: Ticket[];
  copiedTicket: string | null;
  onCopyTicket: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Preview state shared across all rows — clicking an ID photo pill opens
  // the lightbox without per-row local state.
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      <div className="grid grid-cols-[28px_minmax(0,5fr)_44px_38px_64px_80px_72px_20px] items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
        <span className="text-center">#</span>
        <span>Passenger</span>
        <span>Sex</span>
        <span>Age</span>
        <span>Class</span>
        <span>Status</span>
        <span className="text-right">Rate</span>
        <span />
      </div>
      <ul className="divide-y divide-slate-100">
        {tickets.map((t, idx) => {
          const expanded = openId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpenId((prev) => (prev === t.id ? null : t.id))}
                aria-label={expanded ? "Collapse passenger details" : "Expand passenger details"}
                aria-expanded={expanded}
                className="grid w-full grid-cols-[28px_minmax(0,5fr)_44px_38px_64px_80px_72px_20px] items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-50/80"
              >
                <span className="text-center font-mono text-[11.5px] tabular-nums text-slate-400">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold tracking-tight text-slate-900">{t.name}</span>
                    {t.vehicleRole && (
                      <span className="inline-flex shrink-0 items-center rounded bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-brand-700">
                        {t.vehicleRole}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[12px] font-medium tracking-tight text-slate-700">{t.sex}</span>
                <span className="font-mono text-[12px] tabular-nums text-slate-700">{t.age}</span>
                <span className="text-[12px] font-medium tracking-tight text-slate-700">{t.fareClass}</span>
                <span className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${ticketStatusTone[t.status]}`}>
                  {t.status}
                </span>
                <span className="text-right font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
                  ₱{t.fare.toLocaleString()}
                </span>
                <span className={`grid h-6 w-6 place-items-center justify-self-end text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="row-expand"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden bg-slate-50/60"
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-dashed border-slate-200 px-4 py-3 text-[12px]">
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Ticket ID</div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono text-[13px] font-bold tabular-nums tracking-[0.04em] text-slate-900">{t.id}</span>
                          {copiedTicket === t.id ? (
                            <span className="grid h-4 w-4 place-items-center rounded text-emerald-600">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                <path d="M5 12l5 5 9-11" />
                              </svg>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onCopyTicket(t.id)}
                              aria-label={`Copy ${t.id}`}
                              className="grid h-4 w-4 place-items-center rounded text-slate-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-200 hover:text-slate-700 active:scale-90"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                <rect x="9" y="9" width="11" height="11" rx="2" />
                                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">ID</div>
                        <div className="mt-0.5 text-[12.5px] font-semibold tracking-tight text-slate-900">{t.documentType}</div>
                        <div className="mt-0.5 font-mono text-[11.5px] font-medium tabular-nums text-slate-500">{t.documentRef}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Nationality</div>
                        <div className="mt-0.5 text-[12px] text-slate-700">{t.nationality}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                          Phone <span className="text-slate-400 normal-case tracking-normal">(Optional)</span>
                        </div>
                        <div className="mt-0.5 font-mono text-[12px] font-medium tabular-nums text-slate-700">{t.phone ?? "—"}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                          Email <span className="text-slate-400 normal-case tracking-normal">(Optional)</span>
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-slate-700">{t.email ?? "—"}</div>
                      </div>

                      {/* ID photo requirements — front + back. Both are
                          captured at booking; each pill opens a preview. */}
                      <div className="col-span-2">
                        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Valid ID Photos</div>
                        <ul className="mt-1.5 space-y-1.5 text-[12px]">
                          <RequirementRow
                            label={`${t.documentType} — Front`}
                            required
                            uploaded={!!t.idFrontUrl}
                            previewUrl={t.idFrontUrl}
                            onPreview={() => setPreview({ title: `${t.documentType} · Front`, url: t.idFrontUrl })}
                          />
                          <RequirementRow
                            label={`${t.documentType} — Back`}
                            required
                            uploaded={!!t.idBackUrl}
                            previewUrl={t.idBackUrl}
                            onPreview={() => setPreview({ title: `${t.documentType} · Back`, url: t.idBackUrl })}
                          />
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      <DocumentPreviewDialog doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

// ─────────── VehicleInformation ───────────
// Vehicle details + the companion roster bundled under the vehicle fee.
// Mirrors the visual vocabulary of the Payment Information section: header
// strip, divided meta row, then a small list of comped companions.
function VehicleInformation({ booking }: { booking: Booking }) {
  const v = booking.vehicle;
  // Preview dialog state — which document the operator clicked to enlarge.
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  if (!v) return null;
  const companions = booking.tickets.filter((t) => t.vehicleRole);
  const compedCount = companions.filter((t) => t.comped).length;
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Vehicle Information</h3>
        {compedCount > 0 && (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
            {compedCount} comped
          </span>
        )}
      </div>

      {/* Identity strip — Type · Plate · Driver. */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Type</div>
          <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{v.class}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Plate No.</div>
          <div className="mt-1 truncate font-mono text-[12.5px] font-bold tabular-nums tracking-[0.04em] text-slate-900">{v.plateNumber}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Driver</div>
          <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{v.driverName}</div>
        </div>
      </div>

      {/* Vehicle spec strip — Make/Model · Year · Operator label. */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Make / Model</div>
          <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{v.make} {v.model}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Year</div>
          <div className="mt-1 font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">{v.year}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Label</div>
          <div className="mt-1 truncate text-[12.5px] font-semibold tracking-tight text-slate-900">{v.label}</div>
        </div>
      </div>

      {/* Requirements — ORCR is required, photo is optional. Each row's
          status pill is clickable when an upload is on file; clicking opens
          the preview dialog. */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Requirements</div>
        <ul className="mt-2 space-y-1.5 text-[12.5px]">
          <RequirementRow
            label="Official Receipt (OR)"
            required
            uploaded={!!v.orUrl}
            previewUrl={v.orUrl}
            onPreview={() => v.orUrl && setPreview({ title: "Official Receipt (OR)", url: v.orUrl })}
          />
          <RequirementRow
            label="Certificate of Registration (CR)"
            required
            uploaded={!!v.crUrl}
            previewUrl={v.crUrl}
            onPreview={() => v.crUrl && setPreview({ title: "Certificate of Registration (CR)", url: v.crUrl })}
          />
          <RequirementRow
            label="Vehicle Photo"
            required={false}
            uploaded={!!v.photoUrl}
            previewUrl={v.photoUrl}
            onPreview={() => v.photoUrl && setPreview({ title: "Vehicle Photo", url: v.photoUrl })}
          />
        </ul>
      </div>

      {/* Companion roster bundled with the vehicle. */}
      <div className="px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Included with vehicle fee</div>
        <ul className="mt-2 space-y-1.5">
          {companions.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-[12.5px]">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-brand-700">
                  {t.vehicleRole}
                </span>
                <span className="font-medium tracking-tight text-slate-900">{t.name}</span>
              </div>
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-700">
                {t.comped ? "Comped" : `₱${t.fare.toLocaleString()}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <DocumentPreviewDialog
        doc={preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

// Single requirement line — label on the left, status pill on the right.
// Pill is a button when the doc is uploaded (clickable preview); otherwise
// a quiet "Missing" pill that doesn't expose any interaction.
function RequirementRow({
  label, required, uploaded, previewUrl, onPreview,
}: {
  label: string;
  required: boolean;
  uploaded: boolean;
  /** When provided, a thumbnail of this image renders inline so the
   *  attached document is unmistakably visible (not just a label). */
  previewUrl?: string;
  onPreview: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {uploaded && previewUrl ? (
          // Thumbnail doubles as the click target — the affordance is the
          // image itself, not just a pill.
          <button
            type="button"
            onClick={onPreview}
            aria-label={`Preview ${label}`}
            className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-md ring-1 ring-slate-200 transition-transform duration-150 active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-slate-900/0 text-white opacity-0 transition-[background-color,opacity] duration-150 group-hover:bg-slate-900/35 group-hover:opacity-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
          </button>
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-50 text-slate-300 ring-1 ring-dashed ring-slate-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 17 5-5 4 4 3-3 4 4" />
            </svg>
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate font-medium tracking-tight text-slate-900">{label}</div>
          {required && (
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">Required</div>
          )}
        </div>
      </div>
      {uploaded ? (
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 transition-colors duration-150 hover:bg-emerald-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M5 12l5 5 9-11" />
          </svg>
          Uploaded
        </button>
      ) : (
        <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
          required ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
        }`}>
          {required ? "Missing" : "Not provided"}
        </span>
      )}
    </li>
  );
}

// Lightbox-style document preview. Backdrop click + Esc close.
function DocumentPreviewDialog({
  doc, onClose,
}: {
  doc: { title: string; url: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!doc) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [doc, onClose]);
  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          key="doc-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[60vh] max-w-[60vw]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.url}
              alt={doc.title}
              className="block max-h-[60vh] max-w-[60vw] rounded-lg object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.4)] transition-[background-color,transform] duration-150 hover:bg-slate-100 active:scale-90"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────── PaymentInformation ───────────
// Itemized payment breakdown for the booking dialog. Shows method + status
// as meta, then a line for each ticket (grouped by fare class), an optional
// vehicle fee, a flat booking fee, and a totals strip at the bottom.
function PaymentInformation({ booking }: { booking: Booking }) {
  // Group tickets by fare class so the line items collapse when multiple
  // passengers share the same rate (e.g. "Economy × 3").
  const grouped = useMemo(() => {
    const acc = new Map<string, { fareClass: FareClass; fare: number; count: number; subtotal: number }>();
    // Comped (driver/companion) tickets are surfaced in the Vehicle section
    // and rolled up into the vehicle fee — skip them here so they don't
    // render as ₱0 line items.
    booking.tickets.filter((t) => !t.comped).forEach((t) => {
      const key = `${t.fareClass}-${t.fare}`;
      const existing = acc.get(key);
      if (existing) {
        existing.count += 1;
        existing.subtotal += t.fare;
      } else {
        acc.set(key, { fareClass: t.fareClass, fare: t.fare, count: 1, subtotal: t.fare });
      }
    });
    return Array.from(acc.values());
  }, [booking.tickets]);
  const compedCount = booking.tickets.filter((t) => t.comped).length;

  const passengerSubtotal = grouped.reduce((s, g) => s + g.subtotal, 0);
  // Whatever the booking total didn't cover via tickets/booking-fee gets
  // attributed to the vehicle line — keeps the breakdown reconciled with
  // the original amount the table column shows.
  const bookingFee = 40; // flat per-booking convenience fee
  const vehicleCharge = Math.max(0, booking.amount - passengerSubtotal - bookingFee);

  const statusTone =
    booking.paymentStatus === "Paid"
      ? "bg-emerald-100 text-emerald-800"
      : booking.paymentStatus === "Pending"
      ? "bg-brand-50 text-brand-700"
      : "bg-slate-100 text-slate-500";

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/70">
      {/* Section header + payment status pill */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Payment Information
        </h3>
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone}`}>
          {booking.paymentStatus}
        </span>
      </div>

      {/* Method strip */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Method</div>
          <div className="mt-1 text-[12.5px] font-semibold tracking-tight text-slate-900">{booking.paymentMethod}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Booked on</div>
          <div className="mt-1 text-[12.5px] font-semibold tracking-tight text-slate-900">{fmtDate(booking.bookingDate)}</div>
        </div>
      </div>

      {/* Itemized lines */}
      <dl className="divide-y divide-slate-100 px-4 py-1">
        {grouped.map((g) => (
          <div key={`${g.fareClass}-${g.fare}`} className="flex items-baseline justify-between py-2.5 text-[12.5px]">
            <dt className="min-w-0 flex-1">
              <span className="font-medium tracking-tight text-slate-900">{g.fareClass} ticket</span>
              {g.count > 1 && (
                <span className="ml-1.5 text-slate-500">× {g.count}</span>
              )}
              <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
                ₱{g.fare.toLocaleString()} each
              </div>
            </dt>
            <dd className="shrink-0 pl-3 font-mono text-[13px] font-semibold tabular-nums text-slate-900">
              ₱{g.subtotal.toLocaleString()}
            </dd>
          </div>
        ))}

        {vehicleCharge > 0 && (
          <div className="flex items-baseline justify-between py-2.5 text-[12.5px]">
            <dt className="min-w-0 flex-1">
              <span className="font-medium tracking-tight text-slate-900">Vehicle</span>
              {booking.vehicleClass && (
                <span className="ml-1.5 text-slate-500">{booking.vehicleClass}</span>
              )}
              {compedCount > 0 && (
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Includes {compedCount} comped {compedCount === 1 ? "seat" : "seats"} (driver + companion)
                </div>
              )}
            </dt>
            <dd className="shrink-0 pl-3 font-mono text-[13px] font-semibold tabular-nums text-slate-900">
              ₱{vehicleCharge.toLocaleString()}
            </dd>
          </div>
        )}

        <div className="flex items-baseline justify-between py-2.5 text-[12.5px]">
          <dt className="min-w-0 flex-1">
            <span className="font-medium tracking-tight text-slate-900">Booking fee</span>
            <div className="mt-0.5 text-[11px] text-slate-400">Convenience fee</div>
          </dt>
          <dd className="shrink-0 pl-3 font-mono text-[13px] font-semibold tabular-nums text-slate-900">
            ₱{bookingFee.toLocaleString()}
          </dd>
        </div>
      </dl>

      {/* Totals strip */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-500">Total</span>
          <span className="font-mono text-[16px] font-bold tabular-nums tracking-tight text-slate-900">
            ₱{booking.amount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Dashed connector flanking the shipping-line avatar in the route card.
function DialogDashedArrow() {
  return (
    <svg viewBox="0 0 48 12" className="h-3 w-10 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 6 H38" strokeDasharray="3 3" />
      <path d="M38 2 L44 6 L38 10" />
    </svg>
  );
}
