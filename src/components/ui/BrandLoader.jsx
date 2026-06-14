import Logo from "../Logo";

const DEFAULT_LABEL = "Preparing your field operations dashboard…";

/**
 * Kavya Agri Clinic — branded loader (CSS-only animation).
 * @param {"full"|"page"|"inline"|"compact"} variant
 */
export default function BrandLoader({
  variant = "page",
  label = DEFAULT_LABEL,
  showTitle = true,
  showYearsTagline = true,
  className = "",
}) {
  const logoSize =
    variant === "compact" ? "sm" : variant === "inline" ? "md" : "lg";

  return (
    <div
      className={`brand-loader brand-loader--${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label || "Loading"}
    >
      <div className="brand-loader__stage" aria-hidden="true">
        <span className="brand-loader__ring brand-loader__ring--outer" />
        <span className="brand-loader__ring brand-loader__ring--inner" />
        <div className="brand-loader__logo-glass">
          <Logo size={logoSize} variant="login" showShadow={false} />
        </div>
      </div>

      {showTitle && variant !== "compact" && (
        <p className="brand-loader__title">Kavya Agri Clinic</p>
      )}
      {showYearsTagline && variant !== "compact" && (
        <p className="brand-loader__years">29+ years in the field</p>
      )}
      {label ? <p className="brand-loader__label">{label}</p> : null}
    </div>
  );
}

/**
 * Standard page loader — branded logo spinner used across the admin app.
 * @param {boolean} fullScreen - full viewport (auth gate, login)
 * @param {boolean} compact - smaller inline loader (widgets, drawers)
 * @param {boolean} wrap - center in route-fallback container (default for pages)
 */
export function PageLoader({
  label = "Loading…",
  className = "",
  fullScreen = false,
  compact = false,
  wrap = true,
}) {
  const variant = fullScreen ? "full" : compact ? "compact" : "page";
  const loader = (
    <BrandLoader
      variant={variant}
      label={label}
      showTitle={!compact}
      showYearsTagline={!compact}
      className={className}
    />
  );

  if (!wrap || fullScreen) {
    return loader;
  }

  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-busy="true">
      {loader}
    </div>
  );
}
