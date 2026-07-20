/**
 * Focused assertions: day-map markers + live GPS thresholds + one-marker-per-employee.
 * Run: node scripts/assert-day-map-markers.mjs
 */

function parseCoord(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isValidRouteCoordinate(lat, lng) {
  if (lat == null || lng == null) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

function extractDayMapMarkers({
  stops = [],
  points = [],
  startTime = null,
  endTime = null,
  meta = {},
} = {}) {
  const markers = [];
  const seenVisitKeys = new Set();
  let hasStart = false;
  let hasEnd = false;

  const pushMarker = (type, lat, lng, extra = {}) => {
    if (!isValidRouteCoordinate(lat, lng)) return false;
    if (type === "start") {
      if (hasStart) return false;
      hasStart = true;
    }
    if (type === "end") {
      if (hasEnd) return false;
      hasEnd = true;
    }
    if (type === "visit") {
      const idKey =
        extra.visitId != null && String(extra.visitId) !== "" ? `id:${extra.visitId}` : null;
      const syncKey =
        extra.localSyncId != null && String(extra.localSyncId) !== ""
          ? `sync:${extra.localSyncId}`
          : null;
      const coordKey = `coord:${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (
        (idKey && seenVisitKeys.has(idKey)) ||
        (syncKey && seenVisitKeys.has(syncKey)) ||
        (!idKey && !syncKey && seenVisitKeys.has(coordKey))
      ) {
        return false;
      }
      if (idKey) seenVisitKeys.add(idKey);
      if (syncKey) seenVisitKeys.add(syncKey);
      if (!idKey && !syncKey) seenVisitKeys.add(coordKey);
    }
    markers.push({ type, latitude: lat, longitude: lng, ...extra });
    return true;
  };

  const isDraftOrPending = (row) => {
    const status = String(row?.status ?? row?.sync_status ?? "")
      .trim()
      .toLowerCase();
    return ["draft", "pending", "local", "unsynced", "in_progress"].includes(status);
  };

  for (const stop of stops) {
    if (!stop || isDraftOrPending(stop)) continue;
    const kind = String(stop.type ?? "").toLowerCase();
    const lat = parseCoord(stop.latitude ?? stop.lat);
    const lng = parseCoord(stop.longitude ?? stop.lng);
    if (kind === "start") pushMarker("start", lat, lng, {});
    else if (kind === "end") pushMarker("end", lat, lng, {});
    else if (kind === "visit" || stop.visit_id != null || stop.local_sync_id != null) {
      pushMarker("visit", lat, lng, {
        visitId: stop.visit_id ?? stop.id ?? null,
        localSyncId: stop.local_sync_id ?? null,
      });
    }
  }

  if (!hasStart) {
    const startLat = parseCoord(meta.start_latitude ?? meta.duty_start_latitude);
    const startLng = parseCoord(meta.start_longitude ?? meta.duty_start_longitude);
    if (isValidRouteCoordinate(startLat, startLng)) pushMarker("start", startLat, startLng, {});
  }

  if (!hasEnd && (endTime || meta.end_reason || meta.duty_end_reason)) {
    const endLat = parseCoord(meta.end_latitude ?? meta.duty_end_latitude);
    const endLng = parseCoord(meta.end_longitude ?? meta.duty_end_longitude);
    if (isValidRouteCoordinate(endLat, endLng)) pushMarker("end", endLat, endLng, {});
  }

  void points;
  void startTime;
  return markers;
}

function dayMapScopeKey({ userId, date, dutySessionId } = {}) {
  return [String(userId ?? "none"), String(date ?? "none"), String(dutySessionId ?? "nosession")].join("|");
}

const GPS_ONLINE_MAX_MINUTES = 7;
const GPS_STALE_MAX_MINUTES = 15;

function resolveGpsFromAge({ ageMin, gpsEnabled = true, permissionGranted = true, hasCoords = true }) {
  if (gpsEnabled === false || permissionGranted === false) return "gps_offline";
  if (!hasCoords) return "gps_offline";
  if (ageMin == null) return "gps_offline";
  if (ageMin <= GPS_ONLINE_MAX_MINUTES) return "gps_active";
  if (ageMin <= GPS_STALE_MAX_MINUTES) return "gps_stale";
  return "gps_offline";
}

/** Simulate live roster: one marker per employee; latest point replaces previous. */
function applyLiveLocations(prevMap, updates) {
  const next = { ...prevMap };
  for (const u of updates) {
    const id = String(u.user_id);
    if (u.latitude == null || u.longitude == null) {
      delete next[id];
      continue;
    }
    next[id] = { user_id: id, latitude: u.latitude, longitude: u.longitude, at: u.at };
  }
  return next;
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK:", msg);
  }
}

// Day map
assert(
  !extractDayMapMarkers({
    points: [{ latitude: 11.1, longitude: 78.1 }],
    startTime: "2026-07-20T03:30:00Z",
    meta: {},
  }).some((m) => m.type === "start"),
  "day map does not invent Start from GPS trail"
);

assert(
  extractDayMapMarkers({
    meta: { start_latitude: 10.9, start_longitude: 78.2 },
  }).filter((m) => m.type === "start").length === 1,
  "day map one Start from canonical coords"
);

assert(
  extractDayMapMarkers({
    stops: [
      { type: "visit", visit_id: 1, local_sync_id: "abc", latitude: 11, longitude: 78 },
      { type: "visit", visit_id: 1, local_sync_id: "abc", latitude: 11.001, longitude: 78.001 },
      { type: "visit", local_sync_id: "abc", latitude: 12, longitude: 79 },
    ],
  }).filter((m) => m.type === "visit").length === 1,
  "day map dedupes visits"
);

assert(
  extractDayMapMarkers({
    stops: [
      { type: "visit", visit_id: 2, latitude: 11, longitude: 78, status: "draft" },
      { type: "visit", visit_id: 3, latitude: 11.1, longitude: 78.1, status: "submitted" },
    ],
  }).filter((m) => m.type === "visit").length === 1,
  "day map excludes drafts"
);

assert(
  !extractDayMapMarkers({ endTime: "2026-07-20T12:00:00Z", meta: {} }).some((m) => m.type === "end"),
  "day map no End without coordinates"
);

assert(
  extractDayMapMarkers({
    endTime: "2026-07-20T12:00:00Z",
    meta: { end_latitude: 11.2, end_longitude: 78.3, end_reason: "ADMIN_ENDED" },
  }).filter((m) => m.type === "end").length === 1,
  "day map End when backend coords exist"
);

{
  const a = dayMapScopeKey({ userId: 1, date: "2026-07-20", dutySessionId: "d1" });
  const b = dayMapScopeKey({ userId: 2, date: "2026-07-20", dutySessionId: "d1" });
  assert(a !== b, "day map scope isolates employees");
}

// Live GPS thresholds
assert(resolveGpsFromAge({ ageMin: 5, hasCoords: true }) === "gps_active", "GPS Online ≤7 min");
assert(resolveGpsFromAge({ ageMin: 7, hasCoords: true }) === "gps_active", "GPS Online at 7 min");
assert(resolveGpsFromAge({ ageMin: 8, hasCoords: true }) === "gps_stale", "GPS Stale >7 and ≤15");
assert(resolveGpsFromAge({ ageMin: 15, hasCoords: true }) === "gps_stale", "GPS Stale at 15 min");
assert(resolveGpsFromAge({ ageMin: 16, hasCoords: true }) === "gps_offline", "GPS Offline >15 min");
assert(
  resolveGpsFromAge({ ageMin: 1, hasCoords: true, gpsEnabled: false }) === "gps_offline",
  "GPS disabled → Offline without ending duty"
);
assert(
  resolveGpsFromAge({ ageMin: null, hasCoords: false }) === "gps_offline",
  "no coordinates → Offline / no marker"
);

// Live marker replacement (no duplicates, no polyline)
{
  let map = {};
  map = applyLiveLocations(map, [{ user_id: 9, latitude: 11.0, longitude: 78.0, at: "t1" }]);
  assert(Object.keys(map).length === 1, "one live marker per employee");
  map = applyLiveLocations(map, [{ user_id: 9, latitude: 11.05, longitude: 78.05, at: "t2" }]);
  assert(Object.keys(map).length === 1, "5-min update replaces same marker");
  assert(map["9"].latitude === 11.05, "marker moves to latest coordinates");
  map = applyLiveLocations(map, [{ user_id: 9, latitude: null, longitude: null, at: "t3" }]);
  assert(Object.keys(map).length === 0, "missing location removes marker but employee may stay in list");
}

assert(typeof extractDayMapMarkers === "function" && !("polyline" in extractDayMapMarkers({})), "no polyline in day markers");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll day-map + live-tracking assertions passed.");
