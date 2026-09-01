import assert from "node:assert/strict";
import {
  matchesAnyFieldPrefix,
  normalizeSearchValue,
  startsWithSearch,
  employeeMatchesPrefixSearch,
  buildEmployeeSearchFields,
} from "./searchMatch.js";

const fixture = {
  first_name: "Aravindh",
  last_name: "",
  employee_id: "KAC-0003",
  phone: "9626262922",
  district_name: "Villupuram",
  village_names: ["Kedar"],
};

assert.equal(normalizeSearchValue("  ARAV  "), "arav");
assert.equal(startsWithSearch("Aravindh", "Ara"), true);
assert.equal(startsWithSearch("Aravindh", "rav"), false);
assert.equal(startsWithSearch("KAC-0003", "KAC"), true);
assert.equal(startsWithSearch("KAC-0003", "0003"), false);
assert.equal(startsWithSearch("Kedar", "Ked"), true);
assert.equal(startsWithSearch("Kedar", "edar"), false);
assert.equal(startsWithSearch("Villupuram", "Vill"), true);
assert.equal(startsWithSearch("Villupuram", "illup"), false);
assert.equal(startsWithSearch("9626262922", "962"), true);
assert.equal(startsWithSearch("9626262922", "2626"), false);
assert.equal(startsWithSearch("Anything", ""), true);
assert.equal(startsWithSearch("", "abc"), false);

assert.equal(employeeMatchesPrefixSearch(fixture, "Ara"), true);
assert.equal(employeeMatchesPrefixSearch(fixture, "ARAV"), true);
assert.equal(employeeMatchesPrefixSearch(fixture, "KAC"), true);
assert.equal(employeeMatchesPrefixSearch(fixture, "Ked"), true);
assert.equal(employeeMatchesPrefixSearch(fixture, "Vill"), true);
assert.equal(employeeMatchesPrefixSearch(fixture, "962"), true);

assert.equal(employeeMatchesPrefixSearch(fixture, "rav"), false);
assert.equal(employeeMatchesPrefixSearch(fixture, "vindh"), false);
assert.equal(employeeMatchesPrefixSearch(fixture, "0003"), false);
assert.equal(employeeMatchesPrefixSearch(fixture, "edar"), false);
assert.equal(employeeMatchesPrefixSearch(fixture, "illup"), false);
assert.equal(employeeMatchesPrefixSearch(fixture, "2626"), false);

assert.ok(buildEmployeeSearchFields(fixture).some((v) => String(v).includes("Kedar")));

assert.equal(
  matchesAnyFieldPrefix("Bhe", ["Bhendi", "Tamil name"]),
  true
);
assert.equal(
  matchesAnyFieldPrefix("hendi", ["Bhendi"]),
  false
);

console.log("searchMatch prefix regression checks OK");
