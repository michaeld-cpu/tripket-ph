import PageHeader from "@/components/PageHeader";
import { routes } from "@/lib/mock";

export default function RoutesPage() {
  return (
    <div>
      <PageHeader
        title="Routes"
        subtitle={`${routes.length} total`}
        right={<button className="btn-primary">+ Add route</button>}
      />
      <div className="grid grid-cols-2 gap-4">
        {routes.map(r => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-xs text-gray-500">{r.id}</div>
                <div className="mt-1 text-lg font-semibold">
                  {r.origin} <span className="text-gray-400">→</span> {r.destination}
                </div>
              </div>
              <span className={`pill ${r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {r.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Duration</div>
                <div className="font-medium">{r.durationHrs} hrs</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Distance</div>
                <div className="font-medium">{r.distanceNm} nm</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
