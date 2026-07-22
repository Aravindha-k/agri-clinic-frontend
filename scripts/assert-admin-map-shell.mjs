/**
 * Shared admin map shell assertions.
 * Run: node scripts/assert-admin-map-shell.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGoogleMapsSearchUrl } from "../src/utils/mapUrls.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const tracking = read("src/pages/Tracking.jsx");
const routeView = read("src/components/tracking/EmployeeRouteMapView.jsx");
const dashboard = read("src/components/dashboard/DashboardLiveMap.jsx");
const visitDetail = read("src/pages/VisitDetail.jsx");
const visitLoc = read("src/components/visits/VisitLocationDisplay.jsx");
const farmerDetail = read("src/pages/FarmerDetail.jsx");
const adminCard = read("src/components/map/AdminMapCard.jsx");
const mapHeader = read("src/components/map/MapLocationHeader.jsx");
const mapFooter = read("src/components/map/MapInfoFooter.jsx");
const mapCanvas = read("src/components/map/MapCanvas.jsx");
const mapBtn = read("src/components/map/MapOpenInMapsButton.jsx");
const liveMarkers = read("src/components/tracking/LiveMapMarkers.jsx");
const css = read("src/index.css");

assert.match(adminCard, /MapLocationHeader/, "1. shared shell uses location header");
assert.match(adminCard, /MapCanvas/, "1b. shared shell uses map canvas");
assert.match(adminCard, /MapInfoFooter/, "1c. shared shell uses info footer");

for (const src of [tracking, routeView, dashboard, visitLoc]) {
  assert.match(src, /AdminMapCard/, "1d. map page uses AdminMapCard");
}

assert.match(mapCanvas, /AdminMapFrame/, "2. map always mounts via AdminMapFrame");
assert.match(routeView, /No location points were recorded/, "2b. zero markers keeps map with overlay");

assert.match(mapHeader, /admin-map-location-header/, "3. location header component");
assert.match(mapHeader, /formatCoordinates/, "4. coordinates in header");

{
  const url = buildGoogleMapsSearchUrl(10.77542, 78.68586);
  assert.match(url, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/, "5. Open in Maps URL format");
  assert.match(decodeURIComponent(url), /10\.77542,78\.68586/, "5b. query encodes lat,lng");
  assert.match(mapBtn, /buildGoogleMapsSearchUrl/, "5c. button uses shared URL helper");
  assert.match(mapBtn, /noopener noreferrer/, "5d. safe external link");
}

assert.match(tracking, /Markers show each active employee/, "6a. live footer");
assert.match(routeView, /Start, submitted Visit and End/, "6b. route footer");
assert.match(visitLoc, /field proof of location/, "6c. visit footer");
assert.match(farmerDetail, /FarmerFieldLocationMap/, "6d. farmer map footer path");

assert.match(liveMarkers, /key=\{String\(userId\)\}/, "7. one marker per employee");
assert.ok(!liveMarkers.includes("Polyline"), "8. live has no polyline");
assert.match(routeView, /marker\.type === "start"/, "8b. route start marker");
assert.match(routeView, /marker\.type === "end"/, "8c. route end marker");
assert.match(visitLoc, /<Marker/, "9. visit detail one marker");
assert.ok(!routeView.includes("Polyline") && !liveMarkers.includes("Polyline"), "10. no polyline");

assert.match(read("src/utils/mapCoordinates.js"), /SINGLE_EMPLOYEE_ZOOM = 12/, "11. single marker zoom");
assert.match(read("src/utils/mapCoordinates.js"), /MULTI_EMPLOYEE_MAX_ZOOM = 11/, "12. multi marker max zoom");

assert.match(mapCanvas, /MapErrorBoundary|AdminMapFrame/, "13. loading/error does not unmount map shell");
assert.match(css, /@media \(max-width: 768px\)/, "14. responsive map shell rules");
assert.match(liveMarkers, /autoPanPaddingTopLeft=\{\[24,\s*120\]\}/, "15. popup stays in view");

assert.ok(!visitDetail.includes("MapContainer"), "visit detail uses shared shell not raw MapContainer");
assert.ok(!dashboard.includes("MapContainer"), "dashboard uses shared shell not raw MapContainer");

console.log("All admin map shell assertions passed.");
