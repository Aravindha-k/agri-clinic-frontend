/**
 * Tamil Nadu map bounds and employee GPS validation for admin live maps.
 */

import L from "leaflet";

export const TAMIL_NADU_CENTER = [11.1271, 78.6569];
export const TAMIL_NADU_ZOOM = 7;

/** Strict TN operating region for marker inclusion / Fit all. */
export const TN_LAT_MIN = 8.0;
export const TN_LAT_MAX = 13.8;
export const TN_LNG_MIN = 76.0;
export const TN_LNG_MAX = 80.5;

/** Soft max-bounds margin so border locations stay viewable without wandering to Maldives/Sri Lanka. */
export const TN_VIEW_LAT_MIN = 7.6;
export const TN_VIEW_LAT_MAX = 14.3;
export const TN_VIEW_LNG_MIN = 75.6;
export const TN_VIEW_LNG_MAX = 81.0;

/** Live Tracking: one marker — close framing without street-level zoom. */
export const SINGLE_EMPLOYEE_ZOOM = 12;
/** Live Tracking: multiple markers — do not zoom in past this. */
export const MULTI_EMPLOYEE_MAX_ZOOM = 11;
/** Live Tracking: after fitBounds, do not remain zoomed out past this. */
export const MULTI_EMPLOYEE_MIN_ZOOM = 7;

/** Live Fit all padding / zoom options (header clearance included in top padding). */
export const LIVE_FIT_OPTIONS = {
  closePopup: true,
  singleZoom: SINGLE_EMPLOYEE_ZOOM,
  maxZoom: MULTI_EMPLOYEE_MAX_ZOOM,
  minZoom: MULTI_EMPLOYEE_MIN_ZOOM,
  paddingTopLeft: [48, 100],
  paddingBottomRight: [48, 48],
  animate: true,
};

/** Live fullscreen fit — larger padding for viewport controls. */
export const LIVE_FULLSCREEN_FIT_OPTIONS = {
  closePopup: true,
  singleZoom: SINGLE_EMPLOYEE_ZOOM,
  maxZoom: MULTI_EMPLOYEE_MAX_ZOOM,
  minZoom: MULTI_EMPLOYEE_MIN_ZOOM,
  paddingTopLeft: [80, 100],
  paddingBottomRight: [80, 80],
  animate: true,
};

export function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Finite, non-(0,0), world-valid lat/lng.
 */
export function isValidWorldCoordinate(lat, lng) {
  const la = parseCoordinate(lat);
  const ln = parseCoordinate(lng);
  if (la == null || ln == null) return false;
  if (la === 0 && ln === 0) return false;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return false;
  return true;
}

/**
 * Valid TN coordinate: finite, non-zero pair, inside Tamil Nadu bounds.
 */
export function isValidTamilNaduCoordinate(lat, lng) {
  if (!isValidWorldCoordinate(lat, lng)) return false;
  const la = parseCoordinate(lat);
  const ln = parseCoordinate(lng);
  return (
    la >= TN_LAT_MIN &&
    la <= TN_LAT_MAX &&
    ln >= TN_LNG_MIN &&
    ln <= TN_LNG_MAX
  );
}

/**
 * Soft check for suspicious out-of-region points (still world-valid).
 */
export function isOutOfOperatingRegion(lat, lng) {
  return isValidWorldCoordinate(lat, lng) && !isValidTamilNaduCoordinate(lat, lng);
}

