import assert from "node:assert/strict";
import { todayIsoDate } from "./businessDate.js";
import {
  unwrapActivityPayload,
  normalizeVisitActivitySummary,
  buildActivitySummaryParams,
  gpsVerifiedPercent,
  todayActivityKpis,
  activityEmployeeUserId,
  employeesForVisitSelect,
  findEmployeeByUserId,
  employeeActivityMeta,
  formatLatestVisitClock,
  formatLatestVisitContext,
  employeeActivityCardA11y,
  visitsRefreshPlan,
  visitEmployeeOptionLabel,
  DEFAULT_ACTIVITY_PERIOD,
  ACTIVITY_PERIODS,
  normalizeActivityPeriod,
  applyActivityPeriodChange,
  activityViewState,
  isCurrentActivitySeq,
  activityErrorMessage,
  activitySectionCopy,
  zeroVisitDetail,
  activityShowsDuty,
  formatDutyDuration,
  normalizeEmployeeDuty,
  employeeDutyPresentation,
  liveDutyDurationSeconds,
  DUTY_STATUS,
} from "./visitsActivity.js";
import {
  activityPeriodRange,
  applyActivityEmployeeDrillDown,
  applyAllEmployeesFromActivity,
  applyPeriodChange,
  buildVisitsQueryParams,
} from "./visitsFilters.js";
import { visitEmployeeLabel } from "./visitFarmer.js";

const wrapped = {
  success: true,
  message: "Operation successful",
  data: {
    date: "2026-10-05",
    total_visits: 34,
    active_staff: 8,
    no_visits: 2,
    gps_verified: 32,
    employees: [
      {
        user_id: 30,
        id: 26,
        employee_id: "KAC-0003",
        name: "Kaviyarasan",
        visit_count: 7,
        latest_visit_at: "2026-10-05T13:42:00+05:30",
      },
      {
        user_id: 31,
        id: 27,
        employee_id: "KAC-0004",
        name: "Sasikumar",
        visit_count: 0,
        latest_visit_at: null,
      },
    ],
  },
};

assert.deepEqual(unwrapActivityPayload(wrapped), wrapped.data);
const summary = normalizeVisitActivitySummary(wrapped);
assert.equal(summary.date, "2026-10-05");
assert.equal(summary.total_visits, 34);
assert.equal(summary.active_staff, 8);
assert.equal(summary.no_visits, 2);
assert.equal(summary.gps_verified, 32);
assert.equal(summary.employees.length, 2);

const unwrappedSummary = normalizeVisitActivitySummary(wrapped.data);
assert.equal(unwrappedSummary.total_visits, 34);

const frozenToday = todayIsoDate(new Date("2026-10-05T08:00:00+05:30"));
assert.equal(frozenToday, "2026-10-05");
assert.equal(DEFAULT_ACTIVITY_PERIOD, "today");
assert.equal(normalizeActivityPeriod(undefined), "today");
assert.equal(normalizeActivityPeriod("all"), "today");
assert.deepEqual(
  ACTIVITY_PERIODS.map((c) => c.id),
  ["today", "week", "month"]
);

const todayRange = activityPeriodRange("today", frozenToday);
assert.equal(todayRange.start_date, "2026-10-05");
assert.equal(todayRange.end_date, "2026-10-05");
const weekRangeMon = activityPeriodRange("week", frozenToday);
assert.equal(weekRangeMon.start_date, "2026-10-05");
assert.equal(weekRangeMon.end_date, "2026-10-05");
const weekRangeWed = activityPeriodRange("week", "2026-10-07");
assert.equal(weekRangeWed.start_date, "2026-10-05");
assert.equal(weekRangeWed.end_date, "2026-10-07");
const monthRange = activityPeriodRange("month", frozenToday);
assert.equal(monthRange.start_date, "2026-10-01");
assert.equal(monthRange.end_date, "2026-10-05");
assert.equal(activityPeriodRange("all", frozenToday).start_date, frozenToday);

const activityParams = buildActivitySummaryParams({
  startDate: todayRange.start_date,
  endDate: todayRange.end_date,
});
assert.deepEqual(activityParams, { start_date: "2026-10-05", end_date: "2026-10-05" });
assert.equal("date" in activityParams, false);
const weekParams = buildActivitySummaryParams({
  startDate: weekRangeWed.start_date,
  endDate: weekRangeWed.end_date,
});
assert.deepEqual(weekParams, { start_date: "2026-10-05", end_date: "2026-10-07" });

