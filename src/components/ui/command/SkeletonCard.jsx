export function SkeletonCard({ className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 ${className}`}>
      <div className="skeleton w-11 h-11 rounded-xl mb-4" />
      <div className="skeleton h-8 w-20 mb-2" />
      <div className="skeleton h-4 w-28" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="section-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1 rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-4 border-b border-slate-50 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-4 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="page-loader flex-col gap-4">
      <div className="spinner" />
      <p className="text-sm text-slate-500 font-medium">{label}</p>
    </div>
  );
}
