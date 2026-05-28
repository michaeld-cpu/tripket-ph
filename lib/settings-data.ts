// ─────────── Shipping-line settings ───────────
// Booking configuration + policy, scoped PER shipping line. Persisted to
// localStorage keyed by line id so each operator keeps its own setup.
// (Per the product decision: Configurations + Booking policy are one screen.)

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
  { key: "sex",           label: "Sex",            hint: "Male / Female" },
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

export type LineSettings = {
  requirements: Record<RequirementKey, boolean>;
  policy: BookingPolicy;
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

export function loadSettings(lineId: string): LineSettings {
  try {
    const raw = window.localStorage.getItem(KEY(lineId));
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<LineSettings>;
    const base = defaultSettings();
    return {
      requirements: { ...base.requirements, ...(parsed.requirements ?? {}) },
      policy: { ...base.policy, ...(parsed.policy ?? {}) },
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(lineId: string, settings: LineSettings) {
  try {
    window.localStorage.setItem(KEY(lineId), JSON.stringify(settings));
  } catch {
    /* ignore quota errors in mock */
  }
}
