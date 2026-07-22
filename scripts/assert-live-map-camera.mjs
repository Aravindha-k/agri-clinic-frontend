/**
 * Live Tracking camera / Fit all / popup auto-pan assertions.
 * Run: node scripts/assert-live-map-camera.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Leaflet reads window/screen at import time — provide a minimal Node stub.
if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
if (typeof globalThis.navigator === "undefined") {
  globalThis.navigator = { userAgent: "node" };
}
if (typeof globalThis.screen === "undefined") {
  globalThis.screen = { deviceXDPI: 1, logicalXDPI: 1, width: 1280, height: 800 };
}
if (typeof globalThis.devicePixelRatio === "undefined") {
  globalThis.devicePixelRatio = 1;
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    documentElement: { style: {} },
    body: { style: {} },
    createElement: () => ({ style: {}, getContext: () => null, appendChild() {} }),
    createElementNS: () => ({ style: {} }),
    getElementsByTagName: () => [{ appendChild() {} }],
  };
}
if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis;
}

const {
  fitEmployeeBounds,
  getValidEmployeeLocations,
  isOutOfOperatingRegion,
  isValidTamilNaduCoordinate,
  LIVE_FIT_OPTIONS,
  MULTI_EMPLOYEE_MAX_ZOOM,
  MULTI_EMPLOYEE_MIN_ZOOM,
  SINGLE_EMPLOYEE_ZOOM,
  TAMIL_NADU_CENTER,
  TAMIL_NADU_ZOOM,
} = await import("../src/utils/mapCoordinates.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function createMockMap() {
  let zoom = 7;
  let center = [...TAMIL_NADU_CENTER];
  let closedPopup = false;
  let lastFit = null;
  let lastSetView = null;
  return {
    get closedPopup() {
      return closedPopup;
    },
    get lastFit() {
      return lastFit;
    },
    get lastSetView() {
      return lastSetView;
    },
    getZoom() {
      return zoom;
    },
    getCenter() {
      return { lat: center[0], lng: center[1] };
    },
    closePopup() {
      closedPopup = true;
    },
    setView(c, z) {
      center = Array.isArray(c) ? [...c] : [c.lat, c.lng];
      zoom = z;
      lastSetView = { center: [...center], zoom: z };
    },
    setZoom(z) {
      zoom = z;
    },
    fitBounds(bounds, opts) {
      lastFit = { bounds, opts };
      // Simulate Leaflet overshoot from large padding on nearby TN markers.
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      center = [(sw.lat + ne.lat) / 2, (sw.lng + ne.lng) / 2];
      zoom = 5;
    },
  };
}

const chennai = { user_id: 1, latitude: 13.0827, longitude: 80.2707, name: "A", is_online: true };
const madurai = { user_id: 2, latitude: 9.9252, longitude: 78.1198, name: "B", is_online: false };
const coimbatore = { user_id: 3, latitude: 11.0168, longitude: 76.9558, name: "C" };

{
  // 1. Two TN markers → fitBounds on employee points only (no world/Sri Lanka extend)
  const locs = getValidEmployeeLocations([chennai, madurai]);
  assert.equal(locs.length, 2, "1a. two TN markers accepted");
  const map = createMockMap();
  fitEmployeeBounds(map, locs, LIVE_FIT_OPTIONS);
  assert.ok(map.lastFit, "1b. multi marker uses fitBounds");
  assert.equal(map.lastFit.opts.maxZoom, MULTI_EMPLOYEE_MAX_ZOOM, "1c. maxZoom 11");
  assert.deepEqual(map.lastFit.opts.paddingTopLeft, [48, 100], "1d. top padding for header");
  assert.equal(map.getZoom(), MULTI_EMPLOYEE_MIN_ZOOM, "1e. clamp prevents zoom 5 / Sri Lanka framing");
  const sw = map.lastFit.bounds.getSouthWest();
  const ne = map.lastFit.bounds.getNorthEast();
  assert.ok(sw.lat > 8 && ne.lat < 14, "1f. bounds stay within TN latitudes");
  assert.ok(sw.lng > 76 && ne.lng < 81, "1g. bounds stay within TN longitudes");
}

{
  // 2. TN fallback not merged when markers exist
  const src = read("src/utils/mapCoordinates.js");
  assert.ok(!/tamilNaduBounds\.extend|TN_.*\.extend\(employee/i.test(src), "2a. no TN.extend(employee)");
  assert.match(src, /Employee-only bounds/, "2b. employee-only comment");
  const map = createMockMap();
  fitEmployeeBounds(map, getValidEmployeeLocations([chennai, coimbatore]), LIVE_FIT_OPTIONS);
  const b = map.lastFit.bounds;
  assert.ok(!b.contains([TAMIL_NADU_CENTER[0] - 3, TAMIL_NADU_CENTER[1]]), "2c. southern ocean not forced in");
}

{
  // 3. One marker centres at zoom 12
  const map = createMockMap();
  fitEmployeeBounds(map, getValidEmployeeLocations([chennai]), LIVE_FIT_OPTIONS);
  assert.equal(map.lastSetView?.zoom, SINGLE_EMPLOYEE_ZOOM, "3. single marker zoom 12");
  assert.ok(!map.lastFit, "3b. single marker uses setView not fitBounds");
}

{
  // 4. Offline last-known participates
  const locs = getValidEmployeeLocations([
    { ...madurai, is_online: false, connection_status: "OFFLINE" },
  ]);
  assert.equal(locs.length, 1, "4. offline last-known included");
}

{
  // 5. No-location excluded
  assert.equal(getValidEmployeeLocations([{ user_id: 9, name: "X" }]).length, 0, "5. no coords excluded");
}

{
  // 6. 0,0 excluded
  assert.equal(
    getValidEmployeeLocations([{ user_id: 10, latitude: 0, longitude: 0 }]).length,
    0,
    "6. 0,0 excluded"
  );
  assert.equal(isValidTamilNaduCoordinate(0, 0), false, "6b. 0,0 invalid TN");
}

{
  // 7. Out-of-region does not destroy framing
  const maldives = { user_id: 11, latitude: 4.1755, longitude: 73.5093, name: "Far" };
  assert.equal(isOutOfOperatingRegion(maldives.latitude, maldives.longitude), true, "7a. flagged out-of-region");
  const locs = getValidEmployeeLocations([chennai, madurai, maldives]);
  assert.equal(locs.length, 2, "7b. out-of-region excluded from Fit all");
  const map = createMockMap();
  fitEmployeeBounds(map, locs, LIVE_FIT_OPTIONS);
  assert.equal(map.getZoom(), MULTI_EMPLOYEE_MIN_ZOOM, "7c. framing still TN-clamped");
}

{
  // 8. Fit all closes popup before calculating bounds
  const map = createMockMap();
  fitEmployeeBounds(map, getValidEmployeeLocations([chennai, madurai]), LIVE_FIT_OPTIONS);
  assert.equal(map.closedPopup, true, "8. closePopup before fit");
  const viewport = read("src/components/map/MapEmployeeViewport.jsx");
  assert.match(viewport, /LIVE_FIT_OPTIONS/, "8b. viewport uses live fit options");
  assert.match(viewport, /closePopup|LIVE_FIT/, "8c. popup closed on fit");
}

{
  // 9. Popup auto-pan below fixed map header
  const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
  assert.match(liveSrc, /autoPan=\{true\}/, "9a. autoPan");
  assert.match(liveSrc, /keepInView=\{true\}/, "9b. keepInView");
  assert.match(liveSrc, /autoPanPaddingTopLeft=\{\[24,\s*120\]\}/, "9c. top padding 120 for header");
  assert.match(liveSrc, /autoPanPaddingBottomRight=\{\[24,\s*24\]\}/, "9d. bottom padding");
  assert.match(liveSrc, /maxWidth=\{320\}/, "9e. maxWidth 320");
  assert.match(liveSrc, /closeButton=\{true\}/, "9f. closeButton");
  assert.ok(!liveSrc.includes("setZoom") && !/flyTo|setView/.test(liveSrc), "9g. popup does not zoom/refit");
}

{
  // 10. Polling does not refit camera
  const viewport = read("src/components/map/MapEmployeeViewport.jsx");
  const tracking = read("src/pages/Tracking.jsx");
  assert.match(viewport, /refitMode = "once"/, "10a. once mode default");
  assert.match(tracking, /refitMode="once"/, "10b. Tracking uses once");
  assert.match(viewport, /shouldFit = !didInitialFit\.current/, "10c. initial fit only");
  assert.ok(!tracking.includes('refitMode="full"'), "10d. Tracking does not full-refit");
}

{
  // 11. GPS status changes do not change zoom (roster-stable once mode)
  const viewport = read("src/components/map/MapEmployeeViewport.jsx");
  assert.match(viewport, /gps status must not refit/i, "11. status-only poll must not refit");
  assert.ok(!viewport.includes("is_online") && !viewport.includes("gps_"), "11b. viewport ignores GPS fields");
}

{
  // 12. Markers remain mounted after zoom (no zoom/bounds filter)
  const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
  assert.ok(!/zoom\s*[<>]|bounds\.contains|visibleMarkers/.test(liveSrc), "12. markers not filtered by zoom");
  assert.match(liveSrc, /key=\{String\(userId\)\}/, "12b. stable keys");
}

{
  // Empty → TN default
  const map = createMockMap();
  fitEmployeeBounds(map, [], LIVE_FIT_OPTIONS);
  assert.deepEqual(map.lastSetView?.center, [...TAMIL_NADU_CENTER], "empty falls back to TN centre");
  assert.equal(map.lastSetView?.zoom, TAMIL_NADU_ZOOM, "empty uses TN zoom");
}

{
  const liveSrc = read("src/utils/mapCoordinates.js");
  assert.match(liveSrc, /applyLiveMapOperatingBounds/, "operating max bounds helper");
  assert.match(read("src/components/map/MapEmployeeViewport.jsx"), /applyLiveMapOperatingBounds/, "live map applies max bounds");
}

console.log("All live map camera assertions passed.");
