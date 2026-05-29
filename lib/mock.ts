export type Vessel = {
  id: string;
  name: string;
  type: "RoRo" | "Fastcraft" | "Ferry";
  capacity: number;
  status: "Active" | "Maintenance" | "Docked";
  homePort: string;
};

export type Route = {
  id: string;
  origin: string;
  destination: string;
  durationHrs: number;
  distanceNm: number;
  active: boolean;
};

export type Voyage = {
  id: string;
  vesselId: string;
  routeId: string;
  departure: string;
  arrival: string;
  status: "Scheduled" | "Boarding" | "In Transit" | "Arrived" | "Cancelled";
  seatsBooked: number;
  seatsTotal: number;
};

export type Booking = {
  id: string;
  voyageId: string;
  passenger: string;
  seats: number;
  total: number;
  status: "Issued" | "Pending" | "Refunded" | "Cancelled";
  bookedAt: string;
  vehicle?: "None" | "Motorcycle" | "Car" | "SUV" | "Truck";
};

export const vessels: Vessel[] = [
  { id: "V-001", name: "MV Visayan Star", type: "RoRo", capacity: 480, status: "Active", homePort: "Batangas" },
  { id: "V-002", name: "MV Cebu Pearl", type: "Fastcraft", capacity: 220, status: "Active", homePort: "Cebu" },
  { id: "V-003", name: "MV Mindoro Express", type: "Ferry", capacity: 350, status: "Maintenance", homePort: "Calapan" },
  { id: "V-004", name: "MV Bohol Wave", type: "Fastcraft", capacity: 180, status: "Active", homePort: "Tagbilaran" },
  { id: "V-005", name: "MV Palawan Breeze", type: "RoRo", capacity: 520, status: "Docked", homePort: "Puerto Princesa" },
];

export const routes: Route[] = [
  { id: "R-101", origin: "Batangas", destination: "Calapan", durationHrs: 2.5, distanceNm: 26, active: true },
  { id: "R-102", origin: "Cebu", destination: "Tagbilaran", durationHrs: 2, distanceNm: 42, active: true },
  { id: "R-103", origin: "Manila", destination: "Puerto Princesa", durationHrs: 22, distanceNm: 340, active: true },
  { id: "R-104", origin: "Cebu", destination: "Ormoc", durationHrs: 2.75, distanceNm: 55, active: true },
  { id: "R-105", origin: "Iloilo", destination: "Bacolod", durationHrs: 1, distanceNm: 18, active: false },
];

export const voyages: Voyage[] = [
  { id: "VY-9001", vesselId: "V-001", routeId: "R-101", departure: "2026-05-18 06:00", arrival: "2026-05-18 08:30", status: "Boarding", seatsBooked: 412, seatsTotal: 480 },
  { id: "VY-9002", vesselId: "V-002", routeId: "R-102", departure: "2026-05-18 07:30", arrival: "2026-05-18 09:30", status: "In Transit", seatsBooked: 190, seatsTotal: 220 },
  { id: "VY-9003", vesselId: "V-004", routeId: "R-102", departure: "2026-05-18 13:00", arrival: "2026-05-18 15:00", status: "Scheduled", seatsBooked: 95, seatsTotal: 180 },
  { id: "VY-9004", vesselId: "V-001", routeId: "R-101", departure: "2026-05-18 16:00", arrival: "2026-05-18 18:30", status: "Scheduled", seatsBooked: 220, seatsTotal: 480 },
  { id: "VY-9005", vesselId: "V-005", routeId: "R-103", departure: "2026-05-19 19:00", arrival: "2026-05-20 17:00", status: "Scheduled", seatsBooked: 310, seatsTotal: 520 },
  { id: "VY-9006", vesselId: "V-002", routeId: "R-104", departure: "2026-05-17 09:00", arrival: "2026-05-17 11:45", status: "Arrived", seatsBooked: 215, seatsTotal: 220 },
];

export const bookings: Booking[] = [
  { id: "BK-50012", voyageId: "VY-9001", passenger: "Maria Santos", seats: 2, total: 1600, status: "Issued", bookedAt: "2026-05-17 10:24", vehicle: "None" },
  { id: "BK-50013", voyageId: "VY-9002", passenger: "Juan Dela Cruz", seats: 1, total: 3200, status: "Issued", bookedAt: "2026-05-17 11:02", vehicle: "Car" },
  { id: "BK-50014", voyageId: "VY-9003", passenger: "Andrea Lim", seats: 3, total: 2700, status: "Pending", bookedAt: "2026-05-17 14:18", vehicle: "None" },
  { id: "BK-50015", voyageId: "VY-9005", passenger: "Rico Tan", seats: 1, total: 5400, status: "Issued", bookedAt: "2026-05-17 16:55", vehicle: "SUV" },
  { id: "BK-50016", voyageId: "VY-9004", passenger: "Patricia Reyes", seats: 4, total: 4800, status: "Issued", bookedAt: "2026-05-18 06:11", vehicle: "Motorcycle" },
  { id: "BK-50017", voyageId: "VY-9006", passenger: "Kyle Mendoza", seats: 2, total: 2400, status: "Cancelled", bookedAt: "2026-05-16 09:33", vehicle: "None" },
  { id: "BK-50018", voyageId: "VY-9001", passenger: "Joanna Cruz", seats: 1, total: 800, status: "Issued", bookedAt: "2026-05-18 05:40", vehicle: "None" },
  { id: "BK-50019", voyageId: "VY-9005", passenger: "Marco Villanueva", seats: 2, total: 6800, status: "Issued", bookedAt: "2026-05-18 07:22", vehicle: "Truck" },
  { id: "BK-50020", voyageId: "VY-9003", passenger: "Liza Aquino", seats: 1, total: 900, status: "Refunded", bookedAt: "2026-05-16 18:05", vehicle: "None" },
  { id: "BK-50021", voyageId: "VY-9002", passenger: "Noel Bautista", seats: 2, total: 3800, status: "Issued", bookedAt: "2026-05-18 08:14", vehicle: "Car" },
];

export function getStats() {
  const paid = bookings.filter(b => b.status === "Issued");
  const revenue = paid.reduce((s, b) => s + b.total, 0);
  const ticketsIssued = paid.reduce((s, b) => s + b.seats, 0);
  const cancellations = bookings.filter(b => b.status === "Cancelled" || b.status === "Refunded").length;
  const vehicleBookings = bookings.filter(b => b.vehicle && b.vehicle !== "None" && b.status !== "Cancelled" && b.status !== "Refunded").length;
  return { revenue, ticketsIssued, cancellations, vehicleBookings, totalBookings: bookings.length };
}