const kpis = todayActivityKpis(summary);
assert.equal(kpis[0].label, "Today's Visits");
assert.equal(kpis[0].value, "34");
assert.equal(kpis[1].value, "8");
assert.equal(kpis[2].label, "No Visits Yet");
assert.equal(kpis[2].value, "2");
assert.equal(kpis[2].hint, "Eligible employees with 0 visits today");
assert.equal(kpis[3].value, "32 / 34");
assert.equal(kpis[3].hint, "94% of today's visits");
assert.equal(kpis[1].hint, "Employees with visits today");
assert.equal(gpsVerifiedPercent(32, 34), 94);
assert.equal(gpsVerifiedPercent(0, 0), 0);
assert.equal(gpsVerifiedPercent(5, 0), 0);
assert.ok(!Number.isNaN(gpsVerifiedPercent(undefined, 0)));
assert.equal(gpsVerifiedPercent("x", "y"), 0);

const weekKpis = todayActivityKpis({ total_visits: 153, gps_verified: 151, active_staff: 9, no_visits: 1 }, "week");
assert.equal(weekKpis[0].label, "This Week's Visits");
assert.equal(weekKpis[0].value, "153");
assert.equal(weekKpis[1].hint, "Employees with visits this week");
assert.equal(weekKpis[2].label, "No Visits");
assert.equal(weekKpis[2].hint, "Eligible employees with 0 visits this week");
assert.equal(weekKpis[3].value, "151 / 153");
assert.equal(weekKpis[3].hint, "99% of this week's visits");

const monthKpis = todayActivityKpis({ total_visits: 400, gps_verified: 390, active_staff: 10, no_visits: 2 }, "month");
assert.equal(monthKpis[0].label, "This Month's Visits");
assert.equal(monthKpis[1].hint, "Employees with visits this month");
assert.equal(monthKpis[2].hint, "Eligible employees with 0 visits this month");
assert.equal(monthKpis[3].hint, "98% of this month's visits");
assert.notEqual(weekKpis[0].value, kpis[0].value);

const zeroKpis = todayActivityKpis({ total_visits: 0, gps_verified: 0, active_staff: 0, no_visits: 0 });
assert.equal(zeroKpis[3].value, "0 / 0");
assert.equal(zeroKpis[3].hint, "0% of today's visits");

const todayCopy = activitySectionCopy("today");
assert.equal(todayCopy.title, "Field Activity — Today");
assert.equal(todayCopy.subtitle, "Operational snapshot for today");
assert.equal(todayCopy.employeeTitle, "Employee Activity — Today");
assert.equal(todayCopy.employeeSubtitle, "Today's submitted field visits by employee");
const weekCopy = activitySectionCopy("week");
assert.equal(weekCopy.title, "Field Activity — This Week");
assert.equal(weekCopy.subtitle, "Operational snapshot for this week");
assert.equal(weekCopy.employeeTitle, "Employee Activity — This Week");
assert.equal(weekCopy.employeeSubtitle, "This week's submitted field visits by employee");
const monthCopy = activitySectionCopy("month");
assert.equal(monthCopy.title, "Field Activity — This Month");
assert.equal(monthCopy.employeeTitle, "Employee Activity — This Month");
assert.equal(monthCopy.employeeSubtitle, "This month's submitted field visits by employee");

const kavi = summary.employees[0];
const sasi = summary.employees[1];
assert.equal(activityEmployeeUserId(kavi), "30");
assert.equal(activityEmployeeUserId(sasi), "31");
assert.notEqual(activityEmployeeUserId(kavi), String(kavi.id));
assert.equal(activityEmployeeUserId({ id: 26, employee_id: "KAC-0003" }), null);
assert.equal(activityEmployeeUserId({ id: 26, user_id: null }), null);

const selectable = employeesForVisitSelect([
  kavi,
  { id: 99, employee_id: "KAC-MISSING", name: "Broken" },
  sasi,
]);
assert.deepEqual(
  selectable.map((e) => activityEmployeeUserId(e)),
  ["30", "31"]
);

