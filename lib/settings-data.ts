// ─────────── Shipping-line settings ───────────
// Booking configuration + policy, scoped PER shipping line. Persisted to
// localStorage keyed by line id so each operator keeps its own setup.
// (Per the product decision: Configurations + Booking policy are one screen.)

import type { VehicleClass, PassengerType, AddOn } from "@/lib/dashboard-data";
export type { VehicleClass, PassengerType, AddOn };

export type RequirementKey =
  // Passenger
  | "fullName" | "age" | "sex" | "contactNumber" | "nationality" | "idTypeNumber" | "homeAddress" | "email"
  // Vehicle details
  | "plateNumber" | "makeModel" | "vehicleColor" | "grossWeight" | "cargoDescription"
  // Vehicle documents
  | "officialReceipt" | "certOfRegistration" | "driversLicense" | "specialPermit";

export type Requirement = {
  key: RequirementKey;
  label: string;
  hint: string;
  /** Always-on requirements can't be toggled off. */
  locked?: boolean;
};

export const PASSENGER_REQUIREMENTS: Requirement[] = [
  { key: "fullName",      label: "Full name",      hint: "Always required", locked: true },
  { key: "age",           label: "Age",            hint: "Always required", locked: true },
  { key: "sex",           label: "Gender",         hint: "Male / Female" },
  { key: "contactNumber", label: "Contact number", hint: "Mobile number" },
  { key: "nationality",   label: "Nationality",    hint: "Filipino / Foreign" },
  { key: "idTypeNumber",  label: "ID type & number", hint: "Government-issued ID" },
  { key: "homeAddress",   label: "Home address",   hint: "Optional" },
  { key: "email",         label: "Email address",  hint: "For e-ticket delivery" },
];

export const VEHICLE_DETAIL_REQUIREMENTS: Requirement[] = [
  { key: "plateNumber",      label: "Plate number",  hint: "Always required", locked: true },
  { key: "makeModel",        label: "Make & model",  hint: "e.g. Toyota Fortuner" },
  { key: "vehicleColor",     label: "Vehicle color", hint: "e.g. White, Silver" },
  { key: "grossWeight",      label: "Gross vehicle weight", hint: "Declared GVW in kg" },
  { key: "cargoDescription", label: "Cargo description", hint: "What the vehicle carries" },
];

export const VEHICLE_DOCUMENT_REQUIREMENTS: Requirement[] = [
  { key: "officialReceipt",    label: "Official Receipt (OR)",      hint: "LTO registration payment" },
  { key: "certOfRegistration", label: "Certificate of Registration", hint: "LTO vehicle registration" },
  { key: "driversLicense",     label: "Driver's license",           hint: "Valid LTO license" },
  { key: "specialPermit",      label: "Special permit",             hint: "Overweight / oversized" },
];

export type BookingPolicy = {
  // Cutoff & cancellation
  bookingCutoffHours: number;     // booking closes N hours before departure
  freeCancelHours: number;        // free cancellation until N hours before
  refundPct: number;              // refund % within the cancellation window
  noShowForfeit: boolean;         // no-shows forfeit the fare
  // Capacity & overbooking
  overbookingPct: number;
  waitlistEnabled: boolean;
  seatHoldMinutes: number;        // hold a seat this long before payment
  // Payment & fees
  acceptWallet: boolean;
  acceptCard: boolean;
  bookingFee: number;             // flat ₱ per booking
  allowPartialPayment: boolean;
  // Vehicle & baggage
  compedSeatsPerVehicle: number;
  baggageAllowanceKg: number;
  oversizedNeedsApproval: boolean;
  // Boarding
  boardingNoticeMinutes: number;  // passengers must board N minutes before departure

  // ── Preset-style policy (dropdown selections) ──
  // Booking window
  bookingOpens: string;        // e.g. "30 days before departure"
  bookingCloses: string;       // e.g. "6 hours before departure"
  overbookingMode: string;     // e.g. "Not allowed — strict capacity limit"
  // Cancellation & refunds
  cancellationPolicy: string;
  rescheduleAllowed: string;
  reschedulingFee: string;
  // Passenger rules
  minUnaccompaniedAge: string;
  infantAgeThreshold: string;
  idVerification: string;
};

