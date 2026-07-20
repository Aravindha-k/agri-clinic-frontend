/**
 * Focused day-map marker contract assertions (self-contained — mirrors employeeRoute.js).
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
        extra.visitId != null && String(extra.visitId) !== ""
          ? `id:${extra.visitId}`
          : null;
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
    const status = String(row?.status ?? row?.sync_status ?? row?.visit_status ?? "")
      .trim()
      .toLowerCase();
    if (!status) return false;
    return ["draft", "pending", "local", "unsynced", "in_progress"].includes(status);
  };

  for (const stop of stops) {
    if (!stop || isDraftOrPending(stop)) continue;
    const kind = String(stop.type ?? "").toLowerCase();
    const lat = parseCoord(stop.latitude ?? stop.lat);
    const lng = parseCoord(stop.longitude ?? stop.lng);
    if (kind === "start") {
      pushMarker("start", lat, lng, {});
    } else if (kind === "end") {
      pushMarker("end", lat, lng, {});
    } else if (kind === "visit" || stop.visit_id != null || stop.local_sync_id != null) {
      pushMarker("visit", lat, lng, {
        visitId: stop.visit_id ?? stop.id ?? null,
        localSyncId: stop.local_sync_id ?? null,
      });
    }
  }

  if (!hasStart) {
    const startLat = parseCoord(meta.start_latitude ?? meta.duty_start_latitude);
    const startLng = parseCoord(meta.start_longitude ?? meta.duty_start_longitude);
    if (isValidRouteCoordinate(startLat, startLng)) {
      pushMarker("start", startLat, startLng, {});
    }
  }

  if (!hasEnd && (endTime || meta.end_reason || meta.duty_end_reason)) {
    const endLat = parseCoord(meta.end_latitude ?? meta.duty_end_latitude);
    const endLng = parseCoord(meta.end_longitude ?? meta.duty_end_longitude);
    if (isValidRouteCoordinate(endLat, endLng)) {
      pushMarker("end", endLat, endLng, {});
    }
  }

  void points;
  void startTime;
  return markers;
}

function dayMapScopeKey({ userId, date, dutySessionId } = {}) {
  return [String(userId ?? "none"), String(date ?? "none"), String(dutySessionId ?? "nosession")].join("|");
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

assert(
  !extractDayMapMarkers({
    points: [{ latitude: 11.1, longitude: 78.1 }],
    startTime: "2026-07-20T03:30:00Z",
    meta: {},
  }).some((m) => m.type === "start"),
  "does not invent Start from GPS trail"
);

{
  const markers = extractDayMapMarkers({
    points: [{ latitude: 11.1, longitude: 78.1 }],
    meta: { start_latitude: 10.9, start_longitude: 78.2 },
  });
  assert(markers.filter((m) => m.type === "start").length === 1, "one Start from canonical coords");
}

{
  const markers = extractDayMapMarkers({
    stops: [
      { type: "visit", visit_id: 1, local_sync_id: "abc", latitude: 11, longitude: 78 },
      { type: "visit", visit_id: 1, local_sync_id: "abc", latitude: 11.001, longitude: 78.001 },
      { type: "visit", local_sync_id: "abc", latitude: 12, longitude: 79 },
    ],
  });
  assert(markers.filter((m) => m.type === "visit").length === 1, "dedupes visits by id/local_sync_id");
}

{
  const markers = extractDayMapMarkers({
    stops: [
      { type: "visit", visit_id: 2, latitude: 11, longitude: 78, status: "draft" },
      { type: "visit", visit_id: 3, latitude: 11.1, longitude: 78.1, status: "submitted" },
    ],
  });
  assert(markers.filter((m) => m.type === "visit").length === 1, "excludes draft visits");
}

assert(
  !extractDayMapMarkers({ endTime: "2026-07-20T12:00:00Z", meta: {} }).some((m) => m.type === "end"),
  "no End without coordinates"
);

assert(
  extractDayMapMarkers({
    endTime: "2026-07-20T12:00:00Z",
    meta: { end_latitude: 11.2, end_longitude: 78.3, end_reason: "ADMIN_ENDED" },
  }).filter((m) => m.type === "end").length === 1,
  "End when backend coords exist"
);

{
  const a = dayMapScopeKey({ userId: 1, date: "2026-07-20", dutySessionId: "d1" });
  const b = dayMapScopeKey({ userId: 2, date: "2026-07-20", dutySessionId: "d1" });
  const c = dayMapScopeKey({ userId: 1, date: "2026-07-19", dutySessionId: "d1" });
  const d = dayMapScopeKey({ userId: 1, date: "2026-07-20", dutySessionId: "d2" });
  assert(a !== b && a !== c && a !== d, "scope key changes with employee/date/session");
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll day-map marker assertions passed.");
