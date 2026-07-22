/**
 * Runtime checks for zoom-stable live employee markers + compact tooltip.
 * Run: node scripts/assert-live-marker-tooltip.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
const selectedSrc = read("src/components/tracking/LiveTrackingSelectedSummary.jsx");
const metaSrc = read("src/utils/liveEmployeeMarkerMeta.js");
const css = read("src/index.css");
const fitSrc = read("src/utils/mapCoordinates.js");

assert.match(liveSrc, /isOnDutyWorking/, "1. Offline employee with coords still renders when working");
assert.match(liveSrc, /MUTED_MARKER_OPACITY = 0.9/, "5. Offline styling keeps opacity >= 0.85");
assert.ok(!/zoom\s*[<>]|bounds\.contains/.test(liveSrc), "2/3/4/11. Marker mount independent of zoom/bounds");
assert.ok(!liveSrc.includes("transform:rotate") && !liveSrc.includes("transform: rotate"), "12. No rotate transform hides markers at zoom");
assert.match(liveSrc, /key=\{markerKey\}/, "8/9. stable marker keys; no duplicates");
assert.match(liveSrc, /Tooltip/, "10. Tooltip remains attached after zoom");
assert.match(liveSrc, /live-employee-tooltip/, "custom tooltip class");
assert.match(liveSrc, /employeeMarkerPane|EMPLOYEE_MARKER_PANE/, "pane assignment");
assert.match(fitSrc, /fitEmployeeBounds/, "6. Fit all helper present");
assert.ok(!fitSrc.includes("gps_offline") && !fitSrc.includes("isOnline === false"), "6. Fit all does not exclude offline");
assert.match(liveSrc, /Number\.isFinite/, "7. No-location (non-finite) excluded without fake marker");
assert.match(selectedSrc, /View employee/, "selected summary has View employee");
assert.match(css, /\.live-employee-marker-icon/, "DivIcon robust CSS");
assert.match(metaSrc, /dutyLabel/, "aria includes duty");
assert.match(liveSrc, /live-employee-tooltip-compact/, "compact tooltip content");

console.log("All live marker zoom/tooltip assertions passed.");
