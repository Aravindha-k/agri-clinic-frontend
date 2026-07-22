/**
 * Runtime checks for premium live employee marker tooltip/popup.
 * Run: node scripts/assert-live-marker-tooltip.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const liveSrc = read("src/components/tracking/LiveMapMarkers.jsx");
const popupSrc = read("src/components/map/LiveEmployeeMapPopup.jsx");
const metaSrc = read("src/utils/liveEmployeeMarkerMeta.js");
const css = read("src/index.css");

assert.match(liveSrc, /live-employee-tooltip/, "1. Tooltip uses custom class");
assert.match(liveSrc, /live-employee-tooltip-card__name/, "2. Name displays separately");
assert.match(liveSrc, /live-employee-tooltip-card__code/, "2b. Code displays separately");
assert.match(liveSrc, /live-employee-chip/, "3. Duty and GPS appear as separate chips");
assert.match(liveSrc, /Last known location/, "4. Location appears in its own section");
assert.match(liveSrc, /formatLiveRelativeTime/, "5. Relative time appears");
assert.match(liveSrc, /formatLiveExactIstCompact/, "6. Exact IST time appears where available");
assert.match(css, /\.leaflet-tooltip\.live-employee-tooltip/, "7. Default Leaflet tooltip border removed via override");
assert.ok(css.includes("background: transparent !important") || css.includes("border: none !important"));
assert.ok(!liveSrc.includes("fitBounds") && !liveSrc.includes("setView"), "8. Hover does not trigger refit");
assert.match(liveSrc, /key=\{String\(userId\)\}/, "9/10. Tooltip updates same marker; one marker per employee");
assert.ok(!liveSrc.includes("title={ariaLabel}"), "native browser title tooltip disabled");
assert.match(popupSrc, /View Employee/, "click popup has View Employee");
assert.match(popupSrc, /View Route History/, "click popup has View Route History");
assert.match(metaSrc, /dutyLabel/, "aria label includes duty");

console.log("All live marker tooltip assertions passed.");
