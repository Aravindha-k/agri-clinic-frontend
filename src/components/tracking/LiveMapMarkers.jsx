import { memo, useMemo } from "react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import { Clock3, MapPin } from "lucide-react";
import L from "leaflet";
import LiveEmployeeMapPopup from "../map/LiveEmployeeMapPopup";
import ProfileAvatar from "../ui/ProfileAvatar";
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
  formatLiveExactIstCompact,
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

function dutyChipClass(dutyLabel) {
  const key = String(dutyLabel || "").toLowerCase();
  if (key.includes("working") || key.includes("on duty")) return "live-employee-chip--duty-working";
  if (key.includes("stopped") || key.includes("ended")) return "live-employee-chip--duty-muted";
  return "live-employee-chip--duty-muted";
}

function gpsChipClass(gpsKey) {
  switch (gpsKey) {
    case "gps_active":
      return "live-employee-chip--gps-online";
    case "gps_stale":
      return "live-employee-chip--gps-stale";
    case "gps_offline":
      return "live-employee-chip--gps-offline";
    default:
      return "live-employee-chip--gps-none";
  }
}

/**
 * Premium hover card — compact identity, chips, location, time.
 * No reverse geocode; no native browser title tooltip.
 */
function LiveEmployeeTooltipCard({
  emp,
  name,
  code,
  dutyLabel,
  gpsLabel,
  gpsKey,
  locationLabel,
  relativeTime,
  exactTime,
}) {
  return (
    <div className="live-employee-tooltip-card">
      <div className="live-employee-tooltip-card__accent" aria-hidden="true" />
      <div className="live-employee-tooltip-card__head">
        <ProfileAvatar entity={emp} name={name} size="md" variant="neutral" />
        <div className="live-employee-tooltip-card__identity min-w-0">
          <p className="live-employee-tooltip-card__name">{name}</p>
          {code ? <p className="live-employee-tooltip-card__code">{code}</p> : null}
        </div>
      </div>

      <div className="live-employee-tooltip-card__chips">
        {dutyLabel ? (
          <span className={`live-employee-chip ${dutyChipClass(dutyLabel)}`}>
            {String(dutyLabel).toUpperCase()}
          </span>
        ) : null}
        {gpsLabel ? (
          <span className={`live-employee-chip ${gpsChipClass(gpsKey)}`}>
            GPS {String(gpsLabel).toUpperCase()}
          </span>
        ) : null}
      </div>

      <div className="live-employee-tooltip-card__section">
        <div className="live-employee-tooltip-card__section-label">
          <MapPin className="live-employee-tooltip-card__icon" aria-hidden="true" />
          Last known location
        </div>
        <p className="live-employee-tooltip-card__section-value">{locationLabel}</p>
      </div>

      {(relativeTime || exactTime) && (
        <div className="live-employee-tooltip-card__section">
          <div className="live-employee-tooltip-card__section-label">
            <Clock3 className="live-employee-tooltip-card__icon" aria-hidden="true" />
            Last updated
          </div>
          {relativeTime ? (
            <p className="live-employee-tooltip-card__section-value">{relativeTime}</p>
          ) : null}
          {exactTime ? (
            <p className="live-employee-tooltip-card__section-meta">{exactTime}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * One latest-location marker per active employee.
 * Hover → premium card tooltip; click/tap → detailed popup.
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
        const exactTime = formatLiveExactIstCompact(recordedAt);
        const ariaLabel = buildLiveMarkerAriaLabel({
          name,
          code,
          dutyLabel,
          gpsLabel,
          relative: relativeTime,
        });
        const lastKnownNote = gpsKey === "gps_offline" || gpsKey === "gps_stale";
        const routeHref = `/tracking/routes?userId=${encodeURIComponent(String(userId))}`;

        return (
          <Marker
            key={String(userId)}
            position={[lat, lng]}
            icon={getMarkerIcon(emp)}
            alt={ariaLabel}
            eventHandlers={{
              click: () => onSelect?.(emp),
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -14]}
              opacity={1}
              permanent={false}
              sticky={false}
              className="live-employee-tooltip"
            >
              <LiveEmployeeTooltipCard
                emp={emp}
                name={name}
                code={code}
                dutyLabel={dutyLabel}
                gpsLabel={gpsLabel}
                gpsKey={gpsKey}
                locationLabel={locationLabel}
                relativeTime={relativeTime}
                exactTime={exactTime}
              />
            </Tooltip>
            <Popup className="live-employee-popup-pane">
              <LiveEmployeeMapPopup
                name={name}
                code={code}
                emp={emp}
                dutyLabel={dutyLabel}
                gpsLabel={gpsLabel}
                gpsKey={gpsKey}
                lastKnownNote={lastKnownNote}
                onViewEmployee={() => onSelect?.(emp)}
                routeHref={routeHref}
              />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default memo(LiveMapMarkers);
