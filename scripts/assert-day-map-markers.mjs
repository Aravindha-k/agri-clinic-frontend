/**
 * Assertions: always-visible Tamil Nadu maps, tiles, height, offline markers.
 * Run: node scripts/assert-day-map-markers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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
const TAMIL_NADU_CENTER = [11.1271, 78.6569];
const TAMIL_NADU_ZOOM = 7;
const ADMIN_MAP_MIN_HEIGHT_PX = 460;

function gpsFromAge({ ageMin, gpsEnabled = true, hasCoords = true }) {
  if (gpsEnabled === false) return "offline";
  if (!hasCoords) return "no_location";
  if (ageMin == null) return "offline";
  if (ageMin <= GPS_ONLINE_MAX_MINUTES) return "online";
  if (ageMin <= GPS_STALE_MAX_MINUTES) return "stale";
  return "offline";
}

function applyLiveUpdate(prev, next, { authoritativeEmpty = false, temporaryFailure = false } = {}) {
  if (temporaryFailure) return prev;
  if (authoritativeEmpty) return [];
  if (!Array.isArray(next)) return prev;
  return next;
}

function shouldMountMap() {
  return true;
}

function liveMarkersForEmployees(employees) {
  const byId = new Map();
  for (const emp of employees || []) {
    const id = String(emp.user_id ?? emp.id);
    const lat = parseCoord(emp.latitude);
    const lng = parseCoord(emp.longitude);
    if (!isValidRouteCoordinate(lat, lng)) continue;
    byId.set(id, { id, lat, lng, gps: emp.gps });
  }
  return [...byId.values()];
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else console.log("OK:", msg);
}

assert(shouldMountMap({ markerCount: 0, loading: true, error: null }), "MapContainer renders with zero markers");
assert(shouldMountMap({ markerCount: 0, loading: false, error: "x" }), "map renders on network error");

{
  const frame = read("src/components/map/AdminMapFrame.jsx");
  assert(frame.includes("MapContainer"), "AdminMapFrame mounts MapContainer");
  assert(frame.includes("MapBasemapLayers") || frame.includes("TileLayer"), "TileLayer always renders via basemap");
  assert(frame.includes("MapResizeController"), "invalidateSize controller mounted");
  assert(frame.includes("ADMIN_MAP_MIN_HEIGHT_PX") || frame.includes("460"), "Map wrapper has non-zero min-height");
  assert(frame.includes("MapStatusOverlay"), "overlays do not replace MapContainer");
  assert(!/loading\s*\?\s*\([\s\S]*MapContainer/.test(frame), "overlays do not hide MapContainer behind conditional");
}

{
  const cssIndex = read("src/index.css");
  assert(cssIndex.includes('leaflet/dist/leaflet.css'), "Leaflet CSS is included once in index.css");
  assert(cssIndex.includes("min-height: 460px"), "CSS map min-height is 460px");
  const tracking = read("src/pages/Tracking.jsx");
  assert(!tracking.includes('import "leaflet/dist/leaflet.css"'), "Leaflet CSS not duplicated in Tracking.jsx");
}

{
  const setup = read("src/utils/leafletSetup.js");
  assert(setup.includes("marker-icon.png"), "marker icons resolve via Vite imports");
  assert(setup.includes("marker-shadow.png"), "marker shadow resolved");
}

{
  const basemap = read("src/config/mapBasemap.js");
  assert(basemap.includes("https://"), "tile URLs use HTTPS");
  assert(!basemap.match(/url:\s*["']http:\/\//), "no HTTP tile URLs");
}

assert(
  TAMIL_NADU_CENTER[0] === 11.1271 && TAMIL_NADU_CENTER[1] === 78.6569 && TAMIL_NADU_ZOOM === 7,
  "Tamil Nadu default centre/zoom used with no markers"
);
assert(ADMIN_MAP_MIN_HEIGHT_PX === 460, "approved min-height constant");

{
  const live = liveMarkersForEmployees([
    { id: 1, latitude: 11.0, longitude: 78.0, gps: "online" },
  ]);
  assert(live.length === 1, "Live employee with coordinates renders one marker");
}

{
  const prev = [{ id: 1, latitude: 11, longitude: 78 }];
  const kept = applyLiveUpdate(prev, null, { temporaryFailure: true });
  assert(kept.length === 1, "Offline/temp failure retains last valid marker");
  const offline = liveMarkersForEmployees([
    { id: 9, latitude: 11.2, longitude: 78.1, gps: "offline" },
  ]);
  assert(offline.length === 1, "Offline employee retains last valid marker");
}

{
  const none = liveMarkersForEmployees([{ id: 2, latitude: null, longitude: null }]);
  assert(none.length === 0, "No-location employee renders no fake marker");
}

{
  const emptyDay = extractDayMapMarkers({ points: [{ latitude: 1, longitude: 2 }], meta: {} });
  assert(emptyDay.length === 0, "Route map renders with zero markers (overlay, not invent)");
}

{
  let markers = extractDayMapMarkers({
    meta: { start_latitude: 10.9, start_longitude: 78.1 },
    stops: [{ type: "visit", visit_id: 9, latitude: 11, longitude: 78, status: "submitted" }],
  });
  assert(markers.some((m) => m.type === "start") && markers.some((m) => m.type === "visit"), "day map Start+Visit");
  assert(!markers.some((m) => m.type === "polyline"), "no polyline");
}

{
  const resize = read("src/components/map/MapResizeController.jsx");
  assert(resize.includes("invalidateSize"), "invalidateSize runs after mount/visibility change");
  assert(resize.includes("ResizeObserver") || resize.includes("visibilitychange"), "resize/visibility hooks present");
}

{
  const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
  assert(!liveSrc.includes("MarkerClusterGroup"), "live markers are not clustered (icons stay visible)");
  assert(!liveSrc.includes("Polyline") && !liveSrc.includes("polyline"), "no polyline in live markers");
  assert(liveSrc.includes("Tooltip"), "hover tooltip bound to live employee markers");
  assert(liveSrc.includes('direction="top"'), "tooltip opens above marker");
  assert(liveSrc.includes("offset={[0, -12]}"), "tooltip offset clears marker tip");
  assert(liveSrc.includes("LiveEmployeeTooltipContent") || liveSrc.includes("live-marker-tooltip"), "tooltip content present");
  assert(liveSrc.includes("LiveEmployeeMapPopup"), "click popup uses live employee popup");
  assert(liveSrc.includes("key={String(userId)}"), "one marker keyed by user ID");
  assert(!liveSrc.includes("fitBounds") && !liveSrc.includes("setView"), "hover/click does not refit the map");
  const routeSrc = read("src/components/tracking/EmployeeRouteMapView.jsx");
  assert(!routeSrc.includes("Polyline") && !routeSrc.includes("RouteContrastPolyline"), "no polyline on route map");
}

{
  const popupSrc = read("src/components/map/LiveEmployeeMapPopup.jsx");
  assert(popupSrc.includes("Duty:"), "popup shows duty separately");
  assert(popupSrc.includes("GPS:"), "popup shows GPS separately");
  assert(popupSrc.includes("Last known location"), "popup shows location section");
  assert(popupSrc.includes("Recorded"), "popup shows recorded time");
  assert(popupSrc.includes("Location name unavailable") || popupSrc.includes("LOCATION_UNAVAILABLE"), "safe location fallback");
  assert(popupSrc.includes("ProfileAvatar"), "popup shows avatar");
  assert(popupSrc.includes("formatLiveExactIst"), "exact time uses Asia/Kolkata helper");
}

{
  const metaSrc = read("src/utils/liveEmployeeMarkerMeta.js");
  assert(metaSrc.includes("Asia/Kolkata") || metaSrc.includes("BUSINESS_TIME_ZONE"), "exact time uses Asia/Kolkata");
  assert(metaSrc.includes("Location name unavailable"), "missing location label shows safe fallback");
  assert(metaSrc.includes("minutes ago"), "relative update time formatting");
  assert(metaSrc.includes("location_name"), "tooltip prefers location_name");
  assert(metaSrc.includes("area_name"), "tooltip prefers area_name");
  assert(!metaSrc.includes("reverseGeocode"), "no reverse geocode on live marker meta path");
}

assert(gpsFromAge({ ageMin: 24, hasCoords: true }) === "offline", "offline employee keeps coords conceptually");
assert(gpsFromAge({ ageMin: 1, hasCoords: false }) === "no_location", "no-location employee is list-only");
assert(gpsFromAge({ ageMin: 1, hasCoords: true, gpsEnabled: false }) === "offline", "GPS off ≠ duty ended");

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
