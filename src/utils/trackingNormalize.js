/**
 * Normalize tracking API payloads for admin map/KPI UI.
 */

import { unwrapSuccessEnvelope } from "./apiUnwrap";
import { isValidTamilNaduCoordinate } from "./mapCoordinates";

function parseCoord(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rowLatLng(row) {
  const lat = parseCoord(row?.latitude ?? row?.last_latitude ?? row?.lat ?? row?.last_location?.latitude);
  const lng = parseCoord(row?.longitude ?? row?.last_longitude ?? row?.lng ?? row?.last_location?.longitude);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function enrichFeature(feature) {
  if (!feature || feature.type !== "Feature") return feature;
  if (validFeatureGeometry(feature)) return feature;
  const props = feature.properties || {};
  const coords = rowLatLng(props);
  if (!coords) return feature;
  return {
    ...feature,
    geometry: { type: "Point", coordinates: [coords.lng, coords.lat] },
  };
}

function rowToFeature(row) {
  if (row?.type === "Feature") {
    const enriched = enrichFeature(row);
    return validFeatureGeometry(enriched) ? enriched : null;
  }
  const props = row?.properties ?? row;
  const coords = rowLatLng(props);
  if (!coords) return null;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [coords.lng, coords.lat] },
    properties: props,
  };
}

function featuresFromRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(rowToFeature).filter(Boolean);
}

function validFeatureGeometry(feature) {
  const coords = feature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return false;
  return Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1]));
}

export function resolveGeoFeatures(payload) {
  const raw = unwrapSuccessEnvelope(payload) ?? payload?.data?.data ?? payload?.data ?? payload;

  if (raw?.type === "FeatureCollection" && Array.isArray(raw.features)) {
    return raw.features.map(enrichFeature).filter(validFeatureGeometry);
  }

  if (Array.isArray(raw?.features)) {
    return raw.features.map(enrichFeature).filter(validFeatureGeometry);
  }

  if (Array.isArray(raw)) {
    if (raw[0]?.type === "Feature") {
      return raw.map(enrichFeature).filter(validFeatureGeometry);
    }
    return featuresFromRows(raw);
  }

  const fromEmployees = featuresFromRows(raw?.employees);
  if (fromEmployees.length) return fromEmployees;

  const fromLocations = featuresFromRows(raw?.locations);
  if (fromLocations.length) return fromLocations;

  const fromResults = featuresFromRows(raw?.results);
  if (fromResults.length) return fromResults;

  return [];
}

export function normalizeTrackingStats(payload) {
  const d = unwrapSuccessEnvelope(payload) ?? payload?.data?.data ?? payload?.data ?? payload ?? {};
  return {
    total_employees: Number(d.total_employees ?? d.total ?? 0) || 0,
    working_now: Number(d.working_now ?? d.working ?? 0) || 0,
    online: Number(d.online ?? d.online_now ?? 0) || 0,
    offline: Number(d.offline ?? 0) || 0,
    gps_issues: Number(d.gps_issues ?? d.gps_off ?? 0) || 0,
  };
}

/** Flatten admin status list from array or wrapped envelope */
export function resolveTrackingEmployeeList(payload) {
  return resolveListFromPayload(payload);
}

function resolveListFromPayload(payload) {
  const raw = unwrapSuccessEnvelope(payload) ?? payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.employees)) return raw.employees;
  if (Array.isArray(raw?.locations)) return raw.locations;
  return [];
}

export function normalizeTrackingEmployee(emp) {
  if (!emp || typeof emp !== "object") return emp;
  const coords = rowLatLng(emp);
  const lat = coords?.lat ?? null;
  const lng = coords?.lng ?? null;
  const conn = String(emp.connection_status ?? emp.connection ?? "").toUpperCase();
  const work = String(emp.work_status ?? "").toLowerCase();
  const device_status =
    emp.device_status && typeof emp.device_status === "object"
      ? emp.device_status
      : undefined;

  return {
    ...emp,
    user_id: emp.user_id ?? emp.id,
    device_status,
    connection_status: emp.connection_status ?? emp.connection,
    connection: emp.connection ?? emp.connection_status,
    latitude: lat,
    longitude: lng,
    last_latitude: emp.last_latitude ?? lat,
    last_longitude: emp.last_longitude ?? lng,
    last_seen: emp.last_seen ?? emp.last_heartbeat ?? emp.last_location_at,
    work_status: work,
    is_online: conn === "ONLINE" || emp.is_online === true,
    is_working: work === "working" || emp.is_working === true,
  };
}

/** GeoJSON feature → map-friendly row */
export function normalizeGeoFeature(feature) {
  const p = feature?.properties || {};
  const coords = feature?.geometry?.coordinates;
  let lat = null;
  let lng = null;
  if (Array.isArray(coords) && coords.length >= 2) {
    lng = Number(coords[0]);
    lat = Number(coords[1]);
  }
  return {
    ...normalizeTrackingEmployee({
      ...p,
      latitude: lat,
      longitude: lng,
      user_id: p.user_id,
    }),
    geometry: feature?.geometry,
    properties: p,
    name: p.employee_name ?? p.username ?? p.name ?? "Agent",
    phone: p.phone,
  };
}

export function countMappedGeoFeatures(features) {
  return features.filter(validFeatureGeometry).length;
}

export function filterGeoFeaturesWithCoords(features) {
  return (features || []).filter((feature) => {
    if (!validFeatureGeometry(feature)) return false;
    const [lng, lat] = feature.geometry.coordinates;
    return isValidTamilNaduCoordinate(lat, lng);
  });
}

export {
  normalizeRoutePoint,
  normalizeRoutePointList,
  normalizeEmployeeRoute,
  extractRouteRows,
  todayIsoDate,
  formatRouteTimestamp,
  ROUTE_EMPTY_MESSAGE,
  resolveRouteFetchError,
} from "./employeeRoute";
