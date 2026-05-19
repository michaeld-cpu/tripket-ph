type SkeletonProps = { className?: string; style?: React.CSSProperties };

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} style={style} />;
}

export function KPICardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

export function ChartCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <div className="flex h-56 w-12 flex-col-reverse justify-between pb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-2 w-10" />
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 bottom-6 flex flex-col-reverse justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-t border-dashed border-gray-100" />
            ))}
          </div>
          <div className="relative flex h-56 items-end justify-between gap-3 pb-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="w-8 rounded-t-sm" style={{ height: `${30 + Math.random() * 60}%` } as React.CSSProperties} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="flex gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DepartureBoardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-5 rounded-xl border border-gray-200 bg-white px-5 py-3">
            <div className="w-32 shrink-0 space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="w-36 shrink-0 space-y-2">
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="w-48 shrink-0 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
