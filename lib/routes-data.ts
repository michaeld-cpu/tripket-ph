// ─────────── Shared routes catalog ───────────
// The routes page is the single source of truth for what routes exist on a
// shipping line. The schedule-creation wizard reads from here so it never
// invents ports/distances on its own — admins pick from this list instead.
// When a real backend lands, replace MOCK_ROUTES with a fetch.

export type RouteStatus = "Active" | "Inactive";

export type Route = {
  id: string;
  /** Short human-friendly reference code displayed in the table. */
  ref: string;
  origin: { code: string; city: string };
  destination: { code: string; city: string };
  distanceNm: number;
  durationHrs: [number, number]; // [low, high]
  status: RouteStatus;
  /** Vessel assignments on this route. A route can run multiple vessels. */
  assignments: VesselAssignment[];
};

export type VesselAssignment = {
  vessel: string;
  /** Concrete dated departures for this vessel, sorted ascending. */
  departures: Date[];
};

// Mints mock departure dates spread across the next ~30 days on the given
// weekday cadence. Used until the schedule pipeline feeds real dates in.
export function mockDepartures(count: number, weekdays: number[], hour: number): Date[] {
  if (count === 0) return [];
  const out: Date[] = [];
  const cursor = new Date();
  cursor.setHours(hour, 0, 0, 0);
  let guard = 0;
  while (out.length < count && guard < 60) {
    if (weekdays.includes(cursor.getDay())) out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return out;
}

export const MOCK_ROUTES: Route[] = [
  { id: "r1",  ref: "RT-0001", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 42, durationHrs: [3.5, 4],   status: "Active",   assignments: [
    { vessel: "MV Filipinas Cebu", departures: mockDepartures(13, [1,3,5], 8) },
    { vessel: "FC Sinulog",        departures: mockDepartures(8, [2,4], 13) },
  ] },
  { id: "r2",  ref: "RT-0002", origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "CEB", city: "Cebu City" },      distanceNm: 42, durationHrs: [3.5, 4],   status: "Active",   assignments: [{ vessel: "MV Filipinas Cebu", departures: mockDepartures(13, [1,3,5], 14) }] },
  { id: "r3",  ref: "RT-0003", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "TAG", city: "Tagbilaran City" },distanceNm: 65, durationHrs: [2, 2.5],   status: "Active",   assignments: [{ vessel: "FC Sinulog", departures: mockDepartures(8, [2,4], 6) }] },
  { id: "r4",  ref: "RT-0004", origin: { code: "TAG", city: "Tagbilaran City" }, destination: { code: "CEB", city: "Cebu City" },      distanceNm: 65, durationHrs: [2, 2.5],   status: "Active",   assignments: [{ vessel: "FC Sinulog", departures: mockDepartures(8, [2,4], 11) }] },
  { id: "r5",  ref: "RT-0005", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "ORM", city: "Ormoc City" },     distanceNm: 95, durationHrs: [3.5, 4],   status: "Active",   assignments: [
    { vessel: "MV Reina del Cielo", departures: mockDepartures(21, [1,2,3,4,5], 9) },
    { vessel: "MV Visayan Star",    departures: mockDepartures(8, [6,0], 9) },
  ] },
  { id: "r6",  ref: "RT-0006", origin: { code: "ORM", city: "Ormoc City" },      destination: { code: "CEB", city: "Cebu City" },      distanceNm: 95, durationHrs: [3.5, 4],   status: "Active",   assignments: [{ vessel: "MV Reina del Cielo", departures: mockDepartures(21, [1,2,3,4,5], 16) }] },
  { id: "r7",  ref: "RT-0007", origin: { code: "CEB", city: "Cebu City" },       destination: { code: "BAC", city: "Bacolod City" },   distanceNm: 80, durationHrs: [4, 5],     status: "Active",   assignments: [{ vessel: "MV Visayan Star", departures: mockDepartures(8, [6,0], 7) }] },
  { id: "r8",  ref: "RT-0008", origin: { code: "BAC", city: "Bacolod City" },    destination: { code: "CEB", city: "Cebu City" },      distanceNm: 80, durationHrs: [4, 5],     status: "Active",   assignments: [{ vessel: "MV Visayan Star", departures: mockDepartures(8, [6,0], 13) }] },
  { id: "r9",  ref: "RT-0009", origin: { code: "DGT", city: "Dumaguete City" },  destination: { code: "DAP", city: "Dapitan City" },   distanceNm: 38, durationHrs: [2.5, 3],   status: "Inactive", assignments: [] },
  { id: "r10", ref: "RT-0010", origin: { code: "DAP", city: "Dapitan City" },    destination: { code: "DGT", city: "Dumaguete City" }, distanceNm: 38, durationHrs: [2.5, 3],   status: "Inactive", assignments: [] },
  { id: "r11", ref: "RT-0011", origin: { code: "BAT", city: "Batangas City" },   destination: { code: "CAL", city: "Calapan City" },   distanceNm: 26, durationHrs: [2.5, 3],   status: "Active",   assignments: [{ vessel: "MV Maligaya", departures: mockDepartures(26, [1,2,3,4,5,6,0], 5) }] },
  { id: "r12", ref: "RT-0012", origin: { code: "CAL", city: "Calapan City" },    destination: { code: "BAT", city: "Batangas City" },  distanceNm: 26, durationHrs: [2.5, 3],   status: "Active",   assignments: [{ vessel: "MV Maligaya", departures: mockDepartures(26, [1,2,3,4,5,6,0], 10) }] },
  { id: "r13", ref: "RT-0013", origin: { code: "MNL", city: "Manila" },          destination: { code: "PPS", city: "Puerto Princesa" },distanceNm: 350,durationHrs: [22, 24],  status: "Active",   assignments: [{ vessel: "2GO Masinloc", departures: mockDepartures(4, [5], 18) }] },
  { id: "r14", ref: "RT-0014", origin: { code: "PPS", city: "Puerto Princesa" }, destination: { code: "MNL", city: "Manila" },         distanceNm: 350,durationHrs: [22, 24],  status: "Active",   assignments: [{ vessel: "2GO Masinloc", departures: mockDepartures(4, [0], 18) }] },
  { id: "r15", ref: "RT-0015", origin: { code: "MNL", city: "Manila" },          destination: { code: "ILO", city: "Iloilo City" },    distanceNm: 250,durationHrs: [18, 20],  status: "Active",   assignments: [{ vessel: "2GO Saint Pope John Paul II", departures: mockDepartures(4, [3], 20) }] },
  { id: "r16", ref: "RT-0016", origin: { code: "ILO", city: "Iloilo City" },     destination: { code: "MNL", city: "Manila" },         distanceNm: 250,durationHrs: [18, 20],  status: "Active",   assignments: [{ vessel: "2GO Saint Pope John Paul II", departures: mockDepartures(4, [6], 20) }] },
];
