import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { voyages, vessels, routes } from "@/lib/mock";

export default function VoyagesPage() {
  const vesselById = Object.fromEntries(vessels.map(v => [v.id, v]));
  const routeById = Object.fromEntries(routes.map(r => [r.id, r]));

  return (
    <div>
      <PageHeader
        title="Voyages"
        subtitle={`${voyages.length} scheduled`}
        right={<button className="btn-primary">+ Schedule voyage</button>}
      />
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Voyage</th>
              <th className="px-5 py-3 font-medium">Vessel</th>
              <th className="px-5 py-3 font-medium">Route</th>
              <th className="px-5 py-3 font-medium">Departure</th>
              <th className="px-5 py-3 font-medium">Arrival</th>
              <th className="px-5 py-3 font-medium">Load</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {voyages.map(v => {
              const ves = vesselById[v.vesselId];
              const r = routeById[v.routeId];
              const load = Math.round((v.seatsBooked / v.seatsTotal) * 100);
              return (
                <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{v.id}</td>
                  <td className="px-5 py-3">{ves?.name}</td>
                  <td className="px-5 py-3 text-gray-600">{r?.origin} → {r?.destination}</td>
                  <td className="px-5 py-3 text-gray-600">{v.departure}</td>
                  <td className="px-5 py-3 text-gray-600">{v.arrival}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${load}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{v.seatsBooked}/{v.seatsTotal}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><StatusPill status={v.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
