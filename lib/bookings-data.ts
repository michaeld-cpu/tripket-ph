// ─────────── Booking shape ───────────
// Bookings are derived synthetically from the voyages an operator has created
// (stored in `tripket.voyages` localStorage). Each voyage seeds 1-3 mock
// bookings so the table has something to render before a real booking system
// is wired up.
// Booking lifecycle. Pending = placed but NOT paid yet (awaiting payment; the
// user-side hold expires if unpaid — see `paymentExpiresAt`); Submitted = paid
// but awaiting operator approval; Confirmed = approved; To Refund = cancelled
// and eligible for a refund (money not yet returned); Refunded = money returned.
export type BookingStatus = "Pending" | "Confirmed" | "Submitted" | "Cancelled" | "To Refund" | "Refunded";

export type FareClass = "Economy" | "Tourist" | "Business";
export type PassengerSex = "Male" | "Female";
// Per-ticket lifecycle. Tickets have no "Under Review" state — that's a
// booking-only concept. Pending = the booking hasn't been paid, so the ticket
// isn't issued yet; a paid ticket is Issued; Cancelled = void; To Refund =
// eligible for refund (money not yet returned); Refunded = money returned.
export type TicketStatus = "Pending" | "Issued" | "Cancelled" | "To Refund" | "Refunded";

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
  /** Optional free-text note the admin captures when assigning the ticket
      number (during approval / mark-issued). Surfaced on the ticket detail
      and the booking's passenger roster. */
  note?: string;
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
  /** True when the customer removed this passenger from their booking on the
      user side. The ticket is NOT hard-deleted — the admin still sees the row,
      it's flagged "To Refund", and the removal is surfaced in the activity
      log. Distinct from an admin-initiated cancellation. */
  removedByUser?: boolean;
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

/** Per-passenger fare breakdown, used identically on the booking dialog's
 *  passenger list and the single-ticket payment section so both read the same.
 *  base = published rate, discount = base − charged (capped at base, never
 *  negative), total = charged + this passenger's share of the service fee. */
export type PaxFareBreakdown = { base: number; discount: number; serviceFee: number; total: number };
export function paxFareBreakdown(ticket: Ticket, serviceFeePerPax = 0): PaxFareBreakdown {
  const base = ticket.grossFare;
  const discount = Math.max(0, Math.min(base, base - ticket.fare));
  const charged = base - discount; // === ticket.fare when fare ≥ 0
  return { base, discount, serviceFee: serviceFeePerPax, total: charged + serviceFeePerPax };
}

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
  /** Real-world vehicle ticket number the admin assigns at approval. Absent
      until the booking is approved. */
  ticketNumber?: string;
};

// ─────────── Payment provider record ───────────
// The gateway-facing side of a booking's transaction. Tripket routes payments
// through one of several partner providers, each fronting a set of checkout
// methods (e-wallets, cards, over-the-counter). These fields mirror what a
// real payment webhook would hand back, so the booking dialog can surface the
// full provider trail rather than just "paid / unpaid".
export type PaymentProvider = "BeetzeePay" | "AsbirPay" | "MaayoPay";
export const PAYMENT_PROVIDERS: PaymentProvider[] = ["BeetzeePay", "AsbirPay", "MaayoPay"];

// Provider-reported status of the transaction, independent of the internal
// booking lifecycle (`Booking.paymentStatus`).
export type PaymentProviderStatus = "Initial" | "Pending" | "Completed" | "Failed" | "Refunded";

// Checkout methods a provider can front. Kept as a flat catalogue since any
// provider can, in principle, offer any of them.
const PAYMENT_METHODS = [
  "PayMaya Checkout",
  "GCash",
  "Card Payment",
  "GrabPay",
  "Over-the-Counter",
  "Online Banking",
];

