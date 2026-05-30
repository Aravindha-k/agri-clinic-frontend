export function SkeletonKpiCard() {
  return (
    <div className="mini-kpi-card">
      <div className="skeleton w-9 h-9 rounded-lg mb-3" />
      <div className="skeleton h-7 w-16 mb-2" />
      <div className="skeleton h-3 w-24" />
    </div>
  );
}

export function SkeletonChartBlock({ height = 280 }) {
  return (
    <div className="section-card overflow-hidden p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="space-y-1.5 flex-1">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-48" />
        </div>
      </div>
      <div className="skeleton rounded-xl w-full" style={{ height }} />
    </div>
  );
}

export function SkeletonActivityFeed() {
  return (
    <div className="section-card overflow-hidden p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="skeleton h-4 w-36" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 pl-2">
          <div className="skeleton w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0" />
          <div className="flex-1 space-y-2 pb-3 border-l border-gray-100 pl-4">
            <div className="skeleton h-3.5 w-40" />
            <div className="skeleton h-3 w-full max-w-xs" />
            <div className="skeleton h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="page-container space-y-3 animate-pulse-soft">
      <div className="space-y-2 mb-1">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-4 w-72 max-w-full" />
      </div>

      <div className="kpi-grid">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonKpiCard key={i} />
        ))}
      </div>

      <div className="skeleton h-28 rounded-2xl w-full" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>

      <div className="skeleton h-32 rounded-2xl w-full" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SkeletonActivityFeed />
        <SkeletonActivityFeed />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <SkeletonChartBlock height={280} />
        </div>
        <SkeletonActivityFeed />
      </div>

      <SkeletonChartBlock height={300} />
    </div>
  );
}
