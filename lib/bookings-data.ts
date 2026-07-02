// ─────────── Booking shape ───────────
// Bookings are derived synthetically from the voyages an operator has created
// (stored in `tripket.voyages` localStorage). Each voyage seeds 1-3 mock
// bookings so the table has something to render before a real booking system
// is wired up.
// Booking lifecycle. Submitted = paid but awaiting operator approval;
// Confirmed = approved; To Refund = cancelled and eligible for a refund
// (money not yet returned); Refunded = money returned.
export type BookingStatus = "Confirmed" | "Submitted" | "Cancelled" | "To Refund" | "Refunded";

export type FareClass = "Economy" | "Tourist" | "Business";
export type PassengerSex = "Male" | "Female";
// Per-ticket lifecycle. Submitted = paid, awaiting approval; Issued = settled;
// Cancelled = void; To Refund = eligible for refund (money not yet returned);
// Refunded = money returned.
export type TicketStatus = "Submitted" | "Issued" | "Cancelled" | "To Refund" | "Refunded";

// Per-pax ticket carried under one booking. Each ticket has its own ID
// suffixed off the booking ref (TKT-0001-A, TKT-0001-B, …) so passengers can
// be checked in individually while staying grouped under the booking.
export type Ticket = {
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
  /** Fare paid for this ticket — zero when the seat is comped under a
      vehicle fare. Used for sums on the booking total. */
  fare: number;
  /** Original published rate for this ticket's fare class, always positive.
      Used for per-passenger display since comping is an aggregate property
      of the booking, not an attribute we expose on individual rows. */
  grossFare: number;
  /** Per-ticket gate status, distinct from the booking-level status. */
  status: TicketStatus;
  /** Real-world ticket number the admin assigns when collecting payment.
      Distinct from `id` (the system reference). Absent while unpaid — the
      UI shows a dash until it's captured on the Pending → Paid transition. */
  ticketNumber?: string;
  /** Optional per-pax contact. Lead pax usually inherits the booking's
      contact details; companions may or may not have their own captured. */
  phone?: string;
  email?: string;
  /** Required photo of the valid ID, front side. */
  idFrontUrl: string;
  /** Required photo of the valid ID, back side. */
  idBackUrl: string;
  /** True when this passenger seat is one of the N free seats bundled into
      the vehicle fee (configured per route on the schedule's fare). The
      assignment is deterministic — comped seats go to the lowest fare-class
      passengers so the customer saves the most. */
  comped?: boolean;
  /** Discount category the passenger booked under, drawn from the vessel's
      configured passenger types (Senior/PWD/Student/Infant) or "regular"
      for full-fare adults. Distinct from fareClass (cabin) and comped. */
  paxType: PaxType;
};

// Mirrors the vessel-creation passenger types (defaultPassengerTypes) plus
// "regular" for the undiscounted base fare.
export type PaxType = "regular" | "senior" | "pwd" | "student" | "infant";

export const PAX_TYPE_LABELS: Record<PaxType, string> = {
  regular: "Regular",
  senior: "Senior Citizen",
  pwd: "Person with Disability (PWD)",
  student: "Student",
  infant: "Infant",
};

