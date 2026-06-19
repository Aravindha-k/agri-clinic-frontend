/**
 * GPS status legend for live tracking maps.
 */
export function GpsStatusMapLegend() {
  const items = [
    { color: "#22c55e", label: "GPS Active" },
    { color: "#f59e0b", label: "GPS Delayed" },
    { color: "#ef4444", label: "GPS Lost" },
    { color: "#64748b", label: "GPS Off" },
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
 * Start / end / current markers for route maps.
 */
export function RouteEndpointMapLegend() {
  const items = [
    { color: "#3b82f6", label: "Start" },
    { color: "#ef4444", label: "End" },
    { color: "#059669", label: "Latest" },
    { color: "#22c55e", label: "Route path", line: true },
  ];

  return (
    <ul className="admin-map-legend__list">
      {items.map((item) => (
        <li key={item.label} className="admin-map-legend__item">
          {item.line ? (
            <span className="admin-map-legend__line" style={{ background: item.color }} />
          ) : (
            <span
              className="admin-map-legend__dot"
              style={{ background: item.color }}
            />
          )}
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
    <div className={`admin-map-legend ${className}`}>
      <p className="admin-map-legend__title">{title}</p>
      {children}
    </div>
  );
}
