import { HelpCircle } from "lucide-react";

export default function ReportKpiCard({
  icon: Icon,
  label,
  value,
  description,
  tooltip,
  accent,
  iconBg,
}) {
  const hint = tooltip ?? description;

  return (
    <div className="reports-bi-kpi group" title={hint}>
      <div className="reports-bi-kpi__accent" style={{ background: accent }} aria-hidden="true" />
      <div className="reports-bi-kpi__glow" style={{ background: accent }} aria-hidden="true" />
      <div className="reports-bi-kpi__head">
        <div className="reports-bi-kpi__icon" style={{ background: iconBg, color: accent }}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="reports-bi-kpi__value">{value}</p>
        </div>
      </div>
      <div className="mt-2">
        <div className="reports-bi-kpi__label">
          {label}
          {hint && (
            <span title={hint} aria-label={hint} className="text-slate-300">
              <HelpCircle className="w-3 h-3" aria-hidden="true" />
            </span>
          )}
        </div>
        {description && <p className="reports-bi-kpi__desc">{description}</p>}
      </div>
    </div>
  );
}