// Dropdown option sets for the preset-style policy cards.
export const POLICY_OPTIONS = {
  bookingOpens: ["90 days before departure", "60 days before departure", "30 days before departure", "14 days before departure", "7 days before departure"],
  bookingCloses: ["1 hour before departure", "2 hours before departure", "6 hours before departure", "12 hours before departure", "24 hours before departure"],
  overbookingMode: ["Not allowed — strict capacity limit", "Allow 5% overbooking", "Allow 10% overbooking", "Waitlist only when full"],
  cancellationPolicy: ["Non-refundable", "Full refund if cancelled 24h+ before departure", "50% refund if cancelled 24h+ before departure", "Full refund if cancelled 48h+ before departure"],
  rescheduleAllowed: ["Not allowed", "Once, up to 24h before departure", "Twice, up to 24h before departure", "Unlimited, up to 12h before departure"],
  reschedulingFee: ["No fee", "₱50 per ticket", "₱100 per ticket", "10% of fare"],
  minUnaccompaniedAge: ["No restriction", "12 years old", "15 years old", "18 years old"],
  infantAgeThreshold: ["Under 1 year old", "Under 2 years old", "Under 3 years old"],
  idVerification: ["Not required", "Required for senior, PWD, and student discounts", "Required for all passengers"],
} as const;

// ─────────── Line catalog ───────────
// Master catalog of vehicle classes, passenger types, and add-ons — defined
// once per shipping line in the Configurations tab. Vessels can only toggle
// which of these they offer; they cannot create new entries or override
// prices. Edits here propagate live to every vessel that has the item
// toggled on.
export type LineCatalog = {
  vehicleClasses: VehicleClass[];
  passengerTypes: PassengerType[];
  addOns: AddOn[];
};

export const DEFAULT_VEHICLE_CLASSES: VehicleClass[] = [
  { key: "motorcycle",  label: "Motorcycle / Tricycle", descriptor: "≤ 300 kg GVW",   enabled: true, maxWeightKg: 300,   capacity: 1, defaultPrice: 300,  includedCompanions: 1 },
  { key: "car",         label: "Car / SUV / Van",       descriptor: "≤ 3,500 kg GVW", enabled: true, maxWeightKg: 3500,  capacity: 2, defaultPrice: 1500, includedCompanions: 1 },
  { key: "pickup",      label: "Pickup / AUV",          descriptor: "≤ 3,500 kg GVW", enabled: true, maxWeightKg: 3500,  capacity: 2, defaultPrice: 1800, includedCompanions: 1 },
  { key: "light_truck", label: "Light Truck / Elf",     descriptor: "3.5 – 7 tons",   enabled: true, maxWeightKg: 7000,  capacity: 3, defaultPrice: 3500, includedCompanions: 1 },
  { key: "heavy_truck", label: "Heavy Truck / Trailer", descriptor: "7+ tons",        enabled: true, maxWeightKg: 12000, capacity: 5, defaultPrice: 6500, includedCompanions: 2 },
  { key: "bus",         label: "Bus / Minibus",         descriptor: "≤ 12 m length",  enabled: true, maxLengthM: 12,     capacity: 6, defaultPrice: 5000, includedCompanions: 2 },
];

export const DEFAULT_PASSENGER_TYPES: PassengerType[] = [
  { key: "senior",  label: "Senior Citizen",               discountPct: 20,  requiredDoc: "OSCA ID / Senior Citizen ID" },
  { key: "pwd",     label: "Person with Disability (PWD)", discountPct: 20,  requiredDoc: "PWD ID (national or LGU-issued)" },
  { key: "student", label: "Student",                      discountPct: 10,  requiredDoc: "Valid school ID" },
  { key: "infant",  label: "Infant",                       discountPct: 100, requiredDoc: "Birth certificate or PSA copy", isInfant: true },
];

export const DEFAULT_ADD_ONS: AddOn[] = [
  { key: "extraBag",      label: "Extra Cabin Bag",      descriptor: "Beyond included carry-on",       defaultPrice: 150, enabled: true },
  { key: "mealPack",      label: "Onboard Meal Pack",    descriptor: "Hot meal + drink mid-voyage",    defaultPrice: 250, enabled: true },
  { key: "priorityBoard", label: "Priority Boarding",    descriptor: "Skip the gate queue",            defaultPrice: 150, enabled: true },
  { key: "vehicleWash",   label: "Arrival Vehicle Wash", descriptor: "RoRo-only · cleaned on arrival", defaultPrice: 300, enabled: true },
];

export function defaultCatalog(): LineCatalog {
  return {
    vehicleClasses: DEFAULT_VEHICLE_CLASSES.map((c) => ({ ...c })),
    passengerTypes: DEFAULT_PASSENGER_TYPES.map((p) => ({ ...p })),
    addOns: DEFAULT_ADD_ONS.map((a) => ({ ...a })),
  };
}

export type LineSettings = {
  requirements: Record<RequirementKey, boolean>;
  policy: BookingPolicy;
  catalog: LineCatalog;
};

const ALL_REQUIREMENTS = [...PASSENGER_REQUIREMENTS, ...VEHICLE_DETAIL_REQUIREMENTS, ...VEHICLE_DOCUMENT_REQUIREMENTS];

// Sensible per-line defaults — what most ferry operators collect/enforce.
const DEFAULT_ON: RequirementKey[] = [
  "fullName", "age", "sex", "contactNumber",
  "plateNumber", "makeModel",
  "officialReceipt", "certOfRegistration", "driversLicense",
];

