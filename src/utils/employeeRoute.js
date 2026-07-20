/**
 * Admin employee daily route — response extraction, normalization, errors.
 * Day map is marker-only (Start / submitted Visits / End) — no GPS polyline.
 */

import { unwrapSuccessEnvelope, getResponseBody } from "./apiUnwrap";
import { isUnreachableError, backendUnavailableMessage } from "./apiBackoff";
import { todayIsoDate as businessTodayIsoDate, formatBusinessDateTime } from "./businessDate";

export { businessTodayIsoDate as todayIsoDate };

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

  const polylineRaw = meta.polyline;
  const polyline = Array.isArray(polylineRaw)
    ? polylineRaw
        .map((pair) => {
          if (!Array.isArray(pair) || pair.length < 2) return null;
          const lat = parseCoord(pair[0]);
          const lng = parseCoord(pair[1]);
          if (!isValidRouteCoordinate(lat, lng)) return null;
          return [lat, lng];
        })
        .filter(Boolean)
    : [];

  const startTime =
    meta.duty_started_at ??
    meta.start_time ??
    meta.workday_start_time ??
    null;
  const endTime =
    meta.duty_ended_at ??
    meta.end_time ??
    meta.workday_end_time ??
    null;
  const endReason =
    meta.end_reason ??
    meta.duty_end_reason ??
    meta.ended_reason ??
    null;
  const stops = Array.isArray(meta.stops) ? meta.stops : [];
  const markers = extractDayMapMarkers({
    stops,
    points,
    startTime,
    endTime,
    meta,
  });

  return {
    userId: meta.user_id ?? meta.userId ?? null,
    employeeId: meta.employee_id ?? null,
    date: meta.date ?? null,
    dutySessionId: meta.duty_session_id ?? meta.dutySessionId ?? null,
    totalPoints,
    totalDistanceKm: meta.total_distance_km ?? meta.distance_km ?? null,
    durationSeconds: meta.duration_seconds ?? null,
    duration: meta.duration ?? null,
    startTime,
    endTime,
    endReason,
    latestUpdate:
      meta.latest_update ??
      (points.length ? points[points.length - 1]?.captured_at : null),
    polyline,
    stops,
    markers,
    points,
  };
}

export function formatRouteTimestamp(value) {
  return formatBusinessDateTime(value);
}

/**
 * Build Start / Visit / End markers for admin day map (matches mobile Day map).
 * End marker only when backend provides real end coordinates.
 */
