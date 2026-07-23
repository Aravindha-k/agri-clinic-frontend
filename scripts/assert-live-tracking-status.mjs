/**
 * Heartbeat-backed live tracking status assertions.
 * Run: node scripts/assert-live-tracking-status.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const {
  resolveCanonicalTrackingStatusKey,
  resolveCanonicalGpsStatusKey,
  resolveCanonicalDutyStatusKey,
  canonicalTrackingLabel,
  getDutyStatusColor,
  mergeLiveEmployeeUpdate,
  isNoLocationYet,
  isOnDutyWorking,
  normalizeLiveEmployee,
} = await import("../src/utils/dutyTracking.js");

const tracking = read("src/pages/Tracking.jsx");
const liveMarkers = read("src/components/tracking/LiveMapMarkers.jsx");
const popup = read("src/components/map/LiveEmployeeMapPopup.jsx");
const dutySrc = read("src/utils/dutyTracking.js");
const pollSrc = read("src/hooks/useAdaptivePolling.js");
const viewport = read("src/components/map/MapEmployeeViewport.jsx");

assert.equal(
  resolveCanonicalTrackingStatusKey({ tracking_status: "ONLINE" }),
  "gps_active",
  "1. ONLINE → gps_active"
);
assert.equal(
  resolveCanonicalTrackingStatusKey({ tracking_status: "STALE" }),
  "gps_stale",
  "1b. STALE"
);
assert.equal(
  resolveCanonicalTrackingStatusKey({ tracking_status: "OFFLINE" }),
  "gps_offline",
  "1c. OFFLINE"
);
assert.equal(
  resolveCanonicalTrackingStatusKey({ tracking_status: "NO_LOCATION_YET" }),
  "no_location",
  "1d. NO_LOCATION_YET"
);

assert.match(dutySrc, /tracking_status/, "2a. uses tracking_status");
assert.ok(
  !/ageMin <= GPS_ONLINE_MAX_MINUTES|Timestamp thresholds are authoritative/.test(dutySrc),
  "2b. age thresholds removed from status path"
);
assert.equal(
  resolveCanonicalGpsStatusKey({
    tracking_status: "ONLINE",
    location_recorded_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  }),
  "gps_active",
  "2c. old location still Online if backend says so"
);

assert.equal(
  getDutyStatusColor({ duty_status: "WORKING", tracking_status: "ONLINE" }),
  "green",
  "3. ONLINE green"
);
assert.equal(
  getDutyStatusColor({ duty_status: "WORKING", tracking_status: "STALE" }),
  "orange",
  "4. STALE amber"
);
assert.equal(
  getDutyStatusColor({ duty_status: "WORKING", tracking_status: "OFFLINE" }),
  "slate",
  "5a. OFFLINE slate"
);

const offline = normalizeLiveEmployee({
  user_id: 1,
  duty_status: "WORKING",
  tracking_status: "OFFLINE",
  latitude: 11.1,
  longitude: 78.1,
});
assert.equal(offline.latitude, 11.1, "5b. offline retains coords");
assert.equal(isNoLocationYet({ tracking_status: "NO_LOCATION_YET" }), true, "6. no location flag");

const emp = { duty_status: "WORKING", tracking_status: "OFFLINE", gps_enabled: false };
assert.equal(resolveCanonicalDutyStatusKey(emp), "working", "7a. duty working");
assert.equal(resolveCanonicalTrackingStatusKey(emp), "gps_offline", "7b. tracking offline");
assert.equal(isOnDutyWorking(emp), true, "7c. still on duty");
assert.equal(canonicalTrackingLabel(emp), "Offline", "7d. label Offline");

const prev = {
  user_id: 1,
  latitude: 11.0,
  longitude: 78.0,
  location_recorded_at: "2026-07-23T10:00:00.000Z",
  tracking_status: "ONLINE",
};
const older = {
  user_id: 1,
  latitude: 12.0,
  longitude: 79.0,
  location_recorded_at: "2026-07-23T09:00:00.000Z",
  tracking_status: "STALE",
};
const newer = {
  user_id: 1,
  latitude: 11.5,
  longitude: 78.5,
  location_recorded_at: "2026-07-23T11:00:00.000Z",
  tracking_status: "ONLINE",
};
assert.equal(mergeLiveEmployeeUpdate(prev, older).latitude, 11.0, "10. older response cannot overwrite coords");
assert.equal(mergeLiveEmployeeUpdate(prev, newer).latitude, 11.5, "9. newer coordinate moves marker");

assert.match(tracking, /liveRequestSeqRef/, "10b. request sequence");
assert.match(tracking, /AbortController/, "10c. abort controller");
assert.match(tracking, /mergeLiveEmployeeUpdate/, "10d. merge on poll");
assert.match(tracking, /LIVE_TRACKING_POLL_MS|REFRESH_INTERVAL/, "11. 60s poll");
assert.match(pollSrc, /visibilityState === "hidden"/, "12. hidden pauses");
assert.match(pollSrc, /visibilitychange/, "13. visible refresh");
assert.match(tracking, /loadData\(true\)/, "14. manual refresh");
assert.match(tracking, /refitMode="once"/, "15. polling does not refit");
assert.match(viewport, /LIVE_FIT_OPTIONS/, "16. Fit all uses live options");
assert.match(tracking, /isNoLocationYet/, "17. Fit/map excludes NO_LOCATION_YET");
assert.match(tracking, /Showing the last known locations/, "18. temp error preserves snapshot UI");
assert.match(tracking, /saveLiveTrackingSnapshot/, "18b. snapshot save");
assert.match(tracking, /isOnDutyWorking/, "19. duty end removes via backend list");
assert.match(read("scripts/assert-day-map-markers.mjs"), /Start|Visit|End|start|visit|end/, "20. route history regression");
assert.ok(!liveMarkers.includes("Polyline"), "21. no polyline on live map");
assert.match(popup, /Last heartbeat/, "22. heartbeat section");
assert.match(popup, /Last location/, "22b. location time section");
assert.match(popup, /gpsHardwareLabel|GPS \{gpsHw\}/, "22c. GPS enabled label");

const empty = normalizeLiveEmployee({
  user_id: 9,
  duty_status: "WORKING",
  tracking_status: "NO_LOCATION_YET",
});
assert.equal(empty.latitude, null, "23. empty coords do not break");
assert.equal(canonicalTrackingLabel(empty), "No Location Yet", "23b");
assert.match(tracking, /LiveMapFullscreenController/, "24. fullscreen shares live map state");
assert.equal(
  resolveCanonicalTrackingStatusKey({ location_recorded_at: new Date().toISOString() }),
  "unknown",
  "missing status → unknown"
);

console.log("All heartbeat live-tracking status assertions passed.");
