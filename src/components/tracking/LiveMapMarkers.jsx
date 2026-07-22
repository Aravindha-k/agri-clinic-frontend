import { memo, useMemo } from "react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import MapEmployeeMarkerPane, {
  EMPLOYEE_MARKER_PANE,
} from "../map/MapEmployeeMarkerPane";
import LiveEmployeeMapPopup from "../map/LiveEmployeeMapPopup";
import { empName } from "../../utils/trackingDisplay";
import {
  canonicalGpsLabel,
  resolveCanonicalGpsStatusKey,
  canonicalDutyLabel,
  getDutyStatusColor,
  isOnDutyWorking,
  dedupeLiveEmployees,
} from "../../utils/dutyTracking";
import {
  getLiveEmployeeLocationLabel,
  getLiveGpsRecordedAt,
  formatLiveRelativeTime,
  buildLiveMarkerAriaLabel,
  resolveLiveLocationDisplay,
} from "../../utils/liveEmployeeMarkerMeta";
import { spreadStackedEmployeeMarkers } from "../../utils/liveMapCamera";
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
 */
const createColoredIcon = (color, { pulse = false, muted = false, selected = false } = {}) => {
  const opacity = muted ? MUTED_MARKER_OPACITY : 1;
  const fill = muted ? markerColors.slate : color;
  const stroke = "#ffffff";
  const selectedClass = selected ? " live-employee-marker--selected" : "";
  const scale = selected ? 1.1 : 1;
  const w = Math.round(40 * scale);
  const h = Math.round(48 * scale);

  return L.divIcon({
    className: "live-employee-marker-icon leaflet-interactive",
    html: `
      <div class="live-employee-marker${selectedClass}" style="opacity:${opacity};">
        <span class="live-employee-marker__hit" aria-hidden="true"></span>
        ${
          pulse
            ? `<span class="live-employee-marker__pulse" style="background:${color};" aria-hidden="true"></span>`
            : ""
        }
        ${
          selected
            ? `<span class="live-employee-marker__ring" aria-hidden="true"></span>`
            : ""
        }
        <svg class="live-employee-marker__pin" width="${w}" height="${h}" viewBox="0 0 40 48" aria-hidden="true" focusable="false">
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
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 4],
    tooltipAnchor: [0, -36],
  });
};

const iconCache = new Map();

function getMarkerIcon(emp, selected = false) {
  const gps = resolveCanonicalGpsStatusKey(emp);
  const colorKey = getDutyStatusColor(emp);
  const muted = gps === "gps_stale" || gps === "gps_offline";
  const pulse = colorKey === "green" && gps === "gps_active" && !selected;
  const cacheKey = `${colorKey}-${pulse}-${muted}-${selected ? "sel" : "base"}-v4`;
  if (!iconCache.has(cacheKey)) {
    iconCache.set(
      cacheKey,
      createColoredIcon(markerColors[colorKey] ?? markerColors.gray, { pulse, muted, selected })
    );
  }
  return iconCache.get(cacheKey);
}

function LiveEmployeeCompactTooltip({ name, code, locationLabel, gpsLabel, relativeTime }) {
  return (
    <div className="live-employee-tooltip-compact">
      <p className="live-employee-tooltip-compact__name">{name}</p>
      {code ? <p className="live-employee-tooltip-compact__code">{code}</p> : null}
      <p className="live-employee-tooltip-compact__location">{locationLabel}</p>
      <p className="live-employee-tooltip-compact__meta">
        GPS {gpsLabel}
        {relativeTime ? ` · ${relativeTime}` : ""}
      </p>
    </div>
  );
}

/**
 * One latest-location marker per active employee — icon only; tooltip on hover; popup on click.
 */
function LiveMapMarkers({ employees, selectedUserId = null, onSelect, onViewEmployee }) {
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

  const markerEntries = useMemo(
    () => spreadStackedEmployeeMarkers(mappable),
    [mappable]
  );

  if (!markerEntries.length) return null;

  return (
    <>
      <MapEmployeeMarkerPane />
      {markerEntries.map(({ emp, lat, lng, stacked, stackSize }) => {
        const userId = emp.user_id ?? emp.id;
        const name = empName(emp);
        const code = emp.employee_code ?? emp.employee_id ?? null;
        const gpsKey = resolveCanonicalGpsStatusKey(emp);
        const gpsLabel = canonicalGpsLabel(emp);
        const dutyLabel = canonicalDutyLabel(emp);
        const locationLabel =
          getLiveEmployeeLocationLabel(emp) ||
          resolveLiveLocationDisplay(emp, lat, lng).title;
        const recordedAt = getLiveGpsRecordedAt(emp);
        const relativeTime = formatLiveRelativeTime(recordedAt);
        const ariaLabel = buildLiveMarkerAriaLabel({
          name,
          code,
          dutyLabel: null,
          gpsLabel,
          relative: relativeTime,
        });
        const isSelected = selectedUserId != null && String(selectedUserId) === String(userId);
        const routeHref =
          userId != null ? `/tracking/routes?userId=${encodeURIComponent(String(userId))}` : null;
        const markerKey = stacked ? `${userId}-stack-${lat.toFixed(5)}` : String(userId);

        return (
          <Marker
            key={markerKey}
            position={[lat, lng]}
            icon={getMarkerIcon(emp, isSelected)}
            pane={EMPLOYEE_MARKER_PANE}
            alt={ariaLabel}
            interactive={true}
            bubblingMouseEvents={false}
            zIndexOffset={isSelected ? 400 : gpsKey === "gps_active" ? 200 : 100}
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
              interactive={false}
              className="live-employee-tooltip live-employee-tooltip--compact"
            >
              <LiveEmployeeCompactTooltip
                name={name}
                code={code}
                locationLabel={
                  stacked && stackSize > 1
                    ? `${locationLabel} (${stackSize} at this spot)`
                    : locationLabel
                }
                gpsLabel={gpsLabel}
                relativeTime={relativeTime}
              />
            </Tooltip>
            <Popup
              className="live-employee-popup-pane"
              maxWidth={320}
              minWidth={220}
              autoPan
              autoPanPadding={[80, 100]}
              closeButton
            >
              <LiveEmployeeMapPopup
                name={name}
                code={code}
                emp={emp}
                dutyLabel={dutyLabel}
                gpsLabel={gpsLabel}
                gpsKey={gpsKey}
                lastKnownNote={gpsKey === "gps_offline" || gpsKey === "gps_stale"}
                onViewEmployee={
                  typeof onViewEmployee === "function"
                    ? () => onViewEmployee(emp)
                    : undefined
                }
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
