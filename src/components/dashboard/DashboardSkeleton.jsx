export function SkeletonKpiCard() {
  return (
    <div className="premium-kpi premium-kpi--loading" aria-busy="true">
      <div className="premium-kpi__top">
        <div className="premium-kpi__icon-wrap skeleton !rounded-2xl" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
      <div className="premium-kpi__content space-y-2">
        <div className="skeleton h-8 w-16 rounded-lg" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
    </div>
  );
}

export function SkeletonChartBlock({ height = 300 }) {
  return (
    <div className="dashboard-section-card overflow-hidden p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-9 h-9 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-4 w-36" />
          <div className="skeleton h-3 w-52 max-w-full" />
        </div>
        <div className="skeleton h-7 w-20 rounded-lg hidden sm:block" />
      </div>
      <div className="skeleton rounded-xl w-full" style={{ height }} />
    </div>
  );
}

export function SkeletonActivityFeed() {
  return (
    <div className="dashboard-section-card overflow-hidden">
      <div className="section-card-header">
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-48" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 pl-2">
            <div className="skeleton w-2.5 h-2.5 rounded-full mt-3 flex-shrink-0" />
            <div className="flex-1 space-y-2 pb-3 border-l border-slate-100 pl-5">
              <div className="flex items-center gap-2">
                <div className="skeleton w-7 h-7 rounded-lg" />
                <div className="skeleton h-3.5 w-40" />
              </div>
              <div className="skeleton h-3 w-full max-w-xs" />
              <div className="skeleton h-2.5 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="page-container page-container--dashboard">
      <div className="page-header page-header--premium">
        <div className="space-y-2">
          <div className="skeleton h-8 w-44 rounded-lg" />
          <div className="skeleton h-4 w-80 max-w-full rounded" />
        </div>
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>

      <div className="dashboard-bento">
        <div className="dashboard-kpi-row">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>

        <div className="skeleton h-36 rounded-2xl w-full" />

        <div className="skeleton h-40 rounded-2xl w-full" />

        <div className="dashboard-insight-row">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>

        <div className="skeleton h-36 rounded-2xl w-full" />

        <div className="dashboard-ops-row">
          <SkeletonActivityFeed />
          <SkeletonActivityFeed />
        </div>

        <div className="dashboard-main-row">
          <SkeletonChartBlock height={300} />
          <SkeletonActivityFeed />
        </div>

        <SkeletonChartBlock height={320} />

        <SkeletonChartBlock height={240} />
      </div>
    </div>
  );
}
