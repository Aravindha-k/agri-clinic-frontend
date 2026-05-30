import { HelpCircle } from "lucide-react";

export default function ReportKpiCard({
  icon: Icon,
  label,
  value,
  description,
  tooltip,
  accent,
  gradient,
  iconBg,
}) {
  const hint = tooltip ?? description;

  return (
    <div
      className="mini-kpi-card group cursor-default"
      style={{ background: gradient, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)" }}
      title={hint}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: accent }}
      />
      <div
        className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-[0.06]"
        style={{ background: accent }}
      />
      <div className="mini-kpi-icon" style={{ background: iconBg, color: accent }}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="mini-kpi-value">{value}</p>
      <div className="mt-1">
        <div className="flex items-center gap-1">
          <p className="mini-kpi-label">{label}</p>
          {hint && (
            <span title={hint} aria-label={hint} className="text-gray-300">
              <HelpCircle className="w-3 h-3" />
            </span>
          )}
        </div>
        {description && (
          <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </div>
  );
}
