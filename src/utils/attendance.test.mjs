import assert from "node:assert/strict";
import {
  formatWorkedSeconds,
  formatTimeOnly,
  verificationLabel,
  statusLabel,
  aggregateByShop,
  attendanceErrorMessage,
  pairingSecondsLeft,
  formatPairingCountdown,
  isDevicePaired,
} from "./attendance.js";

assert.equal(formatWorkedSeconds(null), "—");
assert.equal(formatWorkedSeconds(0), "0m");
assert.equal(formatWorkedSeconds(60), "1m");
assert.equal(formatWorkedSeconds(3600 + 23 * 60), "1h 23m");

assert.equal(formatTimeOnly("09:05:00"), "9:05 AM");
assert.equal(formatTimeOnly("18:30"), "6:30 PM");
assert.equal(formatTimeOnly(null), "—");

assert.equal(verificationLabel("TEST_MANUAL"), "Test / manual");
assert.equal(verificationLabel("BIOMETRIC"), "Biometric verified");
assert.equal(verificationLabel("ADMIN_ADJUST"), "Admin adjustment");
assert.equal(verificationLabel("OTHER"), "OTHER");

assert.equal(statusLabel("PRESENT"), "Present");
assert.equal(statusLabel("HALF_DAY"), "Half day");
assert.equal(statusLabel("INCOMPLETE"), "Incomplete");

const agg = aggregateByShop([
  { shop_code: "S1", status: "PRESENT", worked_seconds: 3600, has_open_session: false, contains_test_events: true },
  { shop_code: "S1", status: "INCOMPLETE", worked_seconds: 0, has_open_session: true, contains_test_events: false },
  { shop_code: "S2", status: "HALF_DAY", worked_seconds: 1800, has_open_session: false, contains_test_events: false },
]);
assert.equal(agg.length, 2);
assert.equal(agg[0].shop_code, "S1");
assert.equal(agg[0].present, 1);
assert.equal(agg[0].incomplete, 1);
assert.equal(agg[0].openSessions, 1);
assert.equal(agg[0].testRows, 1);
assert.equal(agg[0].workedSeconds, 3600);
assert.equal(agg[1].halfDay, 1);

assert.equal(
  attendanceErrorMessage({ response: { data: { message: "Denied" } } }),
  "Denied"
);
assert.equal(
  attendanceErrorMessage({ response: { data: { employee: ["required"] } } }),
  "required"
);
assert.equal(attendanceErrorMessage({ message: "x" }), "Network error — is the API reachable?");

console.log("attendance.test.mjs: all assertions passed");

// --- pairing helpers -------------------------------------------------------
{
  const expires = new Date(Date.now() + 300_000).toISOString();
  assert.equal(pairingSecondsLeft(null), null);
  const left = pairingSecondsLeft(expires, Date.now());
  assert.ok(left > 295 && left <= 300, `expected ~300s, got ${left}`);
  assert.equal(pairingSecondsLeft(new Date(Date.now() - 1000).toISOString(), Date.now()), 0);
  assert.equal(pairingSecondsLeft("not-a-date", Date.now()), 0); // NaN → treated expired... check
  assert.equal(formatPairingCountdown(305), "5:05");
  assert.equal(formatPairingCountdown(0), "0:00");
  assert.equal(formatPairingCountdown(null), "");
  assert.equal(
    isDevicePaired([{ device_uid: "K1", is_active: true }], "K1"),
    true
  );
  assert.equal(
    isDevicePaired([{ device_uid: "K1", is_active: false }], "K1"),
    false
  );
  assert.equal(isDevicePaired([], "K1"), false);
  assert.equal(isDevicePaired(null, "K1"), false);
}
