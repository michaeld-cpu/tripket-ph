import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { bookings, voyages } from "@/lib/mock";

export default function BookingsPage() {
  const voyageById = Object.fromEntries(voyages.map(v => [v.id, v]));
  const totalRevenue = bookings.filter(b => b.status === "Paid").reduce((s, b) => s + b.total, 0);

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle={`${bookings.length} total`}
        right={<button className="btn-primary">+ New booking</button>}
      />

      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Revenue (paid)</div>
          <div className="mt-1 text-2xl font-semibold">₱{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="mt-1 text-2xl font-semibold">{bookings.filter(b => b.status === "Pending").length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Cancelled</div>
          <div className="mt-1 text-2xl font-semibold">{bookings.filter(b => b.status === "Cancelled").length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Refunded</div>
          <div className="mt-1 text-2xl font-semibold">{bookings.filter(b => b.status === "Refunded").length}</div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Booking</th>
              <th className="px-5 py-3 font-medium">Passenger</th>
              <th className="px-5 py-3 font-medium">Voyage</th>
              <th className="px-5 py-3 font-medium">Seats</th>
              <th className="px-5 py-3 font-medium">Vehicle</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Booked</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs text-gray-700">{b.id}</td>
                <td className="px-5 py-3 font-medium">{b.passenger}</td>
                <td className="px-5 py-3 font-mono text-xs text-gray-600">{b.voyageId}</td>
                <td className="px-5 py-3 text-gray-600">{b.seats}</td>
                <td className="px-5 py-3 text-gray-600">{b.vehicle && b.vehicle !== "None" ? b.vehicle : "—"}</td>
                <td className="px-5 py-3">₱{b.total.toLocaleString()}</td>
                <td className="px-5 py-3 text-gray-600">{b.bookedAt}</td>
                <td className="px-5 py-3"><StatusPill status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
