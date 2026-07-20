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
    <div className="reports-bi-bar" title={hint}>
      <div className="reports-bi-bar__head">
        <div className="reports-bi-bar__label">
          <span className="truncate">{label}</span>
          {hint && (
            <span className="flex-shrink-0 text-slate-300" title={hint} aria-label={hint}>
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="reports-bi-bar__stats">
          <p className="reports-bi-bar__count">{cfg.count(safeCount)}</p>
          <p className="reports-bi-bar__share">{cfg.share(pct)}</p>
        </div>
      </div>
      <div className="reports-bi-bar__track">
        <div
          className="reports-bi-bar__fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
          }}
        />
      </div>
    </div>
  );
}