assert.equal(employeeActivityMeta(sasi).detail, "No visits today");
assert.equal(employeeActivityMeta(sasi).visitCount, 0);
assert.equal(employeeActivityMeta(sasi).zero, true);
assert.equal(employeeActivityMeta({ visit_count: 0, latest_visit_at: null }).detail, "No visits today");
assert.equal(zeroVisitDetail("today"), "No visits today");
assert.equal(zeroVisitDetail("week"), "No visits this week");
assert.equal(zeroVisitDetail("month"), "No visits this month");
assert.equal(employeeActivityMeta(sasi, "week").detail, "No visits this week");
assert.equal(employeeActivityMeta(sasi, "month").detail, "No visits this month");
assert.match(employeeActivityMeta(kavi).visitsLabel, /7 visits/);
assert.match(employeeActivityMeta(kavi).detail, /Last visit ·/i);
assert.equal(employeeActivityMeta(kavi).zero, false);
const clock = formatLatestVisitClock("2026-10-05T13:42:00+05:30");
assert.ok(clock);
assert.match(clock, /1:42/i);
assert.equal(formatLatestVisitContext("2026-10-05T13:42:00+05:30", "today", frozenToday), clock);
assert.match(formatLatestVisitContext("2026-10-05T13:42:00+05:30", "week", frozenToday), /Today/i);
assert.match(formatLatestVisitContext("2026-10-03T12:21:00+05:30", "month", frozenToday), /Oct/i);
assert.doesNotMatch(formatLatestVisitContext("2026-10-03T12:21:00+05:30", "month", frozenToday), /Today/i);
const weekActive = employeeActivityMeta({ visit_count: 10, latest_visit_at: "2026-10-05T12:21:00+05:30" }, "week", frozenToday);
assert.equal(weekActive.zero, false);
assert.match(weekActive.detail, /Last visit · Today/i);
const monthEarlier = employeeActivityMeta({ visit_count: 18, latest_visit_at: "2026-10-03T12:21:00+05:30" }, "month", frozenToday);
assert.equal(monthEarlier.zero, false);
assert.match(monthEarlier.detail, /Last visit ·/i);
assert.match(monthEarlier.detail, /Oct/i);

assert.equal(findEmployeeByUserId(summary.employees, "30")?.name, "Kaviyarasan");
assert.equal(visitEmployeeOptionLabel(kavi), "Kaviyarasan · KAC-0003");

const a11y = employeeActivityCardA11y({ selected: true, name: "Kaviyarasan", code: "KAC-0003" });
assert.equal(a11y.type, "button");
assert.equal(a11y["aria-pressed"], true);
assert.match(a11y["aria-label"], /selected/i);
const a11yIdle = employeeActivityCardA11y({ selected: false, name: "Kaviyarasan", code: "KAC-0003" });
assert.equal(a11yIdle["aria-pressed"], false);

assert.deepEqual(visitsRefreshPlan(), {
  activity: true,
  visits: true,
  activityPeriod: "today",
  visitScope: {},
});
const refreshMonth = visitsRefreshPlan("month", { employeeUserId: "30", dateChip: "today", search: "Kalyani" });
assert.equal(refreshMonth.activityPeriod, "month");
assert.equal(refreshMonth.visitScope.dateChip, "today");
assert.equal(refreshMonth.visitScope.employeeUserId, "30");
assert.equal(refreshMonth.visitScope.search, "Kalyani");

let activityState = { activityPeriod: DEFAULT_ACTIVITY_PERIOD, dateChip: "all", employeeUserId: "30" };
activityState = applyActivityPeriodChange(activityState, "week");
assert.equal(activityState.activityPeriod, "week");
assert.equal(activityState.dateChip, "all");
assert.equal(activityState.employeeUserId, "30");
const recordsOnly = applyPeriodChange({ employeeUserId: "30", dateChip: "month", page: 2 }, "all");
assert.equal(recordsOnly.dateChip, "all");
assert.equal("activityPeriod" in recordsOnly, false);