export type PaymentDetails = {
  /** Tripket-side payment reference for this booking. */
  reference: string;
  /** Which partner gateway processed the charge. */
  provider: PaymentProvider;
  /** Checkout method the customer used (e.g. "PayMaya Checkout"). */
  method: string;
  /** The provider's own transaction reference (from their webhook). */
  providerReference: string;
  /** Provider-reported transaction state. */
  status: PaymentProviderStatus;
  /** Platform service fee bundled into the booking total. */
  serviceFee: number;
  /** Sub total before the service fee — i.e. fares + add-ons. */
  subTotal: number;
  /** Grand total the customer was charged (subTotal + serviceFee). */
  total: number;
  /** Optional free-text remarks captured against the payment. */
  remarks?: string;
};

// Deterministic PRNG seeded off a booking ref — used to backfill payment
// details for older persisted bookings so the values stay stable per ref.
function refRng(ref: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < ref.length; i++) { h ^= ref.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

// Build a deterministic PaymentDetails from a booking's rng so the seeded data
// is stable across reloads. `total` is the booking amount; the service fee is
// carved out of it so subTotal + serviceFee reconciles to the total.
export function makePaymentDetails(
  ref: string,
  rand: () => number,
  total: number,
  paymentStatus: Booking["paymentStatus"],
): PaymentDetails {
  const provider = PAYMENT_PROVIDERS[Math.floor(rand() * PAYMENT_PROVIDERS.length)];
  const method = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)];
  // Provider status is derived from the funding lifecycle so the two never
  // contradict: settled → Completed, refunded → Refunded, awaiting → Pending.
  const status: PaymentProviderStatus =
    paymentStatus === "Refunded" ? "Refunded"
      : paymentStatus === "Issued" ? "Completed"
      : paymentStatus === "Pending" ? "Initial" // not paid yet — no charge attempted
      : "Pending"; // Submitted — payment settling
  // Flat platform service fee, deterministic per booking.
  const serviceFee = 25 + Math.floor(rand() * 6) * 5; // ₱25–₱50 in ₱5 steps
  const subTotal = Math.max(0, total - serviceFee);
  const provRef = `${provider.slice(0, 3).toUpperCase()}-${String(100000 + Math.floor(rand() * 899999))}`;
  return {
    reference: `PAY-${ref}`,
    provider,
    method,
    providerReference: provRef,
    status,
    serviceFee,
    subTotal,
    total,
  };
}

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
  /** Real-world booking reference the admin assigns at approval (distinct from
      `ref`, the system identifier). Absent until the booking is approved. */
  bookingRefNo?: string;
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
  /** When an unpaid (Pending) booking's payment hold lapses. Set only while
      status is "Pending"; the user side voids the booking after this. Drives
      the "Expires in Xh" hint in the admin table and dialog. */
  paymentExpiresAt?: Date;
  /** Contact details captured at booking. */
  contactMobile: string;
  contactEmail: string;
  /** Internal lifecycle funding flag driving approval/refund logic.
      Pending = not paid yet; Submitted = paid, awaiting operator approval.
      Distinct from `payment.status`, which is the payment *provider*'s
      reported state. */
  paymentMethod: "Tripket Wallet";
  paymentStatus: "Pending" | "Issued" | "Submitted" | "Refunded";
  /** Payment-provider record — the gateway-facing side of the transaction,
      surfaced verbatim in the booking dialog's Payment Information section. */
  payment: PaymentDetails;
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

// ─────────── Shared edit helpers ───────────
// One code path for editing a booking's passenger tickets and vehicle, reused
// by the Bookings page and the Tickets (passengers / vehicles) modules — all
// three read and write the same persisted "bookings" store, so an edit made on
// any surface shows up everywhere.

// Fare/amount fields are intentionally NOT editable here: they feed the
// payment totals and provider record, so they stay read-only to avoid
// desyncing money. Identity + contact + logistics only.
export type PassengerPatch = Partial<
  Pick<Ticket, "name" | "age" | "sex" | "nationality" | "paxType" | "fareClass" | "documentType" | "documentRef" | "phone" | "email" | "idFrontUrl" | "idBackUrl">
