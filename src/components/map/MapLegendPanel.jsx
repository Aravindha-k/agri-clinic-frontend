/**
 * GPS status legend for live tracking maps.
 */
export function GpsStatusMapLegend() {
  const items = [
    { color: "#22c55e", label: "Fresh" },
    { color: "#f59e0b", label: "Delayed" },
    { color: "#64748b", label: "Lost" },
    { color: "#0ea5e9", label: "No GPS" },
  ];

  return (
    <ul className="admin-map-legend__list">
      {items.map((item) => (
        <li key={item.label} className="admin-map-legend__item">
          <span
            className="admin-map-legend__dot"
            style={{ background: item.color }}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Start / visit / end markers for day maps (no route polyline).
 */
export function RouteEndpointMapLegend() {
  const items = [
    { color: "#3b82f6", label: "Start" },
    { color: "#059669", label: "Visit" },
    { color: "#ef4444", label: "End" },
  ];

  return (
    <ul className="admin-map-legend__list">
      {items.map((item) => (
        <li key={item.label} className="admin-map-legend__item">
          <span
            className="admin-map-legend__dot"
            style={{ background: item.color }}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{ title?: string, children: import('react').ReactNode, className?: string }} props
 */
export default function MapLegendPanel({ title = "Legend", children, className = "" }) {
  return (
    <div className={`admin-map-legend ${className}`.trim()}>
      {title ? <p className="admin-map-legend__title">{title}</p> : null}
      {children}
    </div>
  );
}
