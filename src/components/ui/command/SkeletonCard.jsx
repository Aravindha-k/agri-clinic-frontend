export function SkeletonText({ width = "60%", height = "0.75rem", className = "" }) {
  return (
    <div
      className={`skeleton rounded ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonAvatar({ size = "2.5rem", className = "" }) {
  return (
    <div
      className={`skeleton rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ cols = 4, className = "" }) {
  return (
    <div className={`flex gap-3 px-3 py-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: cols }).map((_, c) => (
        <div key={c} className="skeleton h-3.5 flex-1 rounded" />
      ))}
    </div>
  );
}

export function SkeletonKpi({ className = "" }) {
  return (
    <div className={`premium-kpi premium-kpi--loading ${className}`} aria-hidden="true">
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

export function SkeletonHero({ className = "" }) {
  return (
    <div className={`section-card p-4 sm:p-5 flex items-start gap-4 ${className}`} aria-hidden="true">
      <div className="skeleton w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="skeleton h-5 w-48 rounded" />
        <div className="skeleton h-3.5 w-64 rounded" />
        <div className="skeleton h-6 w-40 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonMap({ height = "300px", className = "" }) {
  return (
    <div
      className={`section-card ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <div className="skeleton w-full h-full rounded-2xl" />
    </div>
  );
}

/** Inline spinner for compact contexts (buttons, chips). */
export function InlineSpinner({ className = "" }) {
  return (
    <span
      className={`inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Spinner sized for inside buttons — keeps layout stable. */
export function ButtonSpinner({ className = "" }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

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
