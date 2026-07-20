import { SkeletonChartBlock } from "./DashboardSkeleton";

/** Branded fallback for lazy dashboard widgets */
export default function WidgetSuspenseFallback({ label = "Loading…", height = 300 }) {
  return (
    <div className="relative">
      <SkeletonChartBlock height={height} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs font-semibold text-slate-400 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-100">
          {label}
        </span>
      </div>
    </div>
  );
}
