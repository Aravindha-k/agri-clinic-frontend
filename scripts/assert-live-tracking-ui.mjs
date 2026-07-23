/**
 * Live Tracking UI assertions — clean map card, selection, compact tooltip.
 * Run: node scripts/assert-live-tracking-ui.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const tracking = read("src/pages/Tracking.jsx");
const liveMarkers = read("src/components/tracking/LiveMapMarkers.jsx");
const selectedSummary = read("src/components/tracking/LiveTrackingSelectedSummary.jsx");
const panController = read("src/components/tracking/LiveMapPanController.jsx");

assert.match(tracking, /AdminMapCard/, "1. live map uses shared shell");
assert.match(tracking, /LiveTrackingSelectedSummary/, "1b. selected summary component");
assert.match(tracking, /active employee.*online.*offline/, "2. header counts active/online/offline");
assert.match(tracking, /selectEmployee/, "3. marker/roster selection handler");
assert.match(selectedSummary, /MapOpenInMapsButton/, "5. Open in Maps in selected summary");
assert.match(liveMarkers, /gps_offline|MUTED_MARKER_OPACITY/, "6. offline marker styling preserved");
assert.match(liveMarkers, /latitude != null/, "7. no fake marker without coords");
assert.match(liveMarkers, /live-employee-tooltip-compact/, "8. compact hover tooltip");
assert.match(liveMarkers, /<Popup/, "9. click popup for details");
assert.match(liveMarkers, /onSelect\?\.\(emp\)/, "9b. click selects employee");
assert.match(tracking, /LiveMapFullscreenController/, "9c. fullscreen camera controller");
assert.match(tracking, /onFitAll:/, "9d. map toolbar Fit all");
assert.match(panController, /panTo/, "10. roster selection pans without refit");
assert.ok(!liveMarkers.includes("fitBounds") && !liveMarkers.includes("setView"), "9c. marker click does not refit");
assert.match(tracking, /fitRequestId/, "10b. Fit all control present");
assert.match(read("src/utils/mapCoordinates.js"), /Employee-only bounds/, "11. fit excludes TN centre merge");
assert.match(tracking, /Offline employees remain visible/, "12. footer message");
assert.match(tracking, /Updating employee locations/, "13. loading preserves map shell");
assert.match(tracking, /No employees currently have an active workday/, "13b. empty duty message");
assert.match(tracking, /No employee locations are available yet/, "13c. no coords message");
assert.match(tracking, /Showing the last known locations/, "13d. error message");
assert.ok(!liveMarkers.includes("Polyline"), "15. no polyline rendered");
assert.match(tracking, /tracking-emp-card--selected/, "4. roster highlight class");
assert.match(liveMarkers, /selectedUserId/, "4b. selected marker highlight");
assert.match(tracking, /mapSize="live"/, "14. live map responsive size token");
assert.match(tracking, /resolveCanonicalTrackingStatusKey|tracking_status/, "16. backend tracking status");
assert.match(tracking, /Waiting for first GPS update/, "17. no-location copy");

console.log("All live tracking UI assertions passed.");
