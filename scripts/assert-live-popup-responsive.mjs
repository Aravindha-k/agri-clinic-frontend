/**
 * Assertions for live location summary + location label resolution.
 * Run: node scripts/assert-live-popup-responsive.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const css = read("src/index.css");
const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
const summarySrc = read("src/components/tracking/LiveTrackingSelectedSummary.jsx");
const metaSrc = read("src/utils/liveEmployeeMarkerMeta.js");
const geoSrc = read("src/utils/reverseGeocode.js");
const hookSrc = read("src/hooks/useLiveEmployeeLocation.js");

assert.match(css, /live-tracking-selected-summary/, "1. selected summary responsive layout");
assert.match(css, /@media \(max-width: 768px\)/, "2. tablet breakpoint");
assert.match(css, /live-employee-tooltip-compact/, "2b. compact tooltip styles");
assert.match(css, /@media \(max-width: 480px\)/, "3. mobile breakpoint");
assert.match(css, /admin-map-shell--live/, "3b. live map height token");
assert.match(summarySrc, /MapOpenInMapsButton/, "4. selected summary has Open in Maps");
assert.match(summarySrc, /useLiveEmployeeLocation/, "5. summary resolves location via hook");
assert.ok(!liveSrc.includes("setZoom") && !/flyTo|setView/.test(liveSrc), "5b. marker click does not zoom/refit");
assert.match(summarySrc, /View employee/, "6. view employee action");
assert.match(metaSrc, /area_name/, "7. location uses area_name");
assert.match(metaSrc, /District/, "8. city/district fallback");
assert.match(hookSrc, /roundedKey|toFixed\(5\)/, "9. reverse geocode only when coords change");
assert.match(geoSrc, /inflight/, "10. reverse-geocoding single-flight / cache");
assert.match(metaSrc, /Coordinates available/, "11. missing location shows coordinates fallback");
assert.match(metaSrc, /Asia\/Kolkata|BUSINESS_TIME_ZONE/, "12. exact time uses Asia/Kolkata");
assert.match(css, /word-break:\s*break-word/, "13. long location wraps safely");
assert.match(css, /overflow-x:\s*hidden/, "14. no horizontal scrolling");
assert.match(liveSrc, /live-employee-tooltip-compact/, "compact hover tooltip present");

console.log("All live popup responsive/location assertions passed.");
