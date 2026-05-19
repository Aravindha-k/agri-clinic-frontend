export default function EmptyState({
  icon: Icon,
  title = "No data found",
  subtitle,
  action,
  className = "",
}) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-slate-300" />
        </div>
      )}
      <p className="text-sm text-slate-700 font-semibold">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
