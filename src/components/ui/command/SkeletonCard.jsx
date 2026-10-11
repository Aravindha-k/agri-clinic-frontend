export function SkeletonCard({ className = "" }) {
  return (
    <div className={`admin-card ${className}`}>
      <div className="admin-card__body gap-2">
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="section-card overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1 rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 px-3 py-2 border-b border-slate-50 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-3.5 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { PageLoader } from "./AgriLoader";
