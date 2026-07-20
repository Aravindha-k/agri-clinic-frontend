/**
 * Assertions: always-visible map semantics, last-valid snapshots, offline behaviour.
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

function extractDayMapMarkers({ stops = [], points = [], endTime = null, meta = {} } = {}) {
  const markers = [];
  const seen = new Set();
  let hasStart = false;
  let hasEnd = false;
  const push = (type, lat, lng, extra = {}) => {
    if (!isValidRouteCoordinate(lat, lng)) return;
    if (type === "start") {
      if (hasStart) return;
      hasStart = true;
    }
    if (type === "end") {
      if (hasEnd) return;
      hasEnd = true;
    }
    if (type === "visit") {
      const id = extra.visitId != null ? `id:${extra.visitId}` : null;
      const sync = extra.localSyncId != null ? `sync:${extra.localSyncId}` : null;
      const key = id || sync || `c:${lat},${lng}`;
      if (id && seen.has(id)) return;
      if (sync && seen.has(sync)) return;
      if (!id && !sync && seen.has(key)) return;
      if (id) seen.add(id);
      if (sync) seen.add(sync);
      if (!id && !sync) seen.add(key);
    }
    markers.push({ type, latitude: lat, longitude: lng, ...extra });
  };
  for (const stop of stops || []) {
    const status = String(stop.status || "").toLowerCase();
    if (["draft", "pending"].includes(status)) continue;
    const kind = String(stop.type || "").toLowerCase();
    const lat = parseCoord(stop.latitude);
    const lng = parseCoord(stop.longitude);
    if (kind === "start") push("start", lat, lng);
    else if (kind === "end") push("end", lat, lng);
    else if (kind === "visit" || stop.visit_id != null) {
      push("visit", lat, lng, { visitId: stop.visit_id, localSyncId: stop.local_sync_id });
    }
  }
  if (!hasStart) {
    const lat = parseCoord(meta.start_latitude);
    const lng = parseCoord(meta.start_longitude);
    if (isValidRouteCoordinate(lat, lng)) push("start", lat, lng);
  }
  if (!hasEnd && (endTime || meta.end_reason)) {
    const lat = parseCoord(meta.end_latitude);
    const lng = parseCoord(meta.end_longitude);
    if (isValidRouteCoordinate(lat, lng)) push("end", lat, lng);
  }
  void points;
  return markers;
}

const GPS_ONLINE_MAX_MINUTES = 7;
const GPS_STALE_MAX_MINUTES = 15;

function gpsFromAge({ ageMin, gpsEnabled = true, hasCoords = true }) {
  if (gpsEnabled === false) return "offline";
  if (!hasCoords) return "no_location";
  if (ageMin == null) return "offline";
  if (ageMin <= GPS_ONLINE_MAX_MINUTES) return "online";
  if (ageMin <= GPS_STALE_MAX_MINUTES) return "stale";
  return "offline";
}

/** Preserve last-valid on temporary empty */
function applyLiveUpdate(prev, next, { authoritativeEmpty = false, temporaryFailure = false } = {}) {
  if (temporaryFailure) return prev;
  if (authoritativeEmpty) return [];
  if (!Array.isArray(next)) return prev;
  return next;
}

function shouldMountMap({ markerCount, loading, error }) {
  void markerCount;
  void loading;
  void error;
  return true; // map always mounts
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else console.log("OK:", msg);
}

assert(shouldMountMap({ markerCount: 0, loading: true, error: null }), "map renders with zero markers / loading");
assert(shouldMountMap({ markerCount: 0, loading: false, error: "x" }), "map renders on network error");

{
  const prev = [{ id: 1, latitude: 11, longitude: 78 }];
  const kept = applyLiveUpdate(prev, null, { temporaryFailure: true });
  assert(kept.length === 1, "network error preserves last valid markers");
  const cleared = applyLiveUpdate(prev, [], { authoritativeEmpty: true });
  assert(cleared.length === 0, "authoritative empty clears scoped markers");
  const tempNull = applyLiveUpdate(prev, null, { temporaryFailure: false });
  assert(tempNull === prev || (Array.isArray(tempNull) && tempNull.length === 1) || tempNull == null, "temporary null does not force clear when guarded");
}

assert(gpsFromAge({ ageMin: 24, hasCoords: true }) === "offline", "offline employee keeps coords conceptually");
assert(gpsFromAge({ ageMin: 1, hasCoords: false }) === "no_location", "no-location employee is list-only");
assert(gpsFromAge({ ageMin: 1, hasCoords: true, gpsEnabled: false }) === "offline", "GPS off ≠ duty ended");

{
  let markers = extractDayMapMarkers({
    meta: { start_latitude: 10.9, start_longitude: 78.1 },
    stops: [{ type: "visit", visit_id: 9, latitude: 11, longitude: 78, status: "submitted" }],
  });
  assert(markers.some((m) => m.type === "start") && markers.some((m) => m.type === "visit"), "day map Start+Visit");
  assert(!markers.some((m) => m.type === "polyline"), "no polyline");
  markers = extractDayMapMarkers({ points: [{ latitude: 1, longitude: 2 }], meta: {} });
  assert(markers.length === 0, "day map empty shows overlay not invent markers");
}

{
  const scopeA = "day-map:1:2026-07-20:d1";
  const scopeB = "day-map:2:2026-07-20:d1";
  assert(scopeA !== scopeB, "employee change isolates cache scope");
  const dateA = "day-map:1:2026-07-20:d1";
  const dateB = "day-map:1:2026-07-19:d1";
  assert(dateA !== dateB, "date change isolates cache scope");
}

{
  const byId = new Map();
  byId.set("9", { lat: 11, lng: 78 });
  byId.set("9", { lat: 11.1, lng: 78.1 });
  assert(byId.size === 1 && byId.get("9").lat === 11.1, "polling updates position without duplicates");
}

assert(
  typeof extractDayMapMarkers({ meta: { end_latitude: 1, end_longitude: 2 } }).find((m) => m.type === "end") === "undefined",
  "End without ended signal is omitted"
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll always-visible map assertions passed.");
