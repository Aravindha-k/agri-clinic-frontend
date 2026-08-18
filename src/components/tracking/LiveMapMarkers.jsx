import { memo, useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
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
  isNoLocationYet,
} from "../../utils/dutyTracking";
import { buildLiveMarkerAriaLabel } from "../../utils/liveEmployeeMarkerMeta";
import { spreadStackedEmployeeMarkers } from "../../utils/liveMapCamera";
import { BRAND } from "../../theme/brand";
import "../../utils/leafletSetup";

/** Offline/stale markers stay clearly visible (never fade out on zoom). */
const MUTED_MARKER_OPACITY = 0.85;

/** Max label width — long names truncate with ellipsis. */
const MARKER_LABEL_MAX_PX = 160;
const MARKER_PIN_W = 40;
const MARKER_PIN_H = 48;
const MARKER_LABEL_GAP = 6;

const markerColors = {
  green: BRAND.primaryLight,
  orange: "#f97316",
  red: BRAND.danger,
  gray: "#9ca3af",
  slate: "#64748b",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * DivIcon pin + compact employee-name pill (name only; status stays on pin color).
 */
const createColoredIcon = (
  color,
  displayName,
  { pulse = false, muted = false, selected = false } = {}
) => {
  const opacity = muted ? MUTED_MARKER_OPACITY : 1;
  const fill = muted ? markerColors.slate : color;
  const stroke = "#ffffff";
  const selectedClass = selected ? " live-employee-marker--selected" : "";
  const scale = selected ? 1.1 : 1;
  const w = Math.round(MARKER_PIN_W * scale);
  const h = Math.round(MARKER_PIN_H * scale);
  const safeName = escapeHtml(displayName || "Employee");
  const iconW = w + MARKER_LABEL_GAP + MARKER_LABEL_MAX_PX;

  return L.divIcon({
    className: "live-employee-marker-icon leaflet-interactive",
    html: `
      <div class="live-employee-marker-wrap" style="opacity:${opacity};">
        <div class="live-employee-marker${selectedClass}">
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
        <span class="live-employee-marker__label" title="${safeName}">${safeName}</span>
      </div>
    `,
    iconSize: [iconW, h],
    iconAnchor: [w / 2, h - 4],
    tooltipAnchor: [0, -36],
  });
};

const iconCache = new Map();

function getMarkerIcon(emp, displayName, selected = false) {
  const gps = resolveCanonicalGpsStatusKey(emp);
  const colorKey = getDutyStatusColor(emp);
  const muted = gps === "gps_stale" || gps === "gps_offline";
  const pulse = colorKey === "green" && gps === "gps_active" && !selected;
  const cacheKey = `${colorKey}-${pulse}-${muted}-${selected ? "sel" : "base"}-${displayName}-v5`;
  if (!iconCache.has(cacheKey)) {
    iconCache.set(
      cacheKey,
      createColoredIcon(markerColors[colorKey] ?? markerColors.gray, displayName, {
        pulse,
        muted,
        selected,
      })
    );
  }
  return iconCache.get(cacheKey);
}

/**
 * One latest-location marker per active employee — name pill + pin; popup on click.
 */
function LiveMapMarkers({ employees, selectedUserId = null, onSelect, onViewEmployee }) {
  const mappable = useMemo(() => {
    const active = dedupeLiveEmployees(employees).filter(isOnDutyWorking);
    return active.filter(
      (emp) =>
        !isNoLocationYet(emp) &&
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
      {markerEntries.map(({ emp, lat, lng, stacked }) => {
        const userId = emp.user_id ?? emp.id;
        const name = empName(emp);
        const code = emp.employee_code ?? emp.employee_id ?? null;
        const gpsKey = resolveCanonicalGpsStatusKey(emp);
        const gpsLabel = canonicalGpsLabel(emp);
        const dutyLabel = canonicalDutyLabel(emp);
        const ariaLabel = buildLiveMarkerAriaLabel({ name });
        const isSelected = selectedUserId != null && String(selectedUserId) === String(userId);
        const routeHref =
          userId != null ? `/tracking/routes?userId=${encodeURIComponent(String(userId))}` : null;
        const markerKey = stacked ? `${userId}-stack-${lat.toFixed(5)}` : String(userId);

        return (
          <Marker
            key={markerKey}
            position={[lat, lng]}
            icon={getMarkerIcon(emp, name, isSelected)}
            pane={EMPLOYEE_MARKER_PANE}
            alt={ariaLabel}
            interactive={true}
            bubblingMouseEvents={false}
            zIndexOffset={isSelected ? 400 : gpsKey === "gps_active" ? 200 : 100}
            eventHandlers={{
              click: () => onSelect?.(emp),
            }}
          >
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
