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
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-slate-300" />
        </div>
      )}
      <p className="text-slate-700 font-semibold">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