const drilledToday = applyActivityEmployeeDrillDown({ employeeUserId: "", dateChip: "all", page: 3 }, "30", "today");
assert.equal(drilledToday.employeeUserId, "30");
assert.equal(drilledToday.dateChip, "today");
assert.equal(drilledToday.page, 1);
assert.notEqual(drilledToday.employeeUserId, "26");
const drilledWeek = applyActivityEmployeeDrillDown({ employeeUserId: "", dateChip: "all", page: 1 }, "35", "week");
assert.equal(drilledWeek.dateChip, "week");
assert.equal(drilledWeek.employeeUserId, "35");
const drilledMonth = applyActivityEmployeeDrillDown({ employeeUserId: "", dateChip: "today", page: 1 }, "30", "month");
assert.equal(drilledMonth.dateChip, "month");
assert.equal(drilledMonth.employeeUserId, "30");

const clearedEmp = applyAllEmployeesFromActivity({
  employeeUserId: "30",
  dateChip: "month",
  activityPeriod: "month",
  page: 2,
});
assert.equal(clearedEmp.employeeUserId, "");
assert.equal(clearedEmp.dateChip, "month");
assert.equal(clearedEmp.activityPeriod, "month");
assert.equal(clearedEmp.page, 1);

assert.equal(
  activityViewState({ loading: false, period: "month", loadedPeriod: "week", error: "" }),
  "loading"
);
assert.equal(
  activityViewState({ loading: true, period: "week", loadedPeriod: "today", error: "" }),
  "loading"
);
assert.equal(
  activityViewState({ loading: false, period: "month", loadedPeriod: "month", error: "" }),
  "ready"
);
assert.equal(
  activityViewState({ loading: false, period: "week", loadedPeriod: "week", error: "x" }),
  "error"
);
assert.equal(isCurrentActivitySeq(2, 3), false);
assert.equal(isCurrentActivitySeq(3, 3), true);
assert.equal(activityErrorMessage("today"), "Unable to load today's activity.");
assert.equal(activityErrorMessage("week"), "Unable to load this week's activity.");
assert.equal(activityErrorMessage("month"), "Unable to load this month's activity.");

const drillQuery = buildVisitsQueryParams({
  today: frozenToday,
  dateChip: drilledMonth.dateChip,
  employeeUserId: drilledMonth.employeeUserId,
});
assert.equal(drillQuery.employee, "30");
assert.notEqual(drillQuery.employee, "26");
assert.equal(drillQuery.start_date, "2026-10-01");
assert.equal(drillQuery.end_date, frozenToday);
assert.equal("page_size" in drillQuery, true);

const zeroVisible = summary.employees.some((e) => Number(e.visit_count) === 0);
assert.equal(zeroVisible, true);

assert.equal(activityShowsDuty("today"), true);
assert.equal(activityShowsDuty("week"), false);
assert.equal(activityShowsDuty("month"), false);
assert.equal(formatDutyDuration(0), "0m");
assert.equal(formatDutyDuration(35 * 60), "35m");
assert.equal(formatDutyDuration(2 * 3600 + 35 * 60), "2h 35m");
assert.equal(formatDutyDuration(9 * 3600), "9h 00m");

assert.equal(normalizeEmployeeDuty(null), null);
assert.equal(normalizeEmployeeDuty({ status: "ON_DUTY", duration_seconds: 10 }).status, DUTY_STATUS.ON_DUTY);

const onDuty = employeeDutyPresentation(
  {
    status: "ON_DUTY",
    start_time: "2026-10-05T08:42:00+05:30",
    end_time: null,
    duration_seconds: 2 * 3600 + 35 * 60,
    session_count: 1,
    duration_limit_seconds: 32400,
  },
  { period: "today", fetchedAtMs: Date.now(), nowMs: Date.now() }
);
assert.equal(onDuty.statusLabel, "On duty");
assert.equal(onDuty.tone, "on");
assert.ok(onDuty.rows.some((r) => r.label === "Duty so far"));

const ended = employeeDutyPresentation(
  {
    status: "ENDED",
    start_time: "2026-10-05T08:42:00+05:30",
    end_time: "2026-10-05T17:48:00+05:30",
    duration_seconds: 9 * 3600 + 6 * 60,
    session_count: 1,
  },
  { period: "today" }
);
assert.equal(ended.statusLabel, "Duty ended");
assert.ok(ended.rows.some((r) => r.label === "End"));

