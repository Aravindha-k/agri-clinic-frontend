export default function ChartCard({
  icon: Icon,
  title,
  subtitle,
  right,
  children,
  height,
  className = "",
}) {
  return (
    <div className={`section-card ${className}`}>
      <div className="section-card-header">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="icon-box">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="section-title">{title}</h3>
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="px-4 py-4" style={height ? { height } : undefined}>
        {children}
      </div>
    </div>
  );
}
