/**
 * Live Tracking fullscreen / camera / control assertions.
 * Run: node scripts/assert-live-map-fullscreen.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  LIVE_FULLSCREEN_FIT_OPTIONS,
  MULTI_EMPLOYEE_MIN_ZOOM,
  TAMIL_NADU_CENTER,
} = await import("../src/utils/mapCoordinates.js");

const {
  filterFitLocations,
  mapViewContainsAllMarkers,
  saveMapCamera,
  restoreMapCamera,
  fitLiveEmployeeCamera,
  spreadStackedEmployeeMarkers,
} = await import("../src/utils/liveMapCamera.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const chennai = { user_id: 1, latitude: 13.0827, longitude: 80.2707 };
const madurai = { user_id: 2, latitude: 9.9252, longitude: 78.1198 };

function createMockMap({ containsAll = true } = {}) {
  let zoom = 9;
  let center = [11.5, 78.5];
  let closedPopup = false;
  let closedTooltip = false;
  let invalidated = 0;
  let lastFit = null;
  let lastSetView = null;

  const bounds = {
    isValid: () => true,
    contains: () => containsAll,
    getSouthWest: () => ({ lat: 9.5, lng: 77.5 }),
    getNorthEast: () => ({ lat: 13.5, lng: 81.0 }),
  };

  return {
    getZoom: () => zoom,
    getCenter: () => ({ lat: center[0], lng: center[1] }),
    getBounds: () => bounds,
    closePopup: () => {
      closedPopup = true;
    },
    closeTooltip: () => {
      closedTooltip = true;
    },
    invalidateSize: () => {
      invalidated += 1;
    },
    setView(c, z) {
      center = Array.isArray(c) ? [...c] : [c.lat, c.lng];
      zoom = z;
      lastSetView = { center: [...center], zoom: z };
    },
    setZoom(z) {
      zoom = z;
    },
    fitBounds(b, opts) {
      lastFit = { bounds: b, opts };
      zoom = 5;
    },
    get invalidated() {
      return invalidated;
    },
    get closedPopup() {
      return closedPopup;
    },
    get closedTooltip() {
      return closedTooltip;
    },
    get lastFit() {
      return lastFit;
    },
    get lastSetView() {
      return lastSetView;
    },
  };
}

{
  const locs = getValidEmployeeLocations([chennai, madurai]);
  const map = createMockMap();
  fitLiveEmployeeCamera(map, locs, "fullscreen");
  assert.ok(map.lastFit, "1. fullscreen fit uses employee bounds");
  assert.deepEqual(map.lastFit.opts.paddingTopLeft, [80, 100], "1b. fullscreen top padding");
  assert.deepEqual(map.lastFit.opts.paddingBottomRight, [80, 80], "1c. fullscreen bottom padding");
  assert.equal(map.getZoom(), MULTI_EMPLOYEE_MIN_ZOOM, "1d. min zoom clamp prevents Sri Lanka framing");
}

{
  const src = read("src/utils/mapCoordinates.js");
  assert.ok(!/tamilNaduBounds\.extend|TN_.*\.extend\(employee/i.test(src), "2. TN fallback not merged into fit");
  const locs = filterFitLocations(getValidEmployeeLocations([chennai]));
  assert.equal(locs.length, 1, "2b. valid markers only");
  assert.ok(!locs.some((l) => l.lat === TAMIL_NADU_CENTER[0] && l.lng === TAMIL_NADU_CENTER[1]), "2c. fallback centre excluded");
}

{
  const map = createMockMap();
  fitEmployeeBounds(map, getValidEmployeeLocations([chennai, madurai]), LIVE_FULLSCREEN_FIT_OPTIONS);
  assert.equal(map.getZoom(), MULTI_EMPLOYEE_MIN_ZOOM, "3. fullscreen fit does not stay at overshoot zoom 5");
}

{
  const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
  assert.ok(!/permanent=\{true\}/.test(liveSrc), "4. no permanent map labels");
  assert.match(liveSrc, /permanent=\{false\}/, "4b. hover tooltip only");
  assert.ok(!liveSrc.includes("live-employee-tooltip-card"), "4c. no large always-on card");
}

{
  assert.match(read("src/components/tracking/LiveMapMarkers.jsx"), /Tooltip/, "5. hover tooltip");
  assert.match(read("src/components/tracking/LiveMapMarkers.jsx"), /<Popup/, "6. click popup");
}

{
  const css = read("src/index.css");
  const frame = read("src/components/map/AdminMapFrame.jsx");
  assert.match(css, /\.admin-map-toolbar/, "7a. map toolbar styles");
  assert.match(frame, /zoomControlPosition/, "7b. zoom position prop");
  assert.match(frame, /MapToolbar/, "7c. toolbar wired in frame");
  assert.match(css, /\.admin-map-legend/, "7d. legend bottom-left styles");
}

{
  const fsCtrl = read("src/components/tracking/LiveMapFullscreenController.jsx");
  assert.match(fsCtrl, /invalidateSize/, "8. fullscreen calls invalidateSize");
  assert.match(fsCtrl, /setTimeout\(fn, 160\)/, "8b. delayed invalidate once");
  assert.ok(!/setInterval\(.*invalidateSize/.test(fsCtrl), "8c. no continuous invalidateSize");
}

{
  const fsCtrl = read("src/components/tracking/LiveMapFullscreenController.jsx");
  assert.match(fsCtrl, /saveMapCamera/, "9a. saves camera on enter");
  assert.match(fsCtrl, /restoreMapCamera/, "9b. restores camera on exit");
  const map = createMockMap();
  const saved = saveMapCamera(map);
  map.setView([12, 79], 10);
  restoreMapCamera(map, saved);
  assert.equal(map.getZoom(), 9, "9c. restore prior zoom");
}

{
  const tracking = read("src/pages/Tracking.jsx");
  assert.match(tracking, /onFitAll:/, "10a. Fit all wired to map toolbar");
  assert.match(tracking, /fitRequestId/, "10b. Fit all increments fit request");
  assert.match(read("src/components/map/MapEmployeeViewport.jsx"), /LIVE_FIT_OPTIONS/, "10c. normal fit options");
}

{
  const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
  assert.match(liveSrc, /gps_offline|MUTED_MARKER_OPACITY/, "11. offline markers remain visible");
}

{
  const maldives = { user_id: 99, latitude: 4.1755, longitude: 73.5093 };
  const locs = getValidEmployeeLocations([chennai, maldives]);
  assert.equal(locs.length, 1, "12. invalid/out-of-region excluded from fit");
  const map = createMockMap();
  fitLiveEmployeeCamera(map, locs, "fullscreen");
  assert.ok(!map.lastFit || map.getZoom() >= MULTI_EMPLOYEE_MIN_ZOOM, "12b. framing not destroyed");
}

{
  const stacked = spreadStackedEmployeeMarkers([
    { user_id: 1, latitude: 11.1, longitude: 78.1 },
    { user_id: 2, latitude: 11.1, longitude: 78.1 },
  ]);
  assert.equal(stacked.length, 2, "13. same-coordinate employees both kept");
  assert.ok(stacked.every((e) => e.stacked), "13b. stacked offset applied");
}

{
  assert.match(read("src/components/map/MapFullscreenButton.jsx"), /Escape/, "14. Esc exits fullscreen");
  assert.match(read("src/components/map/MapFullscreenButton.jsx"), /Exit fullscreen/, "14b. exit label");
}

{
  const viewport = read("src/components/map/MapEmployeeViewport.jsx");
  const tracking = read("src/pages/Tracking.jsx");
  assert.match(viewport, /refitMode = "once"/, "15a. once refit mode");
  assert.match(tracking, /refitMode="once"/, "15b. Tracking uses once");
  assert.match(viewport, /gps status must not refit/i, "15c. polls do not refit");
}

{
  const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
  assert.ok(!/zoom\s*[<>]|visibleMarkers/.test(liveSrc), "16. zoom does not filter marker count");
}

{
  const fsCtrl = read("src/components/tracking/LiveMapFullscreenController.jsx");
  assert.match(fsCtrl, /mapViewContainsAllMarkers/, "enter fullscreen checks marker visibility");
  assert.match(fsCtrl, /closePopup/, "popups closed before fullscreen fit");
}

console.log("All live map fullscreen assertions passed.");
