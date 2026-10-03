import assert from "node:assert/strict";
import {
  buildReportSummaryParams,
  buildVisitFilterParams,
  employeesForReportSelect,
  reportEmployeeOptionValue,
} from "./reportsEmployeeFilter.js";

const empA = {
  id: 26, // EmployeeProfile.pk — must NEVER be used as filter value
  user_id: 30,
  employee_id: "KAC-0003",
  username: "kac0003",
  first_name: "Kavi",
};
const empB = {
  id: 27,
  user_id: 31,
  employee_id: "KAC-0004",
  username: "kac0004",
  first_name: "Sasi",
};
const empMissingUser = {
  id: 99,
  employee_id: "KAC-MISSING",
  username: "broken",
};

assert.equal(reportEmployeeOptionValue(empA), "30");
assert.equal(reportEmployeeOptionValue(empB), "31");
assert.equal(reportEmployeeOptionValue(empMissingUser), null);
assert.equal(reportEmployeeOptionValue(null), null);
assert.notEqual(reportEmployeeOptionValue(empA), String(empA.id));

const selectable = employeesForReportSelect([empA, empMissingUser, empB]);
assert.deepEqual(
  selectable.map((e) => reportEmployeeOptionValue(e)),
  ["30", "31"]
);

// Selecting A → summary + visits use user_id only
const summaryA = buildReportSummaryParams({
  from: "2026-09-03",
  to: "2026-10-03",
  employeeUserId: reportEmployeeOptionValue(empA),
});
assert.deepEqual(summaryA, {
  from: "2026-09-03",
  to: "2026-10-03",
  employee: "30",
});
assert.notEqual(summaryA.employee, String(empA.id));

const visitsA = buildVisitFilterParams({
  start_date: "2026-09-03",
  end_date: "2026-10-03",
  employeeUserId: reportEmployeeOptionValue(empA),
});
assert.deepEqual(visitsA, {
  start_date: "2026-09-03",
  end_date: "2026-10-03",
  employee: "30",
});

// A → B
const summaryB = buildReportSummaryParams({
  from: "2026-09-03",
  to: "2026-10-03",
  employeeUserId: reportEmployeeOptionValue(empB),
});
assert.equal(summaryB.employee, "31");

// B → All removes employee, keeps dates
const summaryAll = buildReportSummaryParams({
  from: "2026-09-03",
  to: "2026-10-03",
  employeeUserId: "",
});
assert.deepEqual(summaryAll, {
  from: "2026-09-03",
  to: "2026-10-03",
});
assert.equal("employee" in summaryAll, false);

// Date change retains selected user_id
const summaryDateChange = buildReportSummaryParams({
  from: "2026-09-10",
  to: "2026-10-03",
  employeeUserId: "30",
});
assert.equal(summaryDateChange.employee, "30");
assert.equal(summaryDateChange.from, "2026-09-10");

// Never silently fall back profile id when user_id missing
assert.equal(reportEmployeeOptionValue({ id: 26, employee_id: "KAC-0003" }), null);
assert.equal(
  "employee" in
    buildReportSummaryParams({
      from: "2026-09-03",
      to: "2026-10-03",
      employeeUserId: reportEmployeeOptionValue({ id: 26 }),
    }),
  false
);

console.log("reportsEmployeeFilter user_id contract checks OK");
