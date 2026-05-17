export default function PageHeader({ title, subtitle, badge, actions, className = "" }) {
  return (
    <div className={`page-header ${className}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">{actions}</div>
      )}
    </div>
  );
}
