/**
 * Assertions for responsive live popup + location label resolution.
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
const popupSrc = read("src/components/map/LiveEmployeeMapPopup.jsx");
const metaSrc = read("src/utils/liveEmployeeMarkerMeta.js");
const geoSrc = read("src/utils/reverseGeocode.js");
const hookSrc = read("src/hooks/useLiveEmployeeLocation.js");

assert.match(css, /min\(320px,\s*calc\(100vw - 48px\)\)/, "1. desktop/laptop responsive width");
assert.match(css, /@media \(max-width: 768px\)/, "2. tablet breakpoint");
assert.match(css, /min\(280px,\s*calc\(100vw - 32px\)\)/, "2b. 768px width");
assert.match(css, /@media \(max-width: 480px\)/, "3. mobile breakpoint");
assert.match(css, /min\(260px,\s*calc\(100vw - 24px\)\)/, "3b. 390px-class width");
assert.match(liveSrc, /keepInView=\{true\}/, "4. popup stays inside map viewport");
assert.match(liveSrc, /autoPan=\{true\}/, "5. popup auto-pans");
assert.ok(!liveSrc.includes("setZoom") && !/flyTo|setView/.test(liveSrc), "5b. no zoom on popup open");
assert.match(liveSrc, /closeButton=\{true\}/, "6. close button enabled");
assert.match(metaSrc, /area_name/, "7. location uses area_name");
assert.match(metaSrc, /District/, "8. city/district fallback");
assert.match(hookSrc, /roundedKey|toFixed\(5\)/, "9. reverse geocode only when coords change");
assert.match(geoSrc, /inflight/, "10. reverse-geocoding single-flight / cache");
assert.match(metaSrc, /Coordinates available/, "11. missing location shows coordinates fallback");
assert.match(metaSrc, /Asia\/Kolkata|BUSINESS_TIME_ZONE/, "12. exact time uses Asia/Kolkata");
assert.match(css, /text-overflow:\s*ellipsis/, "13. long employee name ellipsis");
assert.match(css, /overflow-x:\s*hidden/, "14. no horizontal scrolling");
assert.match(popupSrc, /useLiveEmployeeLocation/, "popup resolves location via hook");
assert.match(liveSrc, /autoPanPaddingTopLeft=\{\[24,\s*120\]\}/, "top padding 120 for header clearance");

console.log("All live popup responsive/location assertions passed.");
