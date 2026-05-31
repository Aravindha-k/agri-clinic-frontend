import { HelpCircle } from "lucide-react";
import {
  formatVisitCountLabel,
  formatVisitShareLabel,
  formatFarmerCountLabel,
  formatCoverageShareLabel,
  ANALYTICS_TOOLTIPS,
} from "../../utils/analyticsLabels";

import { CHART_COLORS } from "../../theme/brand";

const VARIANTS = {
  employee: {
    count: formatVisitCountLabel,
    share: formatVisitShareLabel,
    tooltip: ANALYTICS_TOOLTIPS.visitsCompleted,
  },
  coverage: {
    count: formatFarmerCountLabel,
    share: formatCoverageShareLabel,
    tooltip: ANALYTICS_TOOLTIPS.farmerCoverage,
  },
  crop: {
    count: (n) => formatVisitCountLabel(n).replace(" Completed", ""),
    share: formatVisitShareLabel,
    tooltip: ANALYTICS_TOOLTIPS.cropVisits,
  },
};

function pctOf(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

export default function AnalyticsBarRow({
  label,
  count,
  total,
  accent = CHART_COLORS.primary,
  variant = "employee",
  tooltip,
}) {
  const cfg = VARIANTS[variant] ?? VARIANTS.employee;
  const safeCount = Number(count) || 0;
  const safeTotal = Number(total) || 0;
  const pct = pctOf(safeCount, safeTotal);
  const hint = tooltip ?? cfg.tooltip;

  return (
    <div title={hint}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-gray-800 truncate">{label}</span>
          {hint && (
            <span className="flex-shrink-0 text-gray-300" title={hint} aria-label={hint}>
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{cfg.count(safeCount)}</p>
          <p className="text-xs text-gray-500 tabular-nums">{cfg.share(pct)}</p>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
          }}
        />
      </div>
    </div>
  );
}
