// ─────────── Booking shape ───────────
// Bookings are derived synthetically from the voyages an operator has created
// (stored in `tripket.voyages` localStorage). Each voyage seeds 1-3 mock
// bookings so the table has something to render before a real booking system
// is wired up.
export type BookingStatus = "Confirmed" | "Pending" | "Cancelled" | "Refunded";

export type FareClass = "Economy" | "Tourist" | "Business";
export type PassengerSex = "Male" | "Female";
// Per-ticket lifecycle. Pending = awaiting payment/approval; Paid = settled;
// Cancelled = refund pending; Refunded = money returned.
export type TicketStatus = "Pending" | "Paid" | "Cancelled" | "Refunded";

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
export type Vehicle = {
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
  /** Payment metadata. */
  paymentMethod: "Tripket Wallet";
  paymentStatus: "Paid" | "Pending" | "Refunded";
  /** Per-pax tickets. tickets.length === pax. */
  tickets: Ticket[];
};

// ─────────── Voyage shape (slice of what we need from localStorage) ───────────
// Mirrors the fields VoyagesPage writes. Defensive — fields may be missing on
// older payloads, so we tolerate optionals everywhere.
export type StoredVoyage = {
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
      // Forced samples so every status has a deterministic representative.
      //   counter === 1  → Refunded booking (table sample)
      //   counter === 17 → 4 passengers, mixed ticket statuses:
      //                    pax 0 Paid · pax 1 Paid · pax 2 Cancelled · pax 3 Refunded
      // Ticket-only overrides leave the booking status to the normal roll
      // so the row still reads as a healthy booking.
      const status: BookingStatus = counter === 1
        ? "Refunded"
        : statusRoll < 0.65 ? "Confirmed" : statusRoll < 0.9 ? "Pending" : "Cancelled";
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
          // Paid by default.
          status: (() => {
            if (status === "Cancelled") return "Cancelled" as TicketStatus;
            if (status === "Refunded")  return "Refunded"  as TicketStatus;
            if (status === "Pending")   return "Pending"   as TicketStatus;
            if (forceTicketMix17) {
              // pax 0+1 → Paid, pax 2 → Cancelled, pax 3 → Refunded
              if (p === 2) return "Cancelled" as TicketStatus;
              if (p === 3) return "Refunded"  as TicketStatus;
              return "Paid" as TicketStatus;
            }
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
// Unified status palette — uppercase labels, no dots, restrained tones.
// Approved = opaque emerald (settled / good); Pending = brand-orange
// (needs attention); Cancelled = struck slate.
export const statusTone: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800",
  Pending:   "bg-brand-50 text-brand-700",
  Cancelled: "bg-slate-100 text-slate-500",
  Refunded:  "bg-sky-50 text-sky-700",
};

// Display label per status — keeps the internal "Confirmed" value (so all
// existing logic still works) while surfacing "Approved" to the operator.
export const statusLabel: Record<BookingStatus, string> = {
  Confirmed: "Approved",
  Pending:   "Pending",
  Cancelled: "Cancelled",
  Refunded:  "Refunded",
};

// Per-ticket palette — Pending mirrors the booking pending tone (brand
// orange), Paid is the healthy default (emerald), Cancelled is quietly
// muted slate, Refunded matches the booking-level refund tone.
export const ticketStatusTone: Record<TicketStatus, string> = {
  Pending:   "bg-brand-50 text-brand-700",
  Paid:      "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-slate-100 text-slate-500",
  Refunded:  "bg-sky-50 text-sky-700",
};