>;
export type VehiclePatch = Partial<
  Pick<Vehicle, "class" | "plateNumber" | "make" | "model" | "year" | "label" | "includedSeats" | "orUrl" | "crUrl" | "photoUrl">
>;

// Editing is allowed only before a booking settles. Once it's queued for
// refund, refunded, or cancelled, the record is treated as historical and
// locked so we don't rewrite a settled transaction.
export function canEditBooking(status: BookingStatus): boolean {
  return status === "Pending" || status === "Submitted" || status === "Confirmed";
}

// Prepend an activity entry to a booking, seeding the log from its derived
// history the first time. Shared so every surface logs edits identically.
export function logTo(b: Booking, entry: ActivityEntry): Booking {
  return { ...b, activity: [entry, ...(b.activity ?? deriveActivity(b))] };
}

// ─────────── Payment-hold expiry ───────────
// Unpaid (Pending) bookings hold the seats for a fixed window; the user side
// voids them once it lapses. We surface the remaining time so admins can spot
// bookings about to expire.
export const PAYMENT_HOLD_HOURS = 24;

// Human "Expires in 3h 20m" / "Expires soon" / "Expired" for a Pending
// booking. `now` is injectable so callers using a page-stable clock stay
// deterministic. Returns null when there's no expiry (non-Pending bookings).
export function formatExpiry(expiresAt: Date | undefined, now: Date = new Date()): string | null {
  if (!expiresAt) return null;
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 1) return `Expires in ${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `Expires in ${m}m`;
}

// True once the hold has lapsed (past-due, unpaid).
export function isExpired(expiresAt: Date | undefined, now: Date = new Date()): boolean {
  return !!expiresAt && expiresAt.getTime() <= now.getTime();
}

// Apply a passenger patch to one ticket inside its booking, append an "edited"
// activity entry, and return a new Booking[] (pure — callers persist the
// result). No-op if the booking/ticket isn't found or the booking is locked.
export function updatePassenger(
  bookings: Booking[],
  bookingRef: string,
  ticketId: string,
  patch: PassengerPatch,
  actor = "Someone",
): Booking[] {
  return bookings.map((b) => {
    if (b.ref !== bookingRef || !canEditBooking(b.status)) return b;
    let editedName = "";
    const tickets = b.tickets.map((t) => {
      if (t.id !== ticketId) return t;
      editedName = patch.name ?? t.name;
      return { ...t, ...patch };
    });
    if (!editedName) return b; // ticket not in this booking
    return logTo(
      { ...b, tickets },
      makeActivity("edited", "Passenger details updated", actor, editedName),
    );
  });
}

// Apply a vehicle patch to a booking's vehicle. No-op if there's no vehicle or
// the booking is locked.
export function updateVehicle(
  bookings: Booking[],
  bookingRef: string,
  patch: VehiclePatch,
  actor = "Someone",
): Booking[] {
  return bookings.map((b) => {
    if (b.ref !== bookingRef || !canEditBooking(b.status) || !b.vehicle) return b;
    const vehicle: Vehicle = { ...b.vehicle, ...patch };
    const label = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.class;
    return logTo(
      { ...b, vehicle, vehicleClass: vehicle.class },
      makeActivity("edited", "Vehicle details updated", actor, label),
    );
  });
}

// ─────────── Activity log ───────────
// A ClickUp-style audit trail shown in the booking/ticket dialogs. Entries are
// derived deterministically from a booking's lifecycle until a real audit
// backend feeds them. Newest first.
export type ActivityKind =
  | "created" | "approved" | "paid" | "ticket_paid" | "to_refund" | "refunded" | "cancelled" | "edited" | "note"
  | "passenger_removed";

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
// Drop cancelled bookings and cancelled tickets. Cancelled rows are no longer
// seeded, but a persisted store from an earlier session can still carry them —
// this flushes them on load so the tables never surface a Cancelled row.
export function purgeCancelled(list: Booking[]): Booking[] {
  return list
    .filter((b) => b.status !== "Cancelled")
    .map((b) => ({ ...b, tickets: b.tickets.filter((t) => t.status !== "Cancelled") }));
}

// Merge freshly-derived seed bookings into a persisted store. Any seeded
// booking whose ref isn't already present is appended, so newly-added mock
// samples surface on next load without wiping the operator's live edits to
// existing bookings. Existing refs are left untouched (persisted wins).
export function mergeSeededBookings(persisted: Booking[], seeded: Booking[]): Booking[] {
  const known = new Set(persisted.map((b) => b.ref));
  const additions = seeded.filter((b) => !known.has(b.ref));
  return additions.length === 0 ? persisted : [...persisted, ...additions];
}

// Fixed demo record for the missing-photo / Pending flow. Applied on every
// load (in reviveBookings) so it works against an already-persisted store
// without needing a reseed: this booking is forced Pending (unpaid) with its
// uploaded photos stripped, so the edit dialog reliably shows the Upload
// prompts. Swap the ref here to demo a different booking.
const DEMO_MISSING_PHOTO_REF = "TKT-0272";

function applyDemoOverride(booking: Booking): Booking {
  if (booking.ref !== DEMO_MISSING_PHOTO_REF) return booking;
  const now = new Date();
  const expires = new Date(now); expires.setHours(expires.getHours() + 18);
  // Pin the booking date to today so the table's default 30-day window never
  // hides it.
  const bookedToday = new Date(now); bookedToday.setHours(0, 0, 0, 0);
  return {
    ...booking,
    status: "Pending",
    paymentStatus: "Pending",
    paymentExpiresAt: expires,
    bookingDate: bookedToday,
    // Strip every uploaded ID photo so the passenger editor shows Upload/Missing.
    tickets: booking.tickets.map((t) => ({
      ...t,
      status: t.status === "Cancelled" || t.status === "Refunded" ? t.status : "Pending",
      idFrontUrl: "",
      idBackUrl: "",
    })),
    // Strip the vehicle's OR / CR / photo too, if it has a vehicle.
    vehicle: booking.vehicle
      ? { ...booking.vehicle, orUrl: "", crUrl: "", photoUrl: undefined }
      : booking.vehicle,
  };
}

// Booking ref that carries the "customer removed a passenger" sample. Must
// match the forced sample in deriveBookings so a fresh seed and a migrated
// stale store agree.
const USER_REMOVED_SAMPLE_REF = "TKT-0004";

// Migrate a persisted booking seeded before `removedByUser` existed: on the
// sample booking, flag its 2nd passenger (or the last one if only 1) as
// customer-removed and roll it into the refund queue. Idempotent — does
// nothing once any ticket already carries the flag. Returns the (possibly
// new) booking; drops cached `activity` so the log re-derives with the entry.
function migrateUserRemovedSample(b: Booking): Booking {
  if (b.ref !== USER_REMOVED_SAMPLE_REF) return b;
  if (b.tickets.some((t) => t.removedByUser)) return b;
  if (b.tickets.length === 0) return b;
  const idx = b.tickets.length > 1 ? 1 : 0;
  const tickets = b.tickets.map((t, i) =>
    i === idx ? { ...t, removedByUser: true, status: "To Refund" as const } : t,
  );
  // Drop the cached activity so deriveActivity re-runs and emits the
  // "Passenger removed by customer" entry.
  const { activity: _drop, ...rest } = b;
  void _drop;
  return { ...rest, tickets };
}

export function reviveBookings(raw: unknown): Booking[] {
  if (!Array.isArray(raw)) return [];
  const revived = raw.map((b) => {
    const migrated = migrateUserRemovedSample(b as Booking);
    return applyDemoOverride({
      ...migrated,
      departureDate: new Date(migrated.departureDate as unknown as string),
      bookingDate: new Date(migrated.bookingDate as unknown as string),
      // Revive the payment-hold expiry (Pending bookings only).
      paymentExpiresAt: migrated.paymentExpiresAt
        ? new Date(migrated.paymentExpiresAt as unknown as string)
        : undefined,
      // Backfill the payment record for bookings persisted before this field
      // existed, so the dialog never reads through an undefined `payment`.
      payment: migrated.payment ?? makePaymentDetails(migrated.ref, refRng(migrated.ref), migrated.amount, migrated.paymentStatus),
      activity: (migrated.activity ?? []).map((e) => ({
        ...e,
        at: new Date(e.at as unknown as string),
      })),
    });
  });
  return purgeCancelled(revived);
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

  // 1b. Customer-side passenger removals — the tickets stay on the booking
  // (flagged for refund), so surface each removal in the booking trail too.
  b.tickets.filter((t) => t.removedByUser).forEach((t) => {
    step(15 + Math.floor(rand() * 180));
    push("passenger_removed", "Passenger removed by customer", t.name, `${t.name} removed · fare ₱${t.grossFare.toLocaleString()} flagged for refund`);
  });

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
  if (t.removedByUser) {
    // Customer removed this passenger on the user side — the ticket stays on
    // record and rolls into the refund queue, so it's logged as a customer
    // action rather than an admin cancellation.
    step(60 + Math.floor(rand() * 400));
    push("passenger_removed", "Passenger removed by customer", t.name, `${t.name} removed from booking · fare ₱${t.grossFare.toLocaleString()} flagged for refund`);
  } else if (t.status === "Cancelled" || t.status === "To Refund" || t.status === "Refunded") {
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

// Like pickMockImage, but leaves a deterministic share of records without a
// photo (empty string) so the editor's "Missing / Upload" state is visible in
// the seed data. `missChance` is 0–1. Required buckets (ID / OR / CR) use a
// small chance; the optional vehicle photo uses a larger one.
function maybeMockImage(
  bucket: "idFront" | "idBack" | "vehiclePhoto" | "or" | "cr",
  rand: () => number,
  missChance: number,
): string {
  return rand() < missChance ? "" : pickMockImage(bucket, rand);
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
        : counter === 4
          ? 3 // forced sample: multi-pax booking with a user-removed passenger
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
          // Optional vehicle photo — often absent, so the editor shows the
          // Upload state for it frequently.
          photoUrl: maybeMockImage("vehiclePhoto", rand, 0.45) || undefined,
          // OR + CR are required at checkout, but a small share arrive without
          // one uploaded yet so the admin sees the "Missing" prompt.
          orUrl: maybeMockImage("or", rand, 0.2),
          crUrl: maybeMockImage("cr", rand, 0.2),
        };
      }
      const statusRoll = rand();
      // Forced samples so every status has a deterministic representative.
      //   counter === 1  → Refunded booking (table sample)
      //   counter === 2  → To Refund booking (awaiting payout)
      //   counter === 17 → 4 passengers, mixed ticket statuses:
      //                    pax 0 Issued · pax 1 Issued · pax 2 To Refund · pax 3 Refunded
      // Ticket-only overrides leave the booking status to the normal roll
      // so the row still reads as a healthy booking. Submitted = paid but
      // awaiting operator approval. Cancelled bookings are no longer seeded —
      // the former top 10% rolls into "To Refund" instead.
      const status: BookingStatus = counter === 1
        ? "Refunded"
        : counter === 2
          ? "To Refund"
          : counter === 3
            ? "Pending" // guaranteed unpaid sample so the state always shows
            : counter === 4
              ? "Confirmed" // paid booking so the user-removed pax has a fare to refund
              : statusRoll < 0.6 ? "Confirmed"
                : statusRoll < 0.78 ? "Submitted"
                : statusRoll < 0.9 ? "Pending"
                : "To Refund";
      const forceTicketMix17 = counter === 17;
      // counter === 4 → a multi-pax booking where the customer removed one
      // passenger on the user side. That ticket stays on record, flagged To
      // Refund, and shows a "Passenger removed by customer" activity entry.
      const forceUserRemoved4 = counter === 4 && pax >= 2;
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
        // The customer removed this specific passenger — the ticket rolls into
        // the refund queue but stays visible to the admin.
        const isUserRemoved = forceUserRemoved4 && p === 1;
        const ticketStatus: TicketStatus = (() => {
          if (isUserRemoved) return "To Refund";
          if (status === "To Refund") return "To Refund";
          if (status === "Refunded")  return "Refunded";
          // Pending booking = unpaid, so its tickets aren't issued yet.
          if (status === "Pending")   return "Pending";
          // Under Review (Submitted) is a booking-only state; its tickets are
          // paid, so they're Issued.
          if (forceTicketMix17) {
            // Cancelled tickets are no longer seeded — this pax rolls into
            // "To Refund" so the mixed-status sample stays varied.
            if (p === 2) return "To Refund";
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
          // A share of passengers haven't uploaded one or both ID sides yet,
          // so the editor surfaces the "Missing / Upload" state.
          idFrontUrl: maybeMockImage("idFront", rand, 0.25),
          idBackUrl: maybeMockImage("idBack", rand, 0.35),
          // Provisional fare; comping pass below zeros out the seats
          // covered by the vehicle fee. grossFare stays at the published
          // rate so the per-passenger display can stay neutral.
          fare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          grossFare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          phone: paxPhone,
          email: paxEmail,
          status: ticketStatus,
          ...(isUserRemoved ? { removedByUser: true } : {}),
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
        status === "Refunded"
          ? "Refunded"
          : status === "Pending" ? "Pending"
          : status === "Submitted" ? "Submitted" : "Issued";

      // Pending (unpaid) bookings hold their seats for PAYMENT_HOLD_HOURS. Some
      // samples are deliberately near-lapse (or already expired) so the admin
      // table shows the full spread of the expiry hint.
      const paymentExpiresAt = status === "Pending"
        ? (() => {
            const exp = new Date(bookingDate);
            // Hours offset from the deterministic rng: mostly in-window, a few
            // about to lapse, one already expired.
            const offset = Math.floor(rand() * (PAYMENT_HOLD_HOURS + 6)) - 3; // -3..+26h
            exp.setHours(exp.getHours() + offset);
            return exp;
          })()
        : undefined;

      const amount = pax * baseFare + (hasVehicle ? 500 + Math.floor(rand() * 2000) : 0);
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
        amount,
        status,
        bookingDate,
        paymentExpiresAt,
        contactMobile,
        contactEmail,
        paymentMethod,
        paymentStatus,
        payment: makePaymentDetails(ref, rand, amount, paymentStatus),
        tickets,
      });
      counter++;
    }
  });

  // ── Extra Under Review samples ──
  // Hand-seeded Under Review bookings (status Submitted — paid, awaiting
  // approval) on top of the voyage-derived rows so the approval queue always
  // has a representative spread (solo pax, small groups, families, and several
  // vehicle bookings) regardless of how the random roll fell. Each is built off
  // a real voyage (cycled) so it carries a valid route, vessel, and departure.
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
      // Five more Under Review samples — two carry a vehicle.
      { pax: 1, classes: ["Business"], vehicle: false },
      { pax: 2, classes: ["Economy", "Economy"], vehicle: true },
      { pax: 3, classes: ["Tourist", "Economy", "Economy"], vehicle: false },
      { pax: 4, classes: ["Business", "Tourist", "Economy", "Economy"], vehicle: true },
      { pax: 5, classes: ["Tourist", "Tourist", "Economy", "Economy", "Economy"], vehicle: false },
    ];
    SAMPLE_PLANS.forEach((plan, s) => {
      const v = seedable[s % seedable.length];
      const ref = `TKT-${String(counter).padStart(4, "0")}`;
      const rand = rng(hashStr(`pending-sample-${ref}`));
      const baseFare = v.cheapestFare || 1200;

      const dep = new Date(v.date);
      dep.setHours(v.hour, v.minute, 0, 0);
      // Booked within the last week so these land inside the bookings table's
      // default [today-30, today] window, even though the voyage departs in the
      // future (book-now-for-a-future-sailing).
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - Math.floor(rand() * 7));
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
          photoUrl: maybeMockImage("vehiclePhoto", rand, 0.45) || undefined,
          orUrl: maybeMockImage("or", rand, 0.2),
          crUrl: maybeMockImage("cr", rand, 0.2),
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
          // Under Review booking, but the tickets themselves are paid → Issued
          // with a ticket number assigned.
          ticketNumber: `${ref}-${String.fromCharCode(65 + p)}`,
          age,
          sex,
          nationality: "Filipino",
          documentType: idType.label,
          documentRef: idType.format(rand),
          idFrontUrl: maybeMockImage("idFront", rand, 0.25),
          idBackUrl: maybeMockImage("idBack", rand, 0.35),
          fare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          grossFare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          phone: isLead ? contactMobile : `+63 ${900 + Math.floor(rand() * 99)}${String(1000000 + Math.floor(rand() * 8999999))}`.slice(0, 14),
          email: isLead ? contactEmail : `${tFirst.toLowerCase()}.${last.replace(/\s+/g, "").toLowerCase()}@example.com`,
          status: "Issued" as TicketStatus,
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

      const submittedAmount = tickets.reduce((sum, t) => sum + t.fare, 0) + (vehicle ? 500 + Math.floor(rand() * 2000) : 0);
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
        amount: submittedAmount,
        status: "Submitted",
        bookingDate,
        contactMobile,
        contactEmail,
        paymentMethod: "Tripket Wallet",
        paymentStatus: "Submitted",
        payment: makePaymentDetails(ref, rand, submittedAmount, "Submitted"),
        tickets,
      });
      counter++;
    });
  }

  // ── Under Review, already paid samples ──
  // A booking is "Under Review" (status Submitted) once it's successfully
  // submitted AND paid — the payment has settled (paymentStatus "Issued") and
  // each ticket already carries its ticket number, but an operator hasn't
  // approved it yet. These sit alongside the not-yet-settled Submitted samples
  // above so the approval queue shows both funding states. Built off real
  // voyages (cycled) with a distinct rng seed so they're deterministic.
  if (seedable.length > 0) {
    const PAID_REVIEW_PLANS: { pax: number; classes: FareClass[]; vehicle: boolean }[] = [
      { pax: 1, classes: ["Economy"], vehicle: false },
      { pax: 2, classes: ["Business", "Tourist"], vehicle: false },
      { pax: 3, classes: ["Economy", "Economy", "Tourist"], vehicle: false },
      { pax: 2, classes: ["Tourist", "Economy"], vehicle: true },
    ];
    PAID_REVIEW_PLANS.forEach((plan, s) => {
      const v = seedable[s % seedable.length];
      const ref = `TKT-${String(counter).padStart(4, "0")}`;
      const rand = rng(hashStr(`paid-review-sample-${ref}`));
      const baseFare = v.cheapestFare || 1200;

      const dep = new Date(v.date);
      dep.setHours(v.hour, v.minute, 0, 0);
      // Booked within the last week so these land inside the bookings table's
      // default [today-30, today] window, even though the voyage departs in the
      // future. Booking-now-for-a-future-sailing is the realistic case.
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - Math.floor(rand() * 7));
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
          photoUrl: maybeMockImage("vehiclePhoto", rand, 0.45) || undefined,
          orUrl: maybeMockImage("or", rand, 0.2),
          crUrl: maybeMockImage("cr", rand, 0.2),
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
          // Paid but awaiting approval — the ticket number is already assigned
          // even though the booking is still Under Review (status Submitted).
          ticketNumber: `${ref}-${String.fromCharCode(65 + p)}`,
          age,
          sex,
          nationality: "Filipino",
          documentType: idType.label,
          documentRef: idType.format(rand),
          idFrontUrl: maybeMockImage("idFront", rand, 0.25),
          idBackUrl: maybeMockImage("idBack", rand, 0.35),
          fare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          grossFare: Math.round(baseFare * FARE_CLASS_MULTIPLIER[fareClass]),
          phone: isLead ? contactMobile : `+63 ${900 + Math.floor(rand() * 99)}${String(1000000 + Math.floor(rand() * 8999999))}`.slice(0, 14),
          email: isLead ? contactEmail : `${tFirst.toLowerCase()}.${last.replace(/\s+/g, "").toLowerCase()}@example.com`,
          status: "Issued" as TicketStatus,
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

      const paidAmount = tickets.reduce((sum, t) => sum + t.fare, 0) + (vehicle ? 500 + Math.floor(rand() * 2000) : 0);
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
        amount: paidAmount,
        // Under Review — submitted and paid, awaiting operator approval.
        status: "Submitted",
        bookingDate,
        contactMobile,
        contactEmail,
        paymentMethod: "Tripket Wallet",
        // Payment has settled, unlike the not-yet-paid Submitted samples above.
        paymentStatus: "Issued",
        payment: makePaymentDetails(ref, rand, paidAmount, "Issued"),
        tickets,
      });
      counter++;
    });
  }

  // Newest bookings first. Apply the fixed demo override so a fresh seed shows
  // it too (the persisted-store path applies it in reviveBookings).
  return bookings
    .map(applyDemoOverride)
    .sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());
}
// Unified status palette — uppercase labels, no dots, restrained tones.
// Approved = opaque emerald (settled / good); Submitted = brand-orange
// (needs approval); To Refund = amber (payout pending); Cancelled = struck
// slate; Refunded = sky.
export const statusTone: Record<BookingStatus, string> = {
  Pending:     "bg-yellow-50 text-yellow-700",
  Confirmed:   "bg-emerald-100 text-emerald-800",
  Submitted:   "bg-brand-50 text-brand-700",
  Cancelled:   "bg-slate-100 text-slate-500",
  "To Refund": "bg-amber-100 text-amber-800",
  Refunded:    "bg-sky-50 text-sky-700",
};

// Display label per status — keeps the internal "Confirmed" value (so all
// existing logic still works) while surfacing "Approved" to the operator.
export const statusLabel: Record<BookingStatus, string> = {
  Pending:     "Pending",
  Confirmed:   "Confirmed",
  Submitted:   "Under Review",
  Cancelled:   "Cancelled",
  "To Refund": "For Refund",
  Refunded:    "Refunded",
};

// Per-ticket palette — Pending is a waiting (yellow) state, Issued is the
// healthy default (emerald), Cancelled is quietly muted slate, To Refund is
// amber (payout pending), Refunded matches the booking-level refund tone.
export const ticketStatusTone: Record<TicketStatus, string> = {
  Pending:     "bg-yellow-50 text-yellow-700",
  Issued:      "bg-emerald-100 text-emerald-800",
  Cancelled:   "bg-slate-100 text-slate-500",
  "To Refund": "bg-amber-100 text-amber-800",
  Refunded:    "bg-sky-50 text-sky-700",
};

// Per-ticket display label — "To Refund" surfaces as "For Refund".
export const ticketStatusLabel: Record<TicketStatus, string> = {
  Pending:     "Pending",
  Issued:      "Issued",
  Cancelled:   "Cancelled",
  "To Refund": "For Refund",
  Refunded:    "Refunded",
};
