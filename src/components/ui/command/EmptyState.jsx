export default function EmptyState({
  icon: Icon,
  title = "No data found",
  subtitle,
  action,
  className = "",
}) {
  return (
    <div className={`empty-state empty-state--premium ${className}`}>
      {Icon && (
        <div className="empty-state__icon-wrap">
          <Icon className="empty-state__icon" aria-hidden="true" />
        </div>
      )}
      <p className="empty-state__title">{title}</p>
      {subtitle && <p className="empty-state__subtitle">{subtitle}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
