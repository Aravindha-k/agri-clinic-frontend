/**
 * Admin employee daily route — response extraction, normalization, errors.
 */

import { unwrapSuccessEnvelope, getResponseBody } from "./apiUnwrap";
import { isUnreachableError, backendUnavailableMessage } from "./apiBackoff";

const ROUTE_LIST_KEYS = ["route", "points", "locations"];

function parseCoord(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Valid WGS84 point (filters null island and out-of-range). */
export function isValidRouteCoordinate(lat, lng) {
  if (lat == null || lng == null) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Pull route point arrays from any supported API shape.
 * Supports: data.route | data.points | data.locations | route | points | locations
 */
export function extractRouteRows(payload) {
  const body = getResponseBody(payload);
  const unwrapped = unwrapSuccessEnvelope(payload);
  const sources = [unwrapped, body, payload].filter((x) => x && typeof x === "object");

  for (const raw of sources) {
    if (Array.isArray(raw)) return raw;

    for (const key of ROUTE_LIST_KEYS) {
      const nested = raw.data?.[key];
      if (Array.isArray(nested)) return nested;
    }

    for (const key of ROUTE_LIST_KEYS) {
      if (Array.isArray(raw[key])) return raw[key];
    }

    if (Array.isArray(raw.results)) return raw.results;
  }

  return [];
}

/**
 * @returns {{
 *   latitude: number,
 *   longitude: number,
 *   captured_at: string|null,
 *   created_at: string|null,
 *   accuracy: number|null,
 *   speed: number|null,
 *   heading: number|null,
 *   lat: number,
 *   lng: number,
 *   id?: number,
 * } | null}
 */
export function normalizeRoutePoint(row) {
  if (!row || typeof row !== "object") return null;

  const lat = parseCoord(row.latitude ?? row.lat);
  const lng = parseCoord(row.longitude ?? row.lng);
  if (!isValidRouteCoordinate(lat, lng)) return null;

  const captured_at =
    row.captured_at ??
    row.recorded_at ??
    row.timestamp ??
    row.time ??
    null;
  const created_at = row.created_at ?? null;

  const accuracyRaw = row.accuracy;
  const accuracy =
    accuracyRaw != null && accuracyRaw !== "" && Number.isFinite(Number(accuracyRaw))
      ? Number(accuracyRaw)
      : null;
  const speed =
    row.speed != null && Number.isFinite(Number(row.speed)) ? Number(row.speed) : null;
  const heading =
    row.heading != null && Number.isFinite(Number(row.heading))
      ? Number(row.heading)
      : row.bearing != null && Number.isFinite(Number(row.bearing))
        ? Number(row.bearing)
        : null;

  return {
    id: row.id ?? row.pk,
    latitude: lat,
    longitude: lng,
    lat,
    lng,
    captured_at: captured_at != null ? String(captured_at) : null,
    created_at: created_at != null ? String(created_at) : null,
    accuracy,
    speed,
    heading,
  };
}

export function normalizeRoutePointList(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeRoutePoint).filter(Boolean);
}

/** @param {import('axios').AxiosResponse|object} payload */
export function normalizeEmployeeRoute(payload) {
  const body = getResponseBody(payload);
  const unwrapped = unwrapSuccessEnvelope(payload) ?? body ?? {};
  const meta = typeof unwrapped === "object" && !Array.isArray(unwrapped) ? unwrapped : body ?? {};

  const rows = extractRouteRows(payload);
  const points = normalizeRoutePointList(rows);

  const totalFromApi = Number(meta.total_points);
  const totalPoints = Number.isFinite(totalFromApi) && totalFromApi >= 0 ? totalFromApi : points.length;

  return {
    userId: meta.user_id ?? meta.userId ?? null,
    date: meta.date ?? null,
    totalPoints,
    totalDistanceKm: meta.total_distance_km ?? meta.distance_km ?? null,
    points,
  };
}

export function todayIsoDate() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatRouteTimestamp(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ROUTE_EMPTY_MESSAGE =
  "No route data found for this date. Employee must start workday, allow GPS, keep app open, and wait for sync.";

/** Map API / network errors to user-visible messages (never use empty-state copy). */
export function resolveRouteFetchError(err) {
  if (!err) return "Could not load route.";

  if (!err.response) {
    if (isUnreachableError(err) || err.code === "ERR_NETWORK" || err.message === "Network Error") {
      return backendUnavailableMessage();
    }
    return "Network error — server unavailable. Check your connection and try again.";
  }

  const status = err.response.status;
  const data = err.response.data;
  const detail =
    (typeof data === "string" && data) ||
    data?.detail ||
    data?.message ||
    (Array.isArray(data?.errors) ? data.errors.join(", ") : "") ||
    "";

  if (status === 401) {
    return "Session expired or not signed in. Please log in again.";
  }
  if (status === 403) {
    return detail || "You do not have permission to view this employee route.";
  }
  if (status === 404) {
    return detail || "Employee or route not found for this date.";
  }
  if (status >= 500) {
    return detail || "Server error while loading route. Please try again later.";
  }

  return detail || `Could not load route (HTTP ${status}).`;
}