export function defaultSettings(): LineSettings {
  const requirements = Object.fromEntries(
    ALL_REQUIREMENTS.map((r) => [r.key, r.locked || DEFAULT_ON.includes(r.key)])
  ) as Record<RequirementKey, boolean>;
  return {
    requirements,
    policy: {
      bookingCutoffHours: 1,
      freeCancelHours: 24,
      refundPct: 80,
      noShowForfeit: true,
      overbookingPct: 0,
      waitlistEnabled: true,
      seatHoldMinutes: 15,
      acceptWallet: true,
      acceptCard: true,
      bookingFee: 40,
      allowPartialPayment: false,
      compedSeatsPerVehicle: 2,
      baggageAllowanceKg: 20,
      oversizedNeedsApproval: true,
      boardingNoticeMinutes: 30,
      bookingOpens: "30 days before departure",
      bookingCloses: "6 hours before departure",
      overbookingMode: "Not allowed — strict capacity limit",
      cancellationPolicy: "Full refund if cancelled 24h+ before departure",
      rescheduleAllowed: "Once, up to 24h before departure",
      reschedulingFee: "No fee",
      minUnaccompaniedAge: "15 years old",
      infantAgeThreshold: "Under 2 years old",
      idVerification: "Required for senior, PWD, and student discounts",
    },
    catalog: defaultCatalog(),
  };
}

// ─────────── Account profile ───────────
// Editable operator profile, persisted per line. Seeded from the static line
// record on first load.
export type AccountProfile = {
  displayName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  /** Custom logo as a data URL. Empty = fall back to the line's default logo. */
  logoUrl: string;
};

export function defaultAccount(name: string, id: string): AccountProfile {
  return {
    displayName: name,
    contactEmail: `support@${id}.ph`,
    contactPhone: "+63 2 8888 0000",
    address: "Pier 4, North Harbor, Manila",
    website: `https://www.${id}.ph`,
    logoUrl: "",
  };
}

const ACCOUNT_KEY = (lineId: string) => `tripket.account.${lineId}`;

export function loadAccount(lineId: string, name: string): AccountProfile {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY(lineId));
    if (!raw) return defaultAccount(name, lineId);
    return { ...defaultAccount(name, lineId), ...(JSON.parse(raw) as Partial<AccountProfile>) };
  } catch {
    return defaultAccount(name, lineId);
  }
}

export function saveAccount(lineId: string, profile: AccountProfile) {
  try {
    window.localStorage.setItem(ACCOUNT_KEY(lineId), JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

const KEY = (lineId: string) => `tripket.settings.${lineId}`;

// Merge stored catalog rows over their seed defaults by `key`. Stored values
// win; any field the seed has but the stored row lacks (a newer field) is
// backfilled from the seed. Rows with no matching seed (custom entries) pass
// through as-is. Returns the seed list when nothing was stored.
function mergeCatalogRows<T extends { key: string }>(
  stored: T[] | undefined,
  seed: T[],
): T[] {
  if (!stored) return seed;
  const seedByKey = new Map(seed.map((r) => [r.key, r]));
  return stored.map((row) => {
    const s = seedByKey.get(row.key);
    return s ? { ...s, ...row } : row;
  });
}

export function loadSettings(lineId: string): LineSettings {
  try {
    const raw = window.localStorage.getItem(KEY(lineId));
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<LineSettings>;
    const base = defaultSettings();
    return {
      requirements: { ...base.requirements, ...(parsed.requirements ?? {}) },
      policy: { ...base.policy, ...(parsed.policy ?? {}) },
      catalog: parsed.catalog
        ? {
            // Merge each stored row over its seed default (by key) so fields
            // added after a catalog was first saved — e.g. includedCompanions —
            // backfill instead of reading as undefined. Custom rows (no seed
            // match) pass through unchanged.
            vehicleClasses: mergeCatalogRows(parsed.catalog.vehicleClasses, base.catalog.vehicleClasses),
            passengerTypes: parsed.catalog.passengerTypes ?? base.catalog.passengerTypes,
            addOns: mergeCatalogRows(parsed.catalog.addOns, base.catalog.addOns),
          }
        : base.catalog,
    };
  } catch {
    return defaultSettings();
  }
}

export function loadCatalog(lineId: string): LineCatalog {
  return loadSettings(lineId).catalog;
}

export function saveSettings(lineId: string, settings: LineSettings) {
  try {
    window.localStorage.setItem(KEY(lineId), JSON.stringify(settings));
    // Notify same-tab listeners (storage events only fire cross-tab). Open
    // vessel dialogs subscribe to this to refresh their catalog view.
    window.dispatchEvent(new CustomEvent("tripket:catalog-updated", { detail: { lineId } }));
  } catch {
    /* ignore quota errors in mock */
  }
}
