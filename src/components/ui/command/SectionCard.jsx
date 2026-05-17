export default function SectionCard({
  icon: Icon,
  title,
  subtitle,
  right,
  children,
  className = "",
  bodyClassName = "",
  noPadding = false,
}) {
  return (
    <div className={`section-card ${className}`}>
      {(title || right) && (
        <div className="section-card-header">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="icon-box">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className="section-title">{title}</h3>}
              {subtitle && <p className="section-subtitle">{subtitle}</p>}
            </div>
          </div>
          {right}
        </div>
      )}
      <div className={noPadding ? bodyClassName : `px-5 py-5 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
