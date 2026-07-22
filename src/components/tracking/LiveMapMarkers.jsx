import { memo, useMemo } from "react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import LiveEmployeeMapPopup from "../map/LiveEmployeeMapPopup";
import { empName } from "../../utils/trackingDisplay";
import {
  canonicalGpsLabel,
  canonicalDutyLabel,
  resolveCanonicalGpsStatusKey,
  getDutyStatusColor,
  isOnDutyWorking,
  dedupeLiveEmployees,
} from "../../utils/dutyTracking";
import {
  getLiveEmployeeLocationLabel,
  getLiveGpsRecordedAt,
  formatLiveRelativeTime,
  liveGpsStatusToneClass,
  buildLiveMarkerAriaLabel,
} from "../../utils/liveEmployeeMarkerMeta";
import { BRAND } from "../../theme/brand";
import "../../utils/leafletSetup";

const markerColors = {
  green: BRAND.primaryLight,
  orange: "#f97316",
  red: BRAND.danger,
  gray: "#9ca3af",
  slate: "#6b7280",
};

const createColoredIcon = (color, pulse = false, muted = false) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;opacity:${muted ? "0.72" : "1"};">
        ${pulse ? `<div style="position:absolute;width:30px;height:30px;border-radius:50%;background:${color};opacity:0.22;animation:tracking-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
        <div style="
          width:18px;height:18px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${color};
          border:2.5px solid #fff;
          box-shadow:0 0 0 1px rgba(15,23,42,0.3),0 3px 10px rgba(0,0,0,0.4);
          position:relative;z-index:1;
          filter:${muted ? "grayscale(0.35)" : "none"};
        "></div>
        <div style="
          position:absolute;bottom:6px;left:50%;transform:translateX(-50%);
          width:6px;height:6px;border-radius:50%;background:#fff;opacity:0.9;z-index:2;
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 30],
  });

const iconCache = new Map();

function getMarkerIcon(emp) {
  const gps = resolveCanonicalGpsStatusKey(emp);
  const colorKey = getDutyStatusColor(emp);
  const muted = gps === "gps_stale" || gps === "gps_offline";
  const pulse = colorKey === "green" && gps === "gps_active";
  const cacheKey = `${colorKey}-${pulse}-${muted}`;
  if (!iconCache.has(cacheKey)) {
    iconCache.set(
      cacheKey,
      createColoredIcon(markerColors[colorKey] ?? markerColors.gray, pulse, muted)
    );
  }
  return iconCache.get(cacheKey);
}

/**
 * Compact hover tooltip — no reverse geocode, stored labels only.
 */
function LiveEmployeeTooltipContent({ name, code, locationLabel, relativeTime, gpsLabel, gpsKey }) {
  const gpsTone = liveGpsStatusToneClass(gpsKey);
  return (
    <div className="live-marker-tooltip">
      <strong className="live-marker-tooltip__name">{name}</strong>
      {code ? <span className="live-marker-tooltip__code">{code}</span> : null}
      <span className="live-marker-tooltip__location">{locationLabel}</span>
      {relativeTime ? (
        <span className="live-marker-tooltip__time">Last updated {relativeTime}</span>
      ) : null}
      {gpsLabel ? (
        <span className={`live-marker-tooltip__gps ${gpsTone}`}>{gpsLabel}</span>
      ) : null}
    </div>
  );
}

/**
 * One latest-location marker per active employee.
 * Offline/Stale keep last known coords; no fake markers when never located.
 * Hover → tooltip; click/tap → rich popup. Updates move the same marker.
 */
function LiveMapMarkers({ employees, onSelect }) {
  const mappable = useMemo(() => {
    const active = dedupeLiveEmployees(employees).filter(isOnDutyWorking);
    return active.filter(
      (emp) =>
        emp.latitude != null &&
        emp.longitude != null &&
        Number.isFinite(Number(emp.latitude)) &&
        Number.isFinite(Number(emp.longitude))
    );
  }, [employees]);

  if (!mappable.length) return null;

  return (
    <>
      {mappable.map((emp) => {
        const userId = emp.user_id ?? emp.id;
        const lat = Number(emp.latitude);
        const lng = Number(emp.longitude);
        const name = empName(emp);
        const code = emp.employee_code ?? emp.employee_id ?? null;
        const gpsKey = resolveCanonicalGpsStatusKey(emp);
        const gpsLabel = canonicalGpsLabel(emp);
        const dutyLabel = canonicalDutyLabel(emp);
        const locationLabel = getLiveEmployeeLocationLabel(emp);
        const recordedAt = getLiveGpsRecordedAt(emp);
        const relativeTime = formatLiveRelativeTime(recordedAt);
        const ariaLabel = buildLiveMarkerAriaLabel({
          name,
          code,
          gpsLabel,
          relative: relativeTime,
        });
        const lastKnownNote = gpsKey === "gps_offline" || gpsKey === "gps_stale";

        return (
          <Marker
            key={String(userId)}
            position={[lat, lng]}
            icon={getMarkerIcon(emp)}
            title={ariaLabel}
            alt={ariaLabel}
            eventHandlers={{
              click: () => onSelect?.(emp),
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -12]}
              opacity={1}
              sticky={false}
              className="live-marker-tooltip-pane"
            >
              <LiveEmployeeTooltipContent
                name={name}
                code={code}
                locationLabel={locationLabel}
                relativeTime={relativeTime}
                gpsLabel={gpsLabel}
                gpsKey={gpsKey}
              />
            </Tooltip>
            <Popup>
              <LiveEmployeeMapPopup
                name={name}
                code={code}
                emp={emp}
                dutyLabel={dutyLabel}
                gpsLabel={gpsLabel}
                gpsKey={gpsKey}
                lastKnownNote={lastKnownNote}
              />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default memo(LiveMapMarkers);
