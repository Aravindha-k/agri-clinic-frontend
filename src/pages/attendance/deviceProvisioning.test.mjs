/**
 * Guards the 6-digit pairing workflow: the legacy long-token modal must not
 * be reachable from the normal device provisioning flow, and no token may be
 * displayed, logged or persisted by the devices UI.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./AttendanceDevices.jsx", import.meta.url), "utf8");
const modal = readFileSync(new URL("../../components/attendance/PairingCodeModal.jsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../../api/attendance.api.js", import.meta.url), "utf8");

// Legacy token modal must be gone from the page entirely.
assert.ok(!page.includes("DeviceTokenModal"), "DeviceTokenModal still referenced in AttendanceDevices");
assert.ok(!page.includes("issuedToken"), "issuedToken state still present");
assert.ok(!page.includes("setIssuedToken"), "setIssuedToken still called");
assert.ok(!page.includes("registerDevice("), "legacy registerDevice used on the page");

// Pairing wizard is the only provisioning path.
assert.ok(page.includes("createPairingCode("), "pairing-code flow missing");
assert.ok(page.includes("pairing-codes") || api.includes("pairing-codes/"), "pairing-codes endpoint missing");

// No long token may be rendered, logged or persisted in the devices UI.
assert.ok(!page.includes("console.log"), "console.log present in devices page");
assert.ok(!page.match(/localStorage|sessionStorage/), "browser storage used in devices page");
assert.ok(!modal.includes("token=") && !modal.includes(".token"), "token rendered in PairingCodeModal");
assert.ok(!modal.includes("console.log"), "console.log present in PairingCodeModal");

// The admin never types a Device UID in the pairing wizard.
assert.ok(!page.includes("device_uid:") || !page.includes('name="device_uid"'), "manual device_uid input present");
assert.ok(!page.includes('value={form.device_uid'), "device_uid form field present");

// Dev-only static code 246810 must never appear in frontend code.
assert.ok(!page.includes("246810") && !modal.includes("246810") && !api.includes("246810"),
  "dev-only pairing code leaked into frontend");

console.log("deviceProvisioning.test.mjs: all assertions passed");