// Per-booking vehicle details. Present only when the booking includes a
// vehicle slot. Plate + driver name are captured at checkout so the gate
// crew can match the vehicle and its driver against the manifest.
export type Vehicle = {
  class: string;
  plateNumber: string;
  /** Number of passenger seats bundled free into the vehicle fee. Set per
      route via the schedule's fare config (FaresStep's includedCompanions). */
  includedSeats: number;
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

export type Booking = {
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
  /** Payment metadata. Submitted = paid, awaiting operator approval. */
  paymentMethod: "Tripket Wallet";
  paymentStatus: "Issued" | "Submitted" | "Refunded";
  /** Per-pax tickets. tickets.length === pax. */
  tickets: Ticket[];
  /** Audit trail. Seeded from history on first load, then appended to live as
      the admin acts (approvals, ticket-number entry, refunds, cancellations). */
  activity?: ActivityEntry[];
};

// Build a fresh activity entry — used when appending live admin actions.
let activitySeq = 0;
export function makeActivity(
  kind: ActivityKind,
  title: string,
  actor: string,
  detail?: string
): ActivityEntry {
  return { id: `act-live-${Date.now()}-${activitySeq++}`, kind, title, detail, actor, at: new Date() };
}

// ─────────── Activity log ───────────
// A ClickUp-style audit trail shown in the booking/ticket dialogs. Entries are
// derived deterministically from a booking's lifecycle until a real audit
// backend feeds them. Newest first.
export type ActivityKind =
  | "created" | "approved" | "paid" | "ticket_paid" | "to_refund" | "refunded" | "cancelled" | "edited" | "note";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  /** Headline, e.g. "Marked as paid". */
  title: string;
  /** Optional supporting detail, e.g. "Ticket no. TKT-0001-A". */
  detail?: string;
  /** Who performed it — staff name or "System". */
  actor: string;
  at: Date;
};

// Staff actions are attributed generically to "Someone"; "System" stays last
// for system-generated entries (staff() excludes the final element).
const ACTORS = ["Someone", "System"];

// Re-hydrate bookings after a JSON round-trip — Date fields land as ISO
// strings in localStorage and need to come back as Date objects so the
// rest of the app's date math doesn't crash.
export function reviveBookings(raw: unknown): Booking[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b) => ({
    ...(b as Booking),
    departureDate: new Date((b as Booking).departureDate as unknown as string),
    bookingDate: new Date((b as Booking).bookingDate as unknown as string),
    activity: ((b as Booking).activity ?? []).map((e) => ({
      ...e,
      at: new Date(e.at as unknown as string),
    })),
  }));
}