export function extractDayMapMarkers({
  stops = [],
  points = [],
  startTime = null,
  endTime = null,
  meta = {},
} = {}) {
  const markers = [];
  const seenVisitKeys = new Set();

  const pushMarker = (type, lat, lng, extra = {}) => {
    if (!isValidRouteCoordinate(lat, lng)) return;
    if (type === "visit") {
      const key = `${extra.visitId ?? extra.id ?? ""}:${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (seenVisitKeys.has(key)) return;
      seenVisitKeys.add(key);
    }
    markers.push({
      type,
      latitude: lat,
      longitude: lng,
      lat,
      lng,
      ...extra,
    });
  };

  const typedStops = Array.isArray(stops) ? stops : [];
  for (const stop of typedStops) {
    if (!stop || typeof stop !== "object") continue;
    const kind = String(stop.type ?? stop.marker_type ?? stop.kind ?? stop.stop_type ?? "")
      .trim()
      .toLowerCase();
    const lat = parseCoord(stop.latitude ?? stop.lat);
    const lng = parseCoord(stop.longitude ?? stop.lng);
    if (kind === "start" || kind === "duty_start" || kind === "workday_start") {
      pushMarker("start", lat, lng, {
        label: "Start",
        captured_at: stop.captured_at ?? stop.timestamp ?? startTime,
      });
    } else if (kind === "end" || kind === "duty_end" || kind === "workday_end") {
      pushMarker("end", lat, lng, {
        label: "End",
        captured_at: stop.captured_at ?? stop.timestamp ?? endTime,
        endReason: stop.end_reason ?? meta.end_reason ?? null,
      });
    } else if (
      kind === "visit" ||
      kind === "submitted_visit" ||
      stop.visit_id != null ||
      stop.local_sync_id != null
    ) {
      pushMarker("visit", lat, lng, {
        label: stop.label ?? stop.farmer_name ?? "Visit",
        visitId: stop.visit_id ?? stop.id ?? null,
        localSyncId: stop.local_sync_id ?? null,
        captured_at: stop.captured_at ?? stop.submitted_at ?? stop.timestamp ?? null,
      });
    }
  }

  if (!markers.some((m) => m.type === "start")) {
    const startLat = parseCoord(
      meta.start_latitude ?? meta.duty_start_latitude ?? meta.start_lat
    );
    const startLng = parseCoord(
      meta.start_longitude ?? meta.duty_start_longitude ?? meta.start_lng
    );
    if (isValidRouteCoordinate(startLat, startLng)) {
      pushMarker("start", startLat, startLng, {
        label: "Start",
        captured_at: startTime,
      });
    } else if (points.length > 0 && startTime) {
      pushMarker("start", points[0].latitude, points[0].longitude, {
        label: "Start",
        captured_at: startTime,
      });
    }
  }

  if (!markers.some((m) => m.type === "end") && endTime) {
    const endLat = parseCoord(
      meta.end_latitude ?? meta.duty_end_latitude ?? meta.end_lat
    );
    const endLng = parseCoord(
      meta.end_longitude ?? meta.duty_end_longitude ?? meta.end_lng
    );
    if (isValidRouteCoordinate(endLat, endLng)) {
      pushMarker("end", endLat, endLng, {
        label: "End",
        captured_at: endTime,
        endReason: meta.end_reason ?? meta.duty_end_reason ?? null,
      });
    }
  }

  return markers;
}

export const ROUTE_EMPTY_MESSAGE =
  "No start, visit, or end markers for this date.";

export const ROUTE_SINGLE_POINT_MESSAGE =
  "Only the start marker is available for this day so far.";

/** User-facing empty state for marker-only day map. */
export function resolveRouteEmptyState(routeData) {
  const markers = routeData?.markers ?? [];
  const markerCount = markers.length;
  if (markerCount <= 0) {
    return {
      title: "No day markers yet",
      subtitle: ROUTE_EMPTY_MESSAGE,
    };
  }
  if (markerCount === 1 && markers[0]?.type === "start") {
    return {
      title: "Workday started",
      subtitle: ROUTE_SINGLE_POINT_MESSAGE,
    };
  }
  return {
    title: "No route recorded for this date",
    subtitle: ROUTE_EMPTY_MESSAGE,
  };
}

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

/** Route summary stats for admin day map (marker-focused). */
export function computeRouteSummary(routeData, employee = null) {
  const markers = routeData?.markers ?? [];
  const startMarker = markers.find((m) => m.type === "start");
  const endMarker = markers.find((m) => m.type === "end");
  const visitCount = markers.filter((m) => m.type === "visit").length;

  const apiStart = routeData?.startTime ?? startMarker?.captured_at ?? null;
  const apiEnd = routeData?.endTime ?? endMarker?.captured_at ?? null;

  let durationMinutes = null;
  if (routeData?.durationSeconds != null && Number.isFinite(Number(routeData.durationSeconds))) {
    durationMinutes = Math.round(Number(routeData.durationSeconds) / 60);
  } else if (apiStart && apiEnd) {
    const ms = new Date(apiEnd).getTime() - new Date(apiStart).getTime();
    if (Number.isFinite(ms) && ms > 0) {
      durationMinutes = Math.round(ms / 60000);
    }
  }

  return {
    distanceKm: routeData?.totalDistanceKm ?? null,
    durationMinutes,
    startTime: apiStart,
    endTime: apiEnd,
    endReason: routeData?.endReason ?? endMarker?.endReason ?? null,
    totalPoints: markers.length,
    visitCount,
    markerCount: markers.length,
    currentLat: null,
    currentLng: null,
    employeeName: employee?.employee_name ?? employee?.username ?? null,
  };
}

export function formatRouteDuration(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Reduce polyline point count for smoother map rendering. */
export function decimateRoutePoints(points, maxPoints = 400) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || [];
  const step = Math.ceil(points.length / maxPoints);
  return points.filter(
    (_, i) => i === 0 || i === points.length - 1 || i % step === 0
  );
}