function locationFromRow(row) {
  if (!row || typeof row !== "object") return null;

  let lat = parseCoordinate(row.latitude ?? row.lat ?? row.last_latitude);
  let lng = parseCoordinate(row.longitude ?? row.lng ?? row.last_longitude);

  if (row.last_location && typeof row.last_location === "object") {
    lat = lat ?? parseCoordinate(row.last_location.latitude ?? row.last_location.lat);
    lng = lng ?? parseCoordinate(row.last_location.longitude ?? row.last_location.lng);
  }

  if (!isValidWorldCoordinate(lat, lng)) {
    if (import.meta.env?.DEV && (lat != null || lng != null)) {
      console.warn("[live-map] invalid coordinate excluded from Fit all", { lat, lng, userId: row.user_id ?? row.id });
    }
    return null;
  }

  if (!isValidTamilNaduCoordinate(lat, lng)) {
    if (import.meta.env?.DEV) {
      console.warn("[live-map] out-of-region / suspicious coordinate excluded from Fit all", {
        lat,
        lng,
        userId: row.user_id ?? row.id,
        suspicious: true,
        outOfRegion: true,
      });
    }
    return null;
  }

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
 * Employee locations used for markers / Fit all.
 * Online, Stale, and Offline last-known coords included when inside TN.
 * Never includes TN default centre or invalid 0,0.
 * Out-of-region coords are excluded from Fit all (not replaced with fakes).
 *
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

    const idKey = String(loc.userId ?? "");
    const key = idKey || `${loc.employeeName}:${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(loc);
  }

  return out;
}

/**
 * Soft max bounds for live tracking map (TN + margin).
 * @returns {L.LatLngBounds}
 */
export function getTamilNaduViewMaxBounds() {
  return L.latLngBounds(
    [TN_VIEW_LAT_MIN, TN_VIEW_LNG_MIN],
    [TN_VIEW_LAT_MAX, TN_VIEW_LNG_MAX]
  );
}

/**
 * Apply operating-region max bounds on a live map instance.
 * @param {L.Map} map
 */
export function applyLiveMapOperatingBounds(map) {
  if (!map) return;
  map.setMaxBounds(getTamilNaduViewMaxBounds());
  map.options.maxBoundsViscosity = 0.75;
  if (map.getMinZoom() < 6) {
    map.setMinZoom(6);
  }
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
  return { center: [lat, lng], zoom: 10 };
}

/**
 * Fit camera to employee markers only — never merges Tamil Nadu state bounds.
 * Empty list → TN default view.
 *
 * Defaults preserve Day Map framing; pass LIVE_FIT_OPTIONS for Live Tracking.
 *
 * @param {L.Map} map
 * @param {Array<{lat:number,lng:number}>} validLocations
 * @param {object} [options]
 */
export function fitEmployeeBounds(map, validLocations, options = {}) {
  if (!map) return;

  const closePopup = options.closePopup === true;
  const singleZoom = options.singleZoom ?? 15;
  const maxZoom = options.maxZoom ?? 15;
  const minZoom = options.minZoom ?? null;
  const paddingTopLeft = options.paddingTopLeft ?? [40, 40];
  const paddingBottomRight = options.paddingBottomRight ?? paddingTopLeft;
  const animate = options.animate !== false;

  if (closePopup) {
    try {
      map.closePopup();
    } catch {
      /* ignore */
    }
  }

  const points = (Array.isArray(validLocations) ? validLocations : []).filter(
    (loc) => loc && isValidTamilNaduCoordinate(loc.lat, loc.lng)
  );

  if (!points.length) {
    map.setView([...TAMIL_NADU_CENTER], TAMIL_NADU_ZOOM, { animate: false });
    return;
  }

  if (points.length === 1) {
    const { lat, lng } = points[0];
    map.setView([lat, lng], singleZoom, { animate });
    return;
  }

  // Employee-only bounds — do NOT extend with Tamil Nadu state bounds.
  const bounds = L.latLngBounds(points.map((loc) => [loc.lat, loc.lng]));

  map.fitBounds(bounds, {
    paddingTopLeft,
    paddingBottomRight,
    maxZoom,
    animate,
  });

  // Large pixel padding on nearby markers can overshoot zoom-out; clamp for live.
  if (minZoom != null) {
    const z = map.getZoom();
    if (Number.isFinite(z) && z < minZoom) {
      map.setZoom(minZoom, { animate: false });
    }
  }
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
