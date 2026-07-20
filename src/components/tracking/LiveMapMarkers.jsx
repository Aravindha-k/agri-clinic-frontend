import { memo, useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import { empName } from "../../utils/trackingDisplay";
import {
  canonicalGpsLabel,
  canonicalDutyLabel,
  dutyMovementLabel,
  resolveCanonicalGpsStatusKey,
  resolveCanonicalDutyStatusKey,
  getDutyStatusColor,
  formatLastGpsUpdate,
  isGpsActiveStatus,
} from "../../utils/dutyTracking";
import { BRAND } from "../../theme/brand";

const markerColors = {
  green: BRAND.primaryLight,
  orange: "#f97316",
  red: BRAND.danger,
  gray: "#9ca3af",
  slate: "#6b7280",
};

const createColoredIcon = (color, pulse = false) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        ${pulse ? `<div style="position:absolute;width:30px;height:30px;border-radius:50%;background:${color};opacity:0.22;animation:tracking-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
        <div style="
          width:18px;height:18px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${color};
          border:2.5px solid #fff;
          box-shadow:0 0 0 1px rgba(15,23,42,0.3),0 3px 10px rgba(0,0,0,0.4);
          position:relative;z-index:1;
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
  const colorKey = getDutyStatusColor(emp);
  const pulse = colorKey === "green";
  const cacheKey = `${colorKey}-${pulse}`;
  if (!iconCache.has(cacheKey)) {
    iconCache.set(cacheKey, createColoredIcon(markerColors[colorKey] ?? markerColors.gray, pulse));
  }
  return iconCache.get(cacheKey);
}

/**
 * Memoized live markers — updates positions without remounting MapContainer.
 */
function LiveMapMarkers({ employees, onSelect }) {
  const mappable = useMemo(
    () =>
      employees.filter(
        (emp) =>
          emp.is_on_duty &&
          emp.latitude != null &&
          emp.longitude != null &&
          Number.isFinite(Number(emp.latitude)) &&
          Number.isFinite(Number(emp.longitude))
      ),
    [employees]
  );

  if (!mappable.length) return null;

  return (
    <MarkerClusterGroup chunkedLoading maxClusterRadius={50} spiderfyOnMaxZoom showCoverageOnHover={false}>
      {mappable.map((emp) => {
        const userId = emp.user_id ?? emp.id;
        const lat = Number(emp.latitude);
        const lng = Number(emp.longitude);

        return (
          <Marker
            key={userId}
            position={[lat, lng]}
            icon={getMarkerIcon(emp)}
            eventHandlers={{ click: () => onSelect?.(emp) }}
          >
            <Popup>
              <EmployeeMapPopup
                name={empName(emp)}
                lat={lat}
                lng={lng}
                entity={emp}
                statusLabel={canonicalGpsLabel(emp)}
                statusOnline={isGpsActiveStatus(emp)}
                workStatus={canonicalDutyLabel(emp)}
                movementStatus={dutyMovementLabel(emp)}
                lastUpdated={formatLastGpsUpdate(emp)}
              >
                {emp.employee_id ? (
                  <p className="text-[10px] text-gray-500">
                    ID: <span className="font-medium text-gray-700">{emp.employee_id}</span>
                  </p>
                ) : null}
                {emp.battery_level != null ? (
                  <p className="text-[10px] text-gray-500">
                    Battery: <span className="font-medium text-gray-700">{emp.battery_level}%</span>
                  </p>
                ) : null}
                {emp.accuracy != null ? (
                  <p className="text-[10px] text-gray-500">
                    Accuracy: <span className="font-medium text-gray-700">{Math.round(emp.accuracy)} m</span>
                  </p>
                ) : null}
                {emp.speed != null ? (
                  <p className="text-[10px] text-gray-500">
                    Speed: <span className="font-medium text-gray-700">{Number(emp.speed).toFixed(1)} km/h</span>
                  </p>
                ) : null}
              </EmployeeMapPopup>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}

export default memo(LiveMapMarkers);
