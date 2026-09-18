import assert from "node:assert/strict";
import {
  addVillagesToList,
  buildAssignmentsPayloadFromVillages,
  countsFromVillages,
  diffVillageIds,
  filterAssignableVillages,
  filterVillagesByPrefix,
  formatTerritorySummary,
  parseAssignedVillages,
  removeVillagesFromList,
  villageIdsFromList,
} from "./employeeLocationAssignmentForm.js";
import { startsWithSearch } from "./searchMatch.js";

const villageA = { id: 101, name: "A", district: null, taluk: null, is_active: true };
const villageB = { id: 102, name: "B", district: null, taluk: null, is_active: true };
const villageC = { id: 201, name: "C", district: null, taluk: null, is_active: true };

let villages = parseAssignedVillages({ village_ids: [101, 102] }, new Map([
  [101, villageA],
  [102, villageB],
  [201, villageC],
]));

assert.deepEqual(villageIdsFromList(villages), [101, 102]);

villages = addVillagesToList(villages, [villageC]);
assert.deepEqual(villageIdsFromList(villages), [101, 102, 201]);

const payloadAfterAdd = buildAssignmentsPayloadFromVillages(
  parseAssignedVillages({ village_ids: [101, 102] }, new Map([[101, villageA], [102, villageB]]))
);
assert.deepEqual(payloadAfterAdd, { village_ids: [101, 102] });
assert.equal("assignments" in payloadAfterAdd, false);
assert.equal("district_id" in payloadAfterAdd, false);
assert.equal("taluk_id" in payloadAfterAdd, false);

villages = removeVillagesFromList(
  parseAssignedVillages({ village_ids: [101, 102] }, new Map([[101, villageA], [102, villageB]])),
  [101]
);
assert.deepEqual(villageIdsFromList(villages), [102]);
assert.deepEqual(buildAssignmentsPayloadFromVillages(villages), { village_ids: [102] });
assert.equal(formatTerritorySummary(countsFromVillages(villages)), "Assigned Villages: 1");
assert.equal(formatTerritorySummary({ village_count: 23 }), "Assigned Villages: 23");
assert.equal(formatTerritorySummary({ village_count: 0 }), "No villages assigned");

const assignable = filterAssignableVillages([
  { id: 1, name: "A1", district: null, taluk: null, is_active: true },
  { id: 2, name: "Standalone", taluk_id: null, district_id: null, is_active: true },
  { id: 3, name: "Inactive", district: null, taluk: null, is_active: false },
  { id: 4, name: "Kedar", name_ta: "கேதார்", is_active: true },
]);
assert.deepEqual(
  assignable.map((v) => v.id).sort((a, b) => a - b),
  [1, 2, 4]
);

const prefixVillages = [
  { id: 1, name: "Avudaiyarpattu", name_ta: "அவுடையார்பட்டு" },
  { id: 2, name: "Kedar", name_ta: "கேதார்" },
  { id: 3, name: "Vikravandi" },
];
assert.deepEqual(filterVillagesByPrefix(prefixVillages, "Avu").map((v) => v.name), ["Avudaiyarpattu"]);
assert.deepEqual(filterVillagesByPrefix(prefixVillages, "vud"), []);
assert.deepEqual(filterVillagesByPrefix(prefixVillages, "Ked").map((v) => v.name), ["Kedar"]);
assert.deepEqual(filterVillagesByPrefix(prefixVillages, "edar"), []);
assert.deepEqual(filterVillagesByPrefix(prefixVillages, "கே").map((v) => v.name), ["Kedar"]);
assert.equal(startsWithSearch("Vikravandi", "Vik"), true);
assert.equal(startsWithSearch("Vikravandi", "kra"), false);

const diff = diffVillageIds([101, 102], [102]);
assert.deepEqual(diff.added, []);
assert.deepEqual(diff.removed, [101]);
assert.deepEqual(diff.unchanged, [102]);

console.log("employeeLocationAssignmentForm territory checks OK");