// Build a believable activity trail for a booking from its dates + status.
export function deriveActivity(b: Booking): ActivityEntry[] {
  // Seed a tiny PRNG off the ref so a booking's log is stable across renders.
  let h = 2166136261;
  for (let i = 0; i < b.ref.length; i++) { h ^= b.ref.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const staff = () => ACTORS[Math.floor(rand() * (ACTORS.length - 1))]; // exclude System

  const out: ActivityEntry[] = [];
  const base = new Date(b.bookingDate);
  let cursor = new Date(base);
  const step = (mins: number) => { cursor = new Date(cursor.getTime() + mins * 60_000); return new Date(cursor); };
  let n = 0;
  const push = (kind: ActivityKind, title: string, actor: string, detail?: string) =>
    out.push({ id: `${b.ref}-act-${n++}`, kind, title, detail, actor, at: new Date(cursor) });

  // 1. Created (system, at booking time).
  push("created", "Booking created", "System", `${b.pax} passenger${b.pax === 1 ? "" : "s"} · ${b.routeOriginCode} → ${b.routeDestinationCode}`);

  // 2. Approval / payment depending on status.
  if (b.status === "Confirmed" || b.status === "Refunded") {
    step(30 + Math.floor(rand() * 240));
    push("approved", "Booking approved", staff());
    // Per-paid-ticket entries.
    b.tickets.filter((t) => t.status === "Issued" && t.ticketNumber).forEach((t) => {
      step(2 + Math.floor(rand() * 20));
      push("ticket_paid", "Ticket marked paid", staff(), `Ticket no. ${t.ticketNumber} · ${t.name}`);
    });
  }

  // 3. Terminal transitions.
  if (b.status === "Cancelled" || b.status === "To Refund" || b.status === "Refunded") {
    step(60 + Math.floor(rand() * 600));
    push("cancelled", "Booking cancelled", staff(), "Cancelled by operator");
  }
  // To Refund = cancelled and flagged eligible; the payout hasn't run yet.
  if (b.status === "To Refund") {
    step(30 + Math.floor(rand() * 300));
    push("to_refund", "Marked for refund", staff(), `₱${b.amount.toLocaleString()} eligible for return`);
  }
  if (b.status === "Refunded") {
    step(120 + Math.floor(rand() * 1200));
    push("refunded", "Payment refunded", staff(), `₱${b.amount.toLocaleString()} returned to wallet`);
  }

  // Newest first.
  return out.reverse();
}

// Ticket-scoped activity — a focused trail for a single passenger ticket.
// Derived from the ticket's own status + number so the rail in the ticket
// dialog reads sensibly without the full booking context.
export function deriveTicketActivity(t: Ticket, ref: string, createdAt: Date): ActivityEntry[] {
  let h = 2166136261;
  for (let i = 0; i < t.id.length; i++) { h ^= t.id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const staff = () => ACTORS[Math.floor(rand() * (ACTORS.length - 1))];

  const out: ActivityEntry[] = [];
  let cursor = new Date(createdAt);
  const step = (mins: number) => { cursor = new Date(cursor.getTime() + mins * 60_000); };
  let n = 0;
  const push = (kind: ActivityKind, title: string, actor: string, detail?: string) =>
    out.push({ id: `${t.id}-act-${n++}`, kind, title, detail, actor, at: new Date(cursor) });

  push("created", "Ticket issued", "System", `${t.name} · ${t.fareClass}`);
  if (t.status === "Issued" || t.status === "Refunded") {
    step(20 + Math.floor(rand() * 200));
    push("ticket_paid", "Marked as paid", staff(), t.ticketNumber ? `Ticket no. ${t.ticketNumber}` : undefined);
  }
  if (t.status === "Cancelled" || t.status === "To Refund" || t.status === "Refunded") {
    step(60 + Math.floor(rand() * 400));
    push("cancelled", "Ticket cancelled", staff());
  }
  if (t.status === "To Refund") { step(30 + Math.floor(rand() * 200)); push("to_refund", "Marked for refund", staff(), `Fare ₱${t.grossFare.toLocaleString()} eligible for return`); }
  if (t.status === "Refunded") { step(120 + Math.floor(rand() * 800)); push("refunded", "Ticket refunded", staff(), `Fare ₱${t.grossFare.toLocaleString()} returned`); }

  void ref;
  return out.reverse();
}

// ─────────── Voyage shape (slice of what we need from localStorage) ───────────
// Mirrors the fields VoyagesPage writes. Defensive — fields may be missing on
// older payloads, so we tolerate optionals everywhere.
export type StoredVoyage = {
  id: string;
  date: string;
  hour: number;
  minute: number;
  /** Shipping line that owns this voyage — used to scope operator views. */
  lineId?: string;
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

export function deriveBookings(voyages: StoredVoyage[]): Booking[] {
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
      const pax = counter === 17
        ? 4 // forced sample: 4 passengers with mixed ticket statuses
        : hasVehicle
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
          // Vehicle fare bundles 2 free passenger seats by default. In real
          // data this comes from the schedule's fare config (includedCompanions);
          // mock uses a fixed 2 until that's wired through.
          includedSeats: 2,
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
      // Forced samples so every status has a deterministic representative.
      //   counter === 1  → Refunded booking (table sample)
      //   counter === 2  → To Refund booking (cancelled, awaiting payout)
      //   counter === 17 → 4 passengers, mixed ticket statuses:
      //                    pax 0 Issued · pax 1 Issued · pax 2 Cancelled · pax 3 Refunded
      // Ticket-only overrides leave the booking status to the normal roll
      // so the row still reads as a healthy booking. Submitted = paid but
      // awaiting operator approval.
      const status: BookingStatus = counter === 1
        ? "Refunded"
        : counter === 2
          ? "To Refund"
          : statusRoll < 0.65 ? "Confirmed" : statusRoll < 0.9 ? "Submitted" : "Cancelled";
      const forceTicketMix17 = counter === 17;
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
        const fareClass: FareClass = rand() < 0.55 ? "Economy" : rand() < 0.85 ? "Tourist" : "Business";
        const sex: PassengerSex = rand() < 0.5 ? "Female" : "Male";
        const age = 1 + Math.floor(rand() * 72); // 1–72
        // Discount category, drawn to mirror the vessel's passenger types.
        // Age decides infant/senior; otherwise a small share are student/PWD.
        const paxType: PaxType = (() => {
          if (age <= 2) return "infant";
          if (age >= 60) return "senior";
          const roll = rand();
          if (age >= 6 && age <= 24 && roll < 0.2) return "student";
          if (roll >= 0.95) return "pwd";
          return "regular";
        })();
        const idType = ID_TYPES[Math.floor(rand() * ID_TYPES.length)];
        // Lead pax inherits the booking contact; companions get their own
        // mint so the dialog has a believable per-pax contact spread.
        const paxPhone = isLead
          ? contactMobile
          : `+63 ${900 + Math.floor(rand() * 99)}${String(1000000 + Math.floor(rand() * 8999999))}`.slice(0, 14);
        const paxEmail = isLead
          ? contactEmail
          : `${tFirst.toLowerCase()}.${last.replace(/\s+/g, "").toLowerCase()}@example.com`;
        const ticketStatus: TicketStatus = (() => {
          if (status === "Cancelled") return "Cancelled";
          if (status === "To Refund") return "To Refund";
          if (status === "Refunded")  return "Refunded";
          if (status === "Submitted") return "Submitted";
          if (forceTicketMix17) {
            if (p === 2) return "Cancelled";
            if (p === 3) return "Refunded";
            return "Issued";
          }
          return "Issued";
        })();
        // The ticket number is the public identifier (TKT-####-X), but it's
        // only assigned once a ticket is Issued. Submitted/unpaid tickets carry
        // none — the UI shows a dash until payment is collected.
        const ticketNumber = ticketStatus === "Issued"
          ? `${ref}-${String.fromCharCode(65 + p)}`
          : undefined;
        tickets.push({
          id: `${ref}-${String.fromCharCode(65 + p)}`, // A, B, C, …
          name: `${tFirst} ${last}`,
          fareClass,
          paxType,
          ticketNumber,
          age,
          sex,
          nationality: "Filipino",
          documentType: idType.label,
          documentRef: idType.format(rand),
          idFrontUrl: pickMockImage("idFront", rand),
          idBackUrl: pickMockImage("idBack", rand),
          // Provisional fare; comping pass below zeros out the seats
          // covered by the vehicle fee. grossFare stays at the published
          // rate so the per-passenger display can stay neutral.
          fare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          grossFare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          phone: paxPhone,
          email: paxEmail,
          status: ticketStatus,
        });
        void fareClasses; // silence lint
      }

      // Apply vehicle comping — N free seats from the vehicle fare go to the
      // cheapest-class tickets first so the customer saves the most. Stable
      // sort by original index keeps the comping deterministic when several
      // passengers share a fare class.
      if (vehicle) {
        const indexed = tickets.map((t, i) => ({ t, i }));
        indexed.sort((a, b) => {
          const af = FARE_CLASS_MULTIPLIER[a.t.fareClass];
          const bf = FARE_CLASS_MULTIPLIER[b.t.fareClass];
          return af !== bf ? af - bf : a.i - b.i;
        });
        const compCount = Math.min(vehicle.includedSeats, tickets.length);
        for (let c = 0; c < compCount; c++) {
          const target = indexed[c].t;
          target.comped = true;
          target.fare = 0;
        }
      }

      // Payment metadata — deterministic per booking via the same rng.
      // Single source of payment for the platform — Tripket Wallet routes
      // both customer top-ups and operator settlements through the same
      // ledger, so every booking lands here.
      const paymentMethod: Booking["paymentMethod"] = "Tripket Wallet";
      // To Refund = customer paid, payout not yet run → payment stays Issued
      // until the refund actually settles.
      const paymentStatus: Booking["paymentStatus"] =
        status === "Cancelled" || status === "Refunded"
          ? "Refunded"
          : status === "Submitted" ? "Submitted" : "Issued";

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

  // ── Extra Submitted samples ──
  // Five hand-seeded Submitted bookings (paid, awaiting approval) on top of the
  // voyage-derived rows so the approval queue always has a representative spread
  // (solo pax, small groups, a family, and a vehicle booking) regardless of how
  // the random roll fell. Each is built off a real voyage (cycled) so it carries
  // a valid route, vessel, and departure; all their tickets are Submitted with
  // no ticket number.
  const seedable = voyages.filter((v) => v.originCode && v.destinationCode && !isNaN(new Date(v.date).getTime()));
  if (seedable.length > 0) {
    // paxPlan defines each sample's size + fare-class mix + whether it carries
    // a vehicle, so the five reads as a believable variety rather than clones.
    const SAMPLE_PLANS: { pax: number; classes: FareClass[]; vehicle: boolean }[] = [
      { pax: 1, classes: ["Economy"], vehicle: false },
      { pax: 2, classes: ["Tourist", "Economy"], vehicle: false },
      { pax: 3, classes: ["Economy", "Economy", "Business"], vehicle: false },
      { pax: 4, classes: ["Tourist", "Tourist", "Economy", "Economy"], vehicle: false },
      { pax: 2, classes: ["Business", "Economy"], vehicle: true },
    ];
    SAMPLE_PLANS.forEach((plan, s) => {
      const v = seedable[s % seedable.length];
      const ref = `TKT-${String(counter).padStart(4, "0")}`;
      const rand = rng(hashStr(`pending-sample-${ref}`));
      const baseFare = v.cheapestFare || 1200;

      const dep = new Date(v.date);
      dep.setHours(v.hour, v.minute, 0, 0);
      // Pending bookings are recent — booked 1-3 days before departure.
      const bookingDate = new Date(dep);
      bookingDate.setDate(bookingDate.getDate() - (1 + Math.floor(rand() * 3)));
      bookingDate.setHours(0, 0, 0, 0);

      const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      const contactMobile = `+63 ${900 + Math.floor(rand() * 99)}${String(1000000 + Math.floor(rand() * 8999999))}`.slice(0, 14);
      const contactEmail = `${first}.${last.replace(/\s+/g, "").toLowerCase()}@example.com`;

      let vehicle: Vehicle | undefined;
      if (plan.vehicle) {
        const make = VEHICLE_MAKES[Math.floor(rand() * VEHICLE_MAKES.length)];
        const models = VEHICLE_MODELS_BY_MAKE[make] ?? ["Standard"];
        const model = models[Math.floor(rand() * models.length)];
        const labelPrefix = VEHICLE_LABEL_PREFIXES[Math.floor(rand() * VEHICLE_LABEL_PREFIXES.length)];
        vehicle = {
          class: VEHICLE_LABELS[Math.floor(rand() * VEHICLE_LABELS.length)],
          plateNumber: `${String.fromCharCode(65 + Math.floor(rand() * 26))}${String.fromCharCode(65 + Math.floor(rand() * 26))}${String.fromCharCode(65 + Math.floor(rand() * 26))} ${String(1000 + Math.floor(rand() * 8999))}`,
          includedSeats: 2,
          year: 2015 + Math.floor(rand() * 11),
          make,
          model,
          label: `${labelPrefix} ${model}`,
          photoUrl: pickMockImage("vehiclePhoto", rand),
          orUrl: pickMockImage("or", rand),
          crUrl: pickMockImage("cr", rand),
        };
      }

      const tickets: Ticket[] = plan.classes.map((fareClass, p) => {
        const isLead = p === 0;
        const tFirst = isLead ? first : FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
        const sex: PassengerSex = rand() < 0.5 ? "Female" : "Male";
        const age = 1 + Math.floor(rand() * 72);
        const paxType: PaxType = (() => {
          if (age <= 2) return "infant";
          if (age >= 60) return "senior";
          const roll = rand();
          if (age >= 6 && age <= 24 && roll < 0.2) return "student";
          if (roll >= 0.95) return "pwd";
          return "regular";
        })();
        const idType = ID_TYPES[Math.floor(rand() * ID_TYPES.length)];
        return {
          id: `${ref}-${String.fromCharCode(65 + p)}`,
          name: `${tFirst} ${last}`,
          fareClass,
          paxType,
          // Pending tickets have no assigned ticket number yet.
          ticketNumber: undefined,
          age,
          sex,
          nationality: "Filipino",
          documentType: idType.label,
          documentRef: idType.format(rand),
          idFrontUrl: pickMockImage("idFront", rand),
          idBackUrl: pickMockImage("idBack", rand),
          fare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          grossFare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          phone: isLead ? contactMobile : `+63 ${900 + Math.floor(rand() * 99)}${String(1000000 + Math.floor(rand() * 8999999))}`.slice(0, 14),
          email: isLead ? contactEmail : `${tFirst.toLowerCase()}.${last.replace(/\s+/g, "").toLowerCase()}@example.com`,
          status: "Submitted" as TicketStatus,
        };
      });

      // Comp the cheapest seats covered by the vehicle fee, mirroring the
      // main loop so vehicle sample totals stay honest.
      if (vehicle) {
        const indexed = tickets.map((t, i) => ({ t, i }));
        indexed.sort((a, b) => {
          const af = FARE_CLASS_MULTIPLIER[a.t.fareClass];
          const bf = FARE_CLASS_MULTIPLIER[b.t.fareClass];
          return af !== bf ? af - bf : a.i - b.i;
        });
        const compCount = Math.min(vehicle.includedSeats, tickets.length);
        for (let c = 0; c < compCount; c++) { indexed[c].t.comped = true; indexed[c].t.fare = 0; }
      }

      bookings.push({
        ref,
        ticketholder: `${first} ${last}`,
        pax: plan.pax,
        vehicleClass: vehicle?.class,
        vehicle,
        routeOriginCode: v.originCode!,
        routeDestinationCode: v.destinationCode!,
        routeOriginCity: v.originCity ?? v.originCode!,
        routeDestinationCity: v.destinationCity ?? v.destinationCode!,
        vesselName: v.vesselName ?? "Unknown vessel",
        departureDate: dep,
        amount: tickets.reduce((sum, t) => sum + t.fare, 0) + (vehicle ? 500 + Math.floor(rand() * 2000) : 0),
        status: "Submitted",
        bookingDate,
        contactMobile,
        contactEmail,
        paymentMethod: "Tripket Wallet",
        paymentStatus: "Submitted",
        tickets,
      });
      counter++;
    });
  }

  // Newest bookings first.
  return bookings.sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());
}
// Unified status palette — uppercase labels, no dots, restrained tones.
// Approved = opaque emerald (settled / good); Submitted = brand-orange
// (needs approval); To Refund = amber (payout pending); Cancelled = struck
// slate; Refunded = sky.
export const statusTone: Record<BookingStatus, string> = {
  Confirmed:   "bg-emerald-100 text-emerald-800",
  Submitted:   "bg-brand-50 text-brand-700",
  Cancelled:   "bg-slate-100 text-slate-500",
  "To Refund": "bg-amber-100 text-amber-800",
  Refunded:    "bg-sky-50 text-sky-700",
};

// Display label per status — keeps the internal "Confirmed" value (so all
// existing logic still works) while surfacing "Approved" to the operator.
export const statusLabel: Record<BookingStatus, string> = {
  Confirmed:   "Approved",
  Submitted:   "Submitted",
  Cancelled:   "Cancelled",
  "To Refund": "To Refund",
  Refunded:    "Refunded",
};

// Per-ticket palette — Submitted mirrors the booking submitted tone (brand
// orange), Issued is the healthy default (emerald), Cancelled is quietly
// muted slate, To Refund is amber (payout pending), Refunded matches the
// booking-level refund tone.
export const ticketStatusTone: Record<TicketStatus, string> = {
  Submitted:   "bg-brand-50 text-brand-700",
  Issued:      "bg-emerald-100 text-emerald-800",
  Cancelled:   "bg-slate-100 text-slate-500",
  "To Refund": "bg-amber-100 text-amber-800",
  Refunded:    "bg-sky-50 text-sky-700",
};
