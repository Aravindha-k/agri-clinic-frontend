import assert from "node:assert/strict";
import {
  buildVisitsQueryParams,
  applyEmployeeChange,
  applyPeriodChange,
  applySearchChange,
  applyClearVisitFilters,
  visitsScopeKey,
  visitResultsViewState,
  visitRecordsCountFromResponse,
  visitRecordsScopeLine,
  visitRecordsCountLine,
  visitRecordsEmptyCopy,
  dateRangeForChip,
  CLEARED_VISIT_RECORD_FILTERS,
} from "./visitsFilters.js";
import { activityEmployeeUserId } from "./visitsActivity.js";

const TODAY = "2026-10-07"; // Wednesday
const empA = { id: 26, user_id: 30, employee_id: "KAC-0003", name: "Kaviyarasan" };
const empB = { id: 27, user_id: 31, employee_id: "KAC-0004", name: "Sasikumar" };

assert.equal(activityEmployeeUserId(empA), "30");
assert.notEqual(activityEmployeeUserId(empA), String(empA.id));

function params(overrides = {}) {
  return buildVisitsQueryParams({ today: TODAY, page: 1, pageSize: 12, ...overrides });
}

const allToday = params({ dateChip: "today" });
assert.equal(allToday.start_date, TODAY);
assert.equal(allToday.end_date, TODAY);
assert.equal("employee" in allToday, false);
assert.equal(allToday.page, 1);
assert.equal(allToday.page_size, 12);
assert.equal(allToday.ordering, "-created_at");

const empAToday = params({
  dateChip: "today",
  employeeUserId: activityEmployeeUserId(empA),
});
assert.equal(empAToday.employee, "30");
assert.notEqual(empAToday.employee, "26");
assert.equal(empAToday.start_date, TODAY);

const empBToday = params({
  dateChip: "today",
  employeeUserId: activityEmployeeUserId(empB),
});
assert.equal(empBToday.employee, "31");

const week = dateRangeForChip("week", TODAY);
assert.equal(week.start_date, "2026-10-05");
assert.equal(week.end_date, TODAY);
const empAWeek = params({ dateChip: "week", employeeUserId: "30" });
assert.equal(empAWeek.employee, "30");
assert.equal(empAWeek.start_date, "2026-10-05");
assert.equal(empAWeek.end_date, TODAY);

const empAMonth = params({ dateChip: "month", employeeUserId: "30" });
assert.equal(empAMonth.employee, "30");
assert.equal(empAMonth.start_date, "2026-10-01");
assert.equal(empAMonth.end_date, TODAY);

const empAAll = params({ dateChip: "all", employeeUserId: "30" });
assert.equal(empAAll.employee, "30");
assert.equal("start_date" in empAAll, false);
assert.equal("end_date" in empAAll, false);

const combined = params({
  dateChip: "today",
  employeeUserId: "30",
  search: "Manikandan",
});
assert.equal(combined.employee, "30");
assert.equal(combined.start_date, TODAY);
assert.equal(combined.search, "Manikandan");

const page2 = params({
  page: 2,
  dateChip: "today",
  employeeUserId: "30",
  search: "Manikandan",
});
assert.equal(page2.page, 2);
assert.equal(page2.employee, "30");
assert.equal(page2.search, "Manikandan");
assert.equal(page2.start_date, TODAY);

const allEmployees = params({ dateChip: "today", employeeUserId: "" });
assert.equal("employee" in allEmployees, false);

const missingUser = activityEmployeeUserId({ id: 26, employee_id: "KAC-0003" });
assert.equal(missingUser, null);
assert.equal("employee" in params({ employeeUserId: missingUser }), false);

let state = { employeeUserId: "30", dateChip: "today", search: "x", page: 4 };
state = applyEmployeeChange(state, "31");
assert.equal(state.employeeUserId, "31");
assert.equal(state.dateChip, "today");
assert.equal(state.search, "x");
assert.equal(state.page, 1);

state = applyPeriodChange(state, "week");
assert.equal(state.employeeUserId, "31");
assert.equal(state.dateChip, "week");
assert.equal(state.search, "x");
assert.equal(state.page, 1);

state = applySearchChange(state, "Manikandam");
assert.equal(state.employeeUserId, "31");
assert.equal(state.dateChip, "week");
assert.equal(state.page, 1);

const cleared = applyClearVisitFilters();
assert.deepEqual(cleared, CLEARED_VISIT_RECORD_FILTERS);
assert.equal(cleared.employeeUserId, "");
assert.equal(cleared.dateChip, "all");
assert.equal(cleared.search, "");
assert.equal(cleared.page, 1);

const scopeA = visitsScopeKey({ employeeUserId: "30", dateChip: "today", search: "", page: 1 });
const scopeB = visitsScopeKey({ employeeUserId: "31", dateChip: "today", search: "", page: 1 });
assert.notEqual(scopeA, scopeB);
assert.equal(
  visitResultsViewState({
    currentScope: scopeB,
    loadedScope: scopeA,
    loading: false,
    error: "",
  }),
  "loading"
);
assert.equal(
  visitResultsViewState({
    currentScope: scopeB,
    loadedScope: scopeB,
    loading: false,
    error: "",
  }),
  "ready"
);
assert.equal(
  visitResultsViewState({
    currentScope: scopeB,
    loadedScope: scopeA,
    loading: false,
    error: "500",
  }),
  "loading"
);
assert.equal(
  visitResultsViewState({
    currentScope: scopeB,
    loadedScope: scopeB,
    loading: false,
    error: "500",
  }),
  "error"
);

const listCount = visitRecordsCountFromResponse({ count: 92, results: new Array(12) }, 12);
assert.equal(listCount, 92);
assert.notEqual(listCount, 34);
const todayKpiTotal = 34;
assert.notEqual(listCount, todayKpiTotal);

assert.equal(
  visitRecordsScopeLine({ employee: empA, dateChip: "today" }),
  "Kaviyarasan · KAC-0003 · Today"
);
assert.equal(visitRecordsScopeLine({ dateChip: "all" }), "All Employees · All time");
assert.equal(visitRecordsCountLine(7), "7 submitted visits");
assert.equal(visitRecordsCountLine(1), "1 submitted visit");

assert.equal(
  visitRecordsEmptyCopy({ dateChip: "today" }).title,
  "No submitted visits today."
);
assert.equal(
  visitRecordsEmptyCopy({ dateChip: "today", employeeName: "Kaviyarasan" }).title,
  "Kaviyarasan has no submitted visits today."
);
assert.equal(
  visitRecordsEmptyCopy({ dateChip: "month", employeeName: "Kaviyarasan" }).title,
  "No submitted visits found for Kaviyarasan in this period."
);
assert.equal(
  visitRecordsEmptyCopy({ hasSearch: true, dateChip: "today", employeeName: "Kaviyarasan" }).title,
  "No visits match the current filters."
);

const activityErrorDoesNotBlockRecords = visitResultsViewState({
  currentScope: scopeA,
  loadedScope: scopeA,
  loading: false,
  error: "",
});
assert.equal(activityErrorDoesNotBlockRecords, "ready");

console.log("visitsFilters checks OK");
