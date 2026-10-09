import assert from "node:assert/strict";
import { visitMarkerKind, MARKER_KIND } from "./mapMarkerKind.js";
import { empName } from "./trackingDisplay.js";

// ── visitMarkerKind: explicit fields only ──
assert.equal(visitMarkerKind(null), MARKER_KIND.UNKNOWN);
assert.equal(visitMarkerKind("x"), MARKER_KIND.UNKNOWN);
assert.equal(visitMarkerKind({}), MARKER_KIND.UNKNOWN);

assert.equal(visitMarkerKind({ visit_type: "Irrigation check" }), MARKER_KIND.IRRIGATION);
assert.equal(visitMarkerKind({ purpose: "soil sampling" }), MARKER_KIND.SOIL);
assert.equal(visitMarkerKind({ visit_type: "pest scouting" }), MARKER_KIND.PEST);
assert.equal(visitMarkerKind({ visit_type: "advisory" }), MARKER_KIND.ADVISORY);

// problems[] categories → pest/disease
assert.equal(
  visitMarkerKind({ id: 1, problems: [{ category: "Pest" }] }),
  MARKER_KIND.PEST
);
assert.equal(
  visitMarkerKind({ id: 1, problems: [{ category: "Disease" }] }),
  MARKER_KIND.DISEASE
);
assert.equal(
  visitMarkerKind({ id: 2, problem_description: "whitefly on brinjal" }),
  MARKER_KIND.PEST
);

// crop context → crop inspection
assert.equal(
  visitMarkerKind({ visitId: 9, crop_name: "Paddy" }),
  MARKER_KIND.CROP
);

// visit with no category → generic field visit (sprout), never "unknown"
assert.equal(visitMarkerKind({ id: 3 }), MARKER_KIND.VISIT);
assert.equal(visitMarkerKind({ latitude: 11.1, longitude: 78.2 }), MARKER_KIND.VISIT);

// ── empName: never a database id ──
assert.equal(empName({ employee_name: "Ravi Kumar" }), "Ravi Kumar");
assert.equal(empName({ username: "field_agent_1" }), "field_agent_1");
assert.equal(empName({ employee_id: "KAC-0004" }), "KAC-0004");
assert.equal(empName({ employee_id: 42 }), "Unknown");
assert.equal(empName({ employee_id: "17" }), "Unknown");
assert.equal(empName({}), "Unknown");

console.log("mapMarkerKind + empName checks OK");
