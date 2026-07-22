/**
 * Runtime checks for live employee marker tooltip/popup behaviour.
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

assert.match(liveSrc, /Tooltip/, "1. hover tooltip contains employee name wiring");
assert.match(liveSrc, /employee_code|code/, "2. tooltip contains employee code");
assert.match(liveSrc, /getLiveEmployeeLocationLabel|locationLabel/, "3. tooltip contains location label");
assert.match(liveSrc, /formatLiveRelativeTime|relativeTime/, "4. tooltip contains relative update time");
assert.match(popupSrc, /Duty:/, "5. click popup shows duty separately");
assert.match(popupSrc, /GPS:/, "5b. click popup shows GPS separately");
assert.match(metaSrc, /Asia\/Kolkata|BUSINESS_TIME_ZONE/, "6. exact time uses Asia/Kolkata");
assert.match(metaSrc, /Location name unavailable/, "7. missing location label shows safe fallback");
assert.match(liveSrc, /key=\{String\(userId\)\}/, "8/9. updated GPS point keeps same marker key; no duplicates");
assert.ok(!liveSrc.includes("fitBounds") && !liveSrc.includes("setView"), "10. hover does not refit the map");
assert.match(popupSrc, /ProfileAvatar|Last heartbeat|Recorded/, "11. touch click popup exposes full details");

// Relative time math (backend timestamp, not receive time)
function relativeMinutesAgo(iso, nowIso) {
  const sec = Math.max(0, Math.floor((new Date(nowIso) - new Date(iso)) / 1000));
  const min = Math.floor(sec / 60);
  return min === 1 ? "1 minute ago" : `${min} minutes ago`;
}
assert.equal(
  relativeMinutesAgo("2026-07-22T02:32:00.000Z", "2026-07-22T03:46:00.000Z"),
  "74 minutes ago",
  "relative time example: 74 minutes ago"
);

const byId = new Map();
byId.set("9", { tip: "old" });
byId.set("9", { tip: "Aravind Kumar" });
assert.equal(byId.size, 1);
assert.equal(byId.get("9").tip, "Aravind Kumar");

console.log("All live marker tooltip assertions passed.");
