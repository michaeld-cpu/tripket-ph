// Per-shipping-line dashboard data.
// Each key matches a line.id from lib/shipping-lines.ts.

export type KPI = {
  totalRevenue: number;
  ticketsIssued: number;
  cancellations: number;
  vehicleBookings: number;
  trends: { revenue: number; tickets: number; cancellations: number; vehicles: number };
};

export type WeeklyRevenueDay = { label: string; thisWeek: number; lastWeek: number };

export type BookingsMonth = { label: string; pax: number; veh: number };

export type PendingBooking = {
  ref: string;
  passenger: string;
  pax: number;
  routeFromCode: string;
  routeFromCity: string;
  routeToCode: string;
  routeToCity: string;
  vessel: string;
  vesselType: "RoRo" | "Fast Craft" | "Passenger Ship";
  operator: string;
  voyageId: string;
  departure: string;
  amount: number;
  status: "Pending" | "Confirmed" | "Cancelled";
  bookingDate: string;
  ageMinutes: number;
};

export type Departure = {
  id: string;
  vessel: string;
  type: "RoRo" | "Fast Craft" | "Ferry";
  operator: string;
  routeFrom: string;
  routeTo: string;
  depart: string;
  arrive: string;
  arriveOffsetDays?: number;
  durationLabel: string;
  /** Confirmed bookings (paid + issued). Source-of-truth from our system. */
  ticketsConfirmed: number;
  /** Bookings holding seats while payment clears. */
  ticketsPending: number;
};

export type VehicleClass = {
  key: string;
  label: string;
  descriptor: string;
  enabled: boolean;
  maxWeightKg?: number;
  maxLengthM?: number;
  /** Vehicle slots this class consumes on the vessel's vehicle deck.
      Used to project remaining capacity at booking time. */
  capacity?: number;
  /** Default fare for this vehicle class, set at vessel registration. The
      Voyages → Fares step pre-fills from this (mirrors AddOn.defaultPrice). */
  defaultPrice?: number;
  /** Extra companion seats bundled into the vehicle fare (driver always rides
      free, on top of this). Set at vessel registration; Voyages → Fares
      pre-fills from it. */
  includedCompanions?: number;
};

/** Discount on a fare. Either a flat peso amount or a percentage off. */
export type DiscountKind = "percent" | "flat";

export type PassengerType = {
  key: string;
  label: string;
  /** How the discount is expressed. Defaults to "percent" for legacy rows. */
  discountKind?: DiscountKind;
  /** % discount when discountKind === "percent" (0-100). */
  discountPct: number;
  /** Flat ₱ off when discountKind === "flat". */
  discountFlat?: number;
  requiredDoc: string;
  isInfant?: boolean;
  /** Whether this passenger type is offered on the vessel. Submitted as
      is_active; defaults to true when absent (legacy rows). */
  is_active?: boolean;
};

// Optional extras a vessel can sell on top of the base ticket (e.g. cabin meal,
// priority boarding). Defined at vessel-creation time so every schedule that
// uses the vessel inherits the same catalog.
export type AddOn = {
  key: string;
  label: string;
  descriptor: string;
  /** Suggested default price in PHP. Operators can override per-schedule. */
  defaultPrice: number;
  enabled: boolean;
};

// Seating accommodation tier a vessel offers (Economy / Tourist / Business).
// Each enabled tier carries its own seat capacity; the vessel's total passenger
// capacity is the sum of its enabled tiers.
export type AccommodationClass = {
  key: string;
  label: string;
  descriptor: string;
  enabled: boolean;
  /** Seats in this tier. Summed across enabled tiers → vessel passenger capacity. */
  capacity: number;
  /** Base fare (PHP) for this tier. Flows into Voyages → Fares as the default. */
  fare: number;
};

export type Vessel = {
  id: string;
  imo: string;
  name: string;
  type: "RoRo" | "Fast Craft" | "Passenger Ship";
  passengers: number;
  vehicleSlots: number | null; // null when type is passenger-only
  status: "Active" | "Inactive" | "Retired" | "Maintenance";
  /** Enabled flag for the API resource (is_enabled). Mirrors status==="Active".
      Defaults to true when absent (legacy rows). */
  is_enabled?: boolean;
  location: string;
  vehicleClasses?: VehicleClass[];
  passengerTypes?: PassengerType[];
  /** Seating tiers offered (Economy/Tourist/Business) with per-tier seat counts. */
  accommodations?: AccommodationClass[];
};

export type LineDashboard = {
  kpi: KPI;
  weeklyRevenue: WeeklyRevenueDay[];
  bookings6M: BookingsMonth[];
  pending: PendingBooking[];
  departures: Departure[];
  vessels: Vessel[];
};

