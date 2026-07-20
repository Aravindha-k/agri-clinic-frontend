/**
 * Calm status banner overlaid on the always-mounted map.
 */
export default function MapStatusOverlay({
  tone = "info",
  message,
  detail = null,
  action = null,
}) {
  if (!message) return null;

  const toneClass =
    tone === "error"
      ? "admin-map-status--error"
      : tone === "warn"
        ? "admin-map-status--warn"
        : tone === "success"
          ? "admin-map-status--success"
          : "admin-map-status--info";

  return (
    <div className={`admin-map-status ${toneClass}`} role="status">
      <div className="admin-map-status__body">
        <p className="admin-map-status__message">{message}</p>
        {detail ? <p className="admin-map-status__detail">{detail}</p> : null}
        {action ? <div className="admin-map-status__action">{action}</div> : null}
      </div>
    </div>
  );
}
