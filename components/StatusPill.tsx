const map: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Scheduled: "bg-blue-100 text-blue-700",
  Boarding: "bg-amber-100 text-amber-700",
  "In Transit": "bg-brand-100 text-brand-700",
  Arrived: "bg-gray-100 text-gray-700",
  Cancelled: "bg-red-100 text-red-700",
  Maintenance: "bg-orange-100 text-orange-700",
  Docked: "bg-gray-100 text-gray-700",
  Issued: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
  Refunded: "bg-red-100 text-red-700",
  Inactive: "bg-gray-100 text-gray-600",
};

export default function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${map[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
}
