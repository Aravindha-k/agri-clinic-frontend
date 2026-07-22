import { memo, useMemo } from "react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import { Clock3, MapPin } from "lucide-react";
import L from "leaflet";
import LiveEmployeeMapPopup from "../map/LiveEmployeeMapPopup";
import MapEmployeeMarkerPane, {
  EMPLOYEE_MARKER_PANE,
} from "../map/MapEmployeeMarkerPane";
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

/** Offline/stale markers stay clearly visible (never fade out on zoom). */
const MUTED_MARKER_OPACITY = 0.9;

const markerColors = {
  green: BRAND.primaryLight,
  orange: "#f97316",
  red: BRAND.danger,
  gray: "#9ca3af",
  slate: "#64748b",
};

/**
 * DivIcon pin without nested CSS transforms.
 * Leaflet positions markers with CSS transforms; a rotated child pin was causing
 * markers to vanish at some zoom levels during Leaflet zoom animations.
 */
const createColoredIcon = (color, pulse = false, muted = false) => {
  const opacity = muted ? MUTED_MARKER_OPACITY : 1;
  const fill = muted ? markerColors.slate : color;
  const stroke = "#ffffff";

  return L.divIcon({
    className: "live-employee-marker-icon leaflet-interactive",
    html: `
      <div class="live-employee-marker" style="opacity:${opacity};">
        <span class="live-employee-marker__hit" aria-hidden="true"></span>
        ${
          pulse
            ? `<span class="live-employee-marker__pulse" style="background:${color};" aria-hidden="true"></span>`
            : ""
        }
        <svg class="live-employee-marker__pin" width="40" height="48" viewBox="0 0 40 48" aria-hidden="true" focusable="false">
          <path
            d="M20 46C20 46 6 30.5 6 18.5C6 10.5 12.3 4 20 4C27.7 4 34 10.5 34 18.5C34 30.5 20 46 20 46Z"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="2.5"
          />
          <circle cx="20" cy="18.5" r="5" fill="${stroke}" opacity="0.95" />
        </svg>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 44],
    popupAnchor: [0, -42],
    tooltipAnchor: [0, -40],
  });
};

const iconCache = new Map();

function getMarkerIcon(emp) {
  const gps = resolveCanonicalGpsStatusKey(emp);
  const colorKey = getDutyStatusColor(emp);
  const muted = gps === "gps_stale" || gps === "gps_offline";
  const pulse = colorKey === "green" && gps === "gps_active";
  const cacheKey = `${colorKey}-${pulse}-${muted}-v3`;
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
 * One latest-location marker per active employee — always mounted at every zoom.
 * Visibility depends only on active duty + valid coords (not zoom/bounds/GPS health).
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
      <MapEmployeeMarkerPane />
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
            pane={EMPLOYEE_MARKER_PANE}
            alt={ariaLabel}
            interactive={true}
            bubblingMouseEvents={false}
            zIndexOffset={gpsKey === "gps_active" ? 200 : 100}
          >
            <Tooltip
              direction="top"
              offset={[0, -18]}
              opacity={1}
              permanent={false}
              sticky={false}
              interactive={true}
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
            <Popup className="live-employee-popup-pane" autoPan={true}>
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