const empty: LineDashboard = {
  kpi: {
    totalRevenue: 0,
    ticketsIssued: 0,
    cancellations: 0,
    vehicleBookings: 0,
    trends: { revenue: 0, tickets: 0, cancellations: 0, vehicles: 0 },
  },
  weeklyRevenue: [
    { label: "Mon", thisWeek: 0, lastWeek: 0 },
    { label: "Tue", thisWeek: 0, lastWeek: 0 },
    { label: "Wed", thisWeek: 0, lastWeek: 0 },
    { label: "Thu", thisWeek: 0, lastWeek: 0 },
    { label: "Fri", thisWeek: 0, lastWeek: 0 },
    { label: "Sat", thisWeek: 0, lastWeek: 0 },
    { label: "Sun", thisWeek: 0, lastWeek: 0 },
  ],
  bookings6M: [
    { label: "Nov", pax: 0, veh: 0 },
    { label: "Dec", pax: 0, veh: 0 },
    { label: "Jan", pax: 0, veh: 0 },
    { label: "Feb", pax: 0, veh: 0 },
    { label: "Mar", pax: 0, veh: 0 },
    { label: "Apr", pax: 0, veh: 0 },
  ],
  pending: [],
  departures: [],
  vessels: [],
};

const dashboards: Record<string, LineDashboard> = {
  "2go": {
    kpi: {
      totalRevenue: 4_820_000,
      ticketsIssued: 1340,
      cancellations: 28,
      vehicleBookings: 184,
      trends: { revenue: 22, tickets: 18, cancellations: -8, vehicles: 14 },
    },
    weeklyRevenue: [
      { label: "Mon", thisWeek: 132000, lastWeek: 102000 },
      { label: "Tue", thisWeek: 158000, lastWeek: 128000 },
      { label: "Wed", thisWeek: 128000, lastWeek: 108000 },
      { label: "Thu", thisWeek: 188000, lastWeek: 150000 },
      { label: "Fri", thisWeek: 138000, lastWeek: 112000 },
      { label: "Sat", thisWeek: 178000, lastWeek: 140000 },
      { label: "Sun", thisWeek: 112000, lastWeek: 88000 },
    ],
    bookings6M: [
      { label: "Nov", pax: 480, veh: 120 },
      { label: "Dec", pax: 1180, veh: 360 },
      { label: "Jan", pax: 620, veh: 180 },
      { label: "Feb", pax: 1040, veh: 480 },
      { label: "Mar", pax: 740, veh: 260 },
      { label: "Apr", pax: 1340, veh: 540 },
    ],
    pending: [
      { ref: "TKT-0001", passenger: "Maria Santos",   pax: 2, routeFromCode: "MNL", routeFromCity: "Manila",    routeToCode: "PPS", routeToCity: "Puerto Princesa", vessel: "MV Palawan Breeze", vesselType: "RoRo", operator: "2GO Travel", voyageId: "VY-9003", departure: "05/19 · 19:00", amount: 4200, status: "Pending", bookingDate: "2026-05-07", ageMinutes: 124 },
      { ref: "TKT-0002", passenger: "Juan Dela Cruz", pax: 1, routeFromCode: "MNL", routeFromCity: "Manila",    routeToCode: "ILO", routeToCity: "Iloilo",         vessel: "MV Visayan Star",     vesselType: "RoRo", operator: "2GO Travel", voyageId: "VY-9005", departure: "05/18 · 16:00", amount: 1800, status: "Pending", bookingDate: "2026-05-07", ageMinutes: 96 },
      { ref: "TKT-0003", passenger: "Andrea Lim",     pax: 3, routeFromCode: "MNL", routeFromCity: "Manila",    routeToCode: "CEB", routeToCity: "Cebu City",       vessel: "MV St. Pope John Paul", vesselType: "RoRo", operator: "2GO Travel", voyageId: "VY-9007", departure: "05/20 · 21:00", amount: 5400, status: "Pending", bookingDate: "2026-05-07", ageMinutes: 78 },
      { ref: "TKT-0004", passenger: "Rico Tan",       pax: 1, routeFromCode: "MNL", routeFromCity: "Manila",    routeToCode: "CDO", routeToCity: "Cagayan de Oro",  vessel: "MV Maligaya",          vesselType: "RoRo", operator: "2GO Travel", voyageId: "VY-9009", departure: "05/19 · 13:00", amount: 3200, status: "Pending", bookingDate: "2026-05-08", ageMinutes: 52 },
      { ref: "TKT-0005", passenger: "Patricia Reyes", pax: 4, routeFromCode: "BAT", routeFromCity: "Batangas",  routeToCode: "CAL", routeToCity: "Calapan",         vessel: "MV Visayan Star",     vesselType: "RoRo", operator: "2GO Travel", voyageId: "VY-9004", departure: "05/18 · 16:00", amount: 3200, status: "Pending", bookingDate: "2026-05-08", ageMinutes: 31 },
      { ref: "TKT-0006", passenger: "Joanna Cruz",    pax: 1, routeFromCode: "MNL", routeFromCity: "Manila",    routeToCode: "PPS", routeToCity: "Puerto Princesa", vessel: "MV Palawan Breeze", vesselType: "RoRo", operator: "2GO Travel", voyageId: "VY-9005", departure: "05/19 · 19:00", amount: 2100, status: "Pending", bookingDate: "2026-05-08", ageMinutes: 18 },
    ],
    departures: [
      { id: "VY-9003", vessel: "MV Palawan Breeze",      type: "RoRo", operator: "2GO Travel", routeFrom: "MNL", routeTo: "PPS", depart: "7:00 PM",  arrive: "5:00 PM", arriveOffsetDays: 1, durationLabel: "22h",     ticketsConfirmed: 310, ticketsPending: 24 },
      { id: "VY-9004", vessel: "MV Visayan Star",        type: "RoRo", operator: "2GO Travel", routeFrom: "BAT", routeTo: "CAL", depart: "4:00 PM",  arrive: "6:30 PM",                       durationLabel: "2h 30m", ticketsConfirmed: 412, ticketsPending: 9 },
      { id: "VY-9005", vessel: "MV Visayan Star",        type: "RoRo", operator: "2GO Travel", routeFrom: "MNL", routeTo: "ILO", depart: "4:00 PM",  arrive: "1:00 PM", arriveOffsetDays: 1, durationLabel: "21h",     ticketsConfirmed: 380, ticketsPending: 17 },
      { id: "VY-9007", vessel: "MV St. Pope John Paul",  type: "RoRo", operator: "2GO Travel", routeFrom: "MNL", routeTo: "CEB", depart: "9:00 PM",  arrive: "6:00 PM", arriveOffsetDays: 1, durationLabel: "21h",     ticketsConfirmed: 290, ticketsPending: 31 },
      { id: "VY-9009", vessel: "MV Maligaya",            type: "RoRo", operator: "2GO Travel", routeFrom: "MNL", routeTo: "CDO", depart: "1:00 PM",  arrive: "1:00 PM", arriveOffsetDays: 2, durationLabel: "48h",     ticketsConfirmed: 240, ticketsPending: 12 },
    ],
    vessels: [
      { id: "v1", imo: "9756101", name: "MV Palawan Breeze",       type: "RoRo", passengers: 520, vehicleSlots: 95,  status: "Active",   location: "At sea"   },
      { id: "v2", imo: "9112401", name: "MV Visayan Star",         type: "RoRo", passengers: 480, vehicleSlots: 80,  status: "Active",   location: "At port"  },
      { id: "v3", imo: "9223511", name: "MV St. Pope John Paul",   type: "RoRo", passengers: 460, vehicleSlots: 70,  status: "Active",   location: "At sea"   },
      { id: "v4", imo: "9334622", name: "MV Maligaya",             type: "RoRo", passengers: 540, vehicleSlots: 110, status: "Active",   location: "At sea"   },
      { id: "v5", imo: "9445702", name: "MV Our Lady of Akita",    type: "RoRo", passengers: 500, vehicleSlots: 90,  status: "Maintenance", location: "Dry dock" },
      { id: "v6", imo: "9445701", name: "MV St. Therese of Lisieux", type: "RoRo", passengers: 460, vehicleSlots: 80,  status: "Active",   location: "At port"  },
      { id: "v7", imo: "9556801", name: "MV St. Joan of Arc",      type: "RoRo", passengers: 480, vehicleSlots: 85,  status: "Active",   location: "At port"  },
      { id: "v8", imo: "9445809", name: "MV St. Augustine",        type: "RoRo", passengers: 500, vehicleSlots: 90,  status: "Retired", location: "Retired" },
      { id: "v9", imo: "9223621", name: "MV St. Anthony",          type: "RoRo", passengers: 460, vehicleSlots: 80,  status: "Active",   location: "At port"  },
    ],
  },
  fastcat:    empty,
  montenegro: empty,
  oceanjet:   empty,
  starlite:   empty,
  "trans-asia": empty,
  weesam:     empty,
};

export function getDashboardData(lineId: string): LineDashboard {
  return dashboards[lineId] ?? empty;
}

/**
 * Async fetcher — mirrors the shape of a real API call.
 * Skeleton visibility on the UI side is driven entirely by how long this resolves,
 * so swap the body for a real `fetch()` and slow networks will naturally show skeletons longer.
 */
export async function fetchDashboardData(lineId: string): Promise<LineDashboard> {
  // TODO: replace with `fetch('/api/dashboard/' + lineId).then(r => r.json())`
  return getDashboardData(lineId);
}
