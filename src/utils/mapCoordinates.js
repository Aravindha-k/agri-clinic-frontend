/**
 * Tamil Nadu map bounds and employee GPS validation for admin live maps.
 */

import L from "leaflet";

export const TAMIL_NADU_CENTER = [11.1271, 78.6569];
export const TAMIL_NADU_ZOOM = 7;

export const TN_LAT_MIN = 8.0;
export const TN_LAT_MAX = 13.8;
export const TN_LNG_MIN = 76.0;
export const TN_LNG_MAX = 80.5;

export const SINGLE_EMPLOYEE_ZOOM = 15;
export const MULTI_EMPLOYEE_MAX_ZOOM = 15;

export function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Valid TN coordinate: finite, non-zero pair, inside Tamil Nadu bounds.
 */
export function isValidTamilNaduCoordinate(lat, lng) {
  const la = parseCoordinate(lat);
  const ln = parseCoordinate(lng);
  if (la == null || ln == null) return false;
  if (la === 0 && ln === 0) return false;
  return (
    la >= TN_LAT_MIN &&
    la <= TN_LAT_MAX &&
    ln >= TN_LNG_MIN &&
    ln <= TN_LNG_MAX
  );
}

function locationFromRow(row) {
  if (!row || typeof row !== "object") return null;

  let lat = parseCoordinate(row.latitude ?? row.lat ?? row.last_latitude);
  let lng = parseCoordinate(row.longitude ?? row.lng ?? row.last_longitude);

  if (row.last_location && typeof row.last_location === "object") {
    lat = lat ?? parseCoordinate(row.last_location.latitude ?? row.last_location.lat);
    lng = lng ?? parseCoordinate(row.last_location.longitude ?? row.last_location.lng);
  }

  if (!isValidTamilNaduCoordinate(lat, lng)) return null;

  const conn = String(row.connection_status ?? row.connection ?? "").toUpperCase();
  const online =
    row.is_online === true || conn === "ONLINE" || (conn === "" && row.is_online !== false);

  return {
    lat,
    lng,
    employeeName:
      row.employee_name ?? row.name ?? row.username ?? row.user_name ?? "Employee",
    phone: row.phone ?? row.mobile ?? null,
    isOnline: online,
    lastSeen: row.last_seen ?? row.last_heartbeat ?? row.last_location_at ?? row.updated_at,
    userId: row.user_id ?? row.id,
    properties: row,
  };
}

function locationFromGeoFeature(feature) {
  if (!feature || typeof feature !== "object") return null;

  const p = feature.properties ?? {};
  let lat = null;
  let lng = null;

  if (Array.isArray(feature.geometry?.coordinates) && feature.geometry.coordinates.length >= 2) {
    lng = parseCoordinate(feature.geometry.coordinates[0]);
    lat = parseCoordinate(feature.geometry.coordinates[1]);
  }

  lat = lat ?? parseCoordinate(p.latitude ?? p.lat ?? p.last_latitude);
  lng = lng ?? parseCoordinate(p.longitude ?? p.lng ?? p.last_longitude);

  if (!isValidTamilNaduCoordinate(lat, lng)) return null;

  const conn = String(p.connection ?? p.connection_status ?? "").toUpperCase();
  const online = p.is_online !== false && (conn === "" || conn === "ONLINE");

  return {
    lat,
    lng,
    employeeName: p.employee_name ?? p.username ?? p.name ?? "Employee",
    phone: p.phone ?? p.mobile ?? null,
    isOnline: online,
    lastSeen: p.last_seen ?? p.last_heartbeat ?? p.last_location_at,
    userId: p.user_id ?? p.id,
    feature,
    properties: p,
  };
}

/**
 * @param {Array<object>} employees - GeoJSON features or flat employee rows
 */
export function getValidEmployeeLocations(employees) {
  if (!Array.isArray(employees)) return [];

  const out = [];
  const seen = new Set();

  for (const item of employees) {
    const loc =
      item?.type === "Feature" || item?.geometry
        ? locationFromGeoFeature(item)
        : locationFromRow(item);
    if (!loc) continue;

    const key = `${loc.userId ?? loc.employeeName}:${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(loc);
  }

  return out;
}

/**
 * Initial MapContainer center/zoom before fitEmployeeBounds runs.
 */
export function getMapCenter(validLocations) {
  if (!validLocations?.length) {
    return { center: [...TAMIL_NADU_CENTER], zoom: TAMIL_NADU_ZOOM };
  }

  if (validLocations.length === 1) {
    const { lat, lng } = validLocations[0];
    return { center: [lat, lng], zoom: SINGLE_EMPLOYEE_ZOOM };
  }

  const lat =
    validLocations.reduce((s, l) => s + l.lat, 0) / validLocations.length;
  const lng =
    validLocations.reduce((s, l) => s + l.lng, 0) / validLocations.length;
  return { center: [lat, lng], zoom: 12 };
}

/**
 * Center/fit map on valid employee GPS; Tamil Nadu fallback when empty.
 */
export function fitEmployeeBounds(map, validLocations) {
  if (!map) return;

  if (!validLocations?.length) {
    map.setView([...TAMIL_NADU_CENTER], TAMIL_NADU_ZOOM, { animate: false });
    return;
  }

  if (validLocations.length === 1) {
    const { lat, lng } = validLocations[0];
    map.flyTo([lat, lng], SINGLE_EMPLOYEE_ZOOM, { duration: 0.85 });
    return;
  }

  const bounds = L.latLngBounds(
    validLocations.map((loc) => [loc.lat, loc.lng])
  );
  map.fitBounds(bounds, {
    padding: [40, 40],
    maxZoom: MULTI_EMPLOYEE_MAX_ZOOM,
    animate: true,
    duration: 0.85,
  });
}

export function filterGeoFeaturesInTamilNadu(features) {
  if (!Array.isArray(features)) return [];
  return features.filter((f) => {
    if (!f?.geometry?.coordinates || f.geometry.coordinates.length < 2) return false;
    const lng = f.geometry.coordinates[0];
    const lat = f.geometry.coordinates[1];
    return isValidTamilNaduCoordinate(lat, lng);
  });
}
