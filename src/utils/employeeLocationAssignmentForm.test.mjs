import assert from "node:assert/strict";
import {
  addVillagesToGroups,
  buildAssignmentsPayloadFromGroups,
  countsFromGroups,
  diffVillageIds,
  filterAssignableVillages,
  filterVillagesByPrefix,
  formatTerritorySummary,
  isOrphanVillage,
  nestAssignmentGroups,
  parseAssignmentGroups,
  removeVillagesFromGroups,
  villageIdsFromGroups,
} from "./employeeLocationAssignmentForm.js";
import { startsWithSearch } from "./searchMatch.js";

const districtA = { id: 1, name: "District A" };
const talukA = { id: 10, name: "Taluk A" };
const districtB = { id: 2, name: "District B" };
const talukB = { id: 20, name: "Taluk B" };

let groups = parseAssignmentGroups([
  {
    district: districtA,
    taluk: talukA,
    villages: [
      { id: 101, name: "A1" },
      { id: 102, name: "A2" },
    ],
  },
]);

assert.deepEqual(villageIdsFromGroups(groups), [101, 102]);

groups = addVillagesToGroups(groups, {
  district_id: 2,
  district_name: "District B",
  taluk_id: 20,
  taluk_name: "Taluk B",
  villages: [{ id: 201, name: "B1" }],
});

assert.deepEqual(villageIdsFromGroups(groups), [101, 102, 201]);

const payloadAfterAdd = buildAssignmentsPayloadFromGroups(groups);
assert.equal(payloadAfterAdd.assignments.length, 2);
assert.deepEqual(
  payloadAfterAdd.assignments.find((g) => g.taluk_id === 10).village_ids,
  [101, 102]
);
assert.deepEqual(
  payloadAfterAdd.assignments.find((g) => g.taluk_id === 20).village_ids,
  [201]
);

groups = removeVillagesFromGroups(groups, [102]);
assert.deepEqual(villageIdsFromGroups(groups), [101, 201]);

const payloadAfterRemove = buildAssignmentsPayloadFromGroups(groups);
assert.deepEqual(
  payloadAfterRemove.assignments.find((g) => g.taluk_id === 10).village_ids,
  [101]
);
assert.deepEqual(
  payloadAfterRemove.assignments.find((g) => g.taluk_id === 20).village_ids,
  [201]
);

const nested = nestAssignmentGroups(groups);
assert.equal(nested.length, 2);
assert.equal(nested[0].district_name, "District A");
assert.equal(nested[0].taluks[0].villages.length, 1);
assert.equal(nested[1].district_name, "District B");

const summary = countsFromGroups(groups);
assert.equal(formatTerritorySummary(summary), "2 Districts · 2 Taluks · 2 Villages");

const diff = diffVillageIds([101, 102], [101, 201]);
assert.deepEqual(diff.added, [201]);
assert.deepEqual(diff.removed, [102]);
assert.deepEqual(diff.unchanged, [101]);

const assignable = filterAssignableVillages(
  [
    { id: 1, name: "A1", taluk_id: 10, is_active: true },
    { id: 2, name: "Orphan", taluk_id: null, is_active: true },
    { id: 3, name: "Wrong taluk", taluk_id: 99, is_active: true },
    { id: 4, name: "Inactive", taluk_id: 10, is_active: false },
    { id: 5, name: "Lightweight" },
  ],
  10
);
assert.deepEqual(
  assignable.map((v) => v.id).sort((a, b) => a - b),
  [1, 5]
);
assert.equal(isOrphanVillage({ id: 2, taluk_id: null }), true);
assert.equal(isOrphanVillage({ id: 1, taluk_id: 10 }), false);

const talukVillages = [
  { id: 1, name: "Avudaiyarpattu" },
  { id: 2, name: "Erichinampalayam" },
  { id: 3, name: "Ganapathipattu" },
];
assert.deepEqual(
  filterVillagesByPrefix(talukVillages, "Avu").map((v) => v.name),
  ["Avudaiyarpattu"]
);
assert.deepEqual(filterVillagesByPrefix(talukVillages, "vud"), []);
assert.equal(startsWithSearch("Vikravandi", "Vik"), true);
assert.equal(startsWithSearch("Vikravandi", "kra"), false);
assert.equal(startsWithSearch("Avudaiyarpattu", "A"), true);
assert.equal(startsWithSearch("Avudaiyarpattu", "pattu"), false);

const selectAllCurrentTaluk = filterAssignableVillages(
  [
    { id: 1, name: "A1", taluk_id: 10 },
    { id: 2, name: "A2", taluk_id: 10 },
    { id: 3, name: "Other", taluk_id: 20 },
  ],
  10
).map((v) => v.id);
assert.deepEqual(selectAllCurrentTaluk, [1, 2]);

console.log("employeeLocationAssignmentForm territory checks OK");