const autoEnded = employeeDutyPresentation(
  {
    status: "AUTO_ENDED",
    start_time: "2026-10-05T08:42:00+05:30",
    end_time: "2026-10-05T17:42:00+05:30",
    duration_seconds: 9 * 3600,
    completion_reason: "AUTO_EXPIRED",
    session_count: 1,
  },
  { period: "today" }
);
assert.equal(autoEnded.statusLabel, "Auto-ended");
assert.equal(autoEnded.showAutoEndedNote, true);

const notStarted = employeeDutyPresentation(
  { status: "NOT_STARTED", duration_seconds: 0, session_count: 0 },
  { period: "today" }
);
assert.equal(notStarted.statusLabel, "Duty not started");
assert.equal(notStarted.rows.length, 0);

assert.equal(
  employeeDutyPresentation(
    { status: "ON_DUTY", duration_seconds: 100, start_time: "2026-10-05T08:00:00+05:30" },
    { period: "week" }
  ),
  null
);
assert.equal(
  employeeDutyPresentation(
    { status: "ON_DUTY", duration_seconds: 100, start_time: "2026-10-05T08:00:00+05:30" },
    { period: "month" }
  ),
  null
);

const fetched = 1_000_000;
assert.equal(
  liveDutyDurationSeconds(
    { status: "ON_DUTY", duration_seconds: 60, duration_limit_seconds: 32400, session_count: 1 },
    fetched,
    fetched + 60_000
  ),
  120
);
assert.equal(
  liveDutyDurationSeconds(
    { status: "ENDED", duration_seconds: 3600, duration_limit_seconds: 32400, session_count: 1 },
    fetched,
    fetched + 60_000
  ),
  3600
);

const multiDuty = normalizeEmployeeDuty({
  status: "ON_DUTY",
  start_time: "2026-10-05T08:00:00+05:30",
  end_time: null,
  duration_seconds: 5400,
  session_count: 2,
  duration_limit_seconds: 32400,
});
assert.equal(multiDuty.session_count, 2);
const multiPres = employeeDutyPresentation(multiDuty, { period: "today" });
assert.equal(multiPres.status, "ON_DUTY");

const withDutySummary = normalizeVisitActivitySummary({
  date: "2026-10-05",
  total_visits: 1,
  active_staff: 1,
  no_visits: 0,
  gps_verified: 1,
  employees: [
    {
      user_id: 30,
      employee_id: "KAC-0003",
      name: "Kavi",
      visit_count: 1,
      latest_visit_at: null,
      duty: {
        status: "ON_DUTY",
        start_time: "2026-10-05T08:42:00+05:30",
        duration_seconds: 100,
        session_count: 1,
      },
    },
    {
      user_id: 31,
      employee_id: "KAC-0004",
      name: "Sasi",
      visit_count: 0,
      latest_visit_at: null,
      duty: null,
    },
  ],
});
assert.equal(withDutySummary.employees[0].duty.status, "ON_DUTY");
assert.equal(withDutySummary.employees[1].duty, null);
assert.equal(activityEmployeeUserId(withDutySummary.employees[0]), "30");
assert.equal(employeeActivityMeta(withDutySummary.employees[1], "today").zero, true);

/* visitEmployeeLabel — never present an ID as a person's name */
assert.equal(visitEmployeeLabel({ employee_name: "Sasi" }), "Sasi");
assert.equal(visitEmployeeLabel({ employee: { name: "Kavya Field Team" } }), "Kavya Field Team");
assert.equal(
  visitEmployeeLabel({ employee: { first_name: "Anitha", last_name: "R" } }),
  "Anitha R"
);
assert.equal(visitEmployeeLabel({ agent_name: "Agent Kumar" }), "Agent Kumar");
// Numeric ids (bare number, employee object id, employee_id field) → "—"
assert.equal(visitEmployeeLabel({ employee: 12 }), "—");
assert.equal(visitEmployeeLabel({ employee_id: 12 }), "—");
assert.equal(visitEmployeeLabel({ employee_id: "42" }), "—");
assert.equal(visitEmployeeLabel({ employee_name: "007" }), "—");
assert.equal(visitEmployeeLabel({}), "—");
assert.equal(visitEmployeeLabel(null), "—");
// Non-numeric username remains a usable label
assert.equal(visitEmployeeLabel({ employee: { username: "field-ops-1" } }), "field-ops-1");

console.log("visitsActivity checks OK");
