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
  employeeActivityCardA11y,
  visitsRefreshPlan,
  visitEmployeeOptionLabel,
} from "./visitsActivity.js";

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
assert.deepEqual(buildActivitySummaryParams(frozenToday), { date: "2026-10-05" });

const kpis = todayActivityKpis(summary);
assert.equal(kpis[0].value, "34");
assert.equal(kpis[1].value, "8");
assert.equal(kpis[2].value, "2");
assert.equal(kpis[3].value, "32 / 34");
assert.equal(kpis[3].hint, "94% of today's visits");
assert.equal(gpsVerifiedPercent(32, 34), 94);
assert.equal(gpsVerifiedPercent(0, 0), 0);
assert.equal(gpsVerifiedPercent(5, 0), 0);
assert.ok(!Number.isNaN(gpsVerifiedPercent(undefined, 0)));
assert.equal(gpsVerifiedPercent("x", "y"), 0);

const zeroKpis = todayActivityKpis({ total_visits: 0, gps_verified: 0, active_staff: 0, no_visits: 0 });
assert.equal(zeroKpis[3].value, "0 / 0");
assert.equal(zeroKpis[3].hint, "0% of today's visits");

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
assert.equal(employeeActivityMeta({ visit_count: 0, latest_visit_at: null }).detail, "No visits today");
assert.match(employeeActivityMeta(kavi).visitsLabel, /7 visits/);
assert.match(employeeActivityMeta(kavi).detail, /Last visit ·/i);
const clock = formatLatestVisitClock("2026-10-05T13:42:00+05:30");
assert.ok(clock);
assert.match(clock, /1:42/i);

assert.equal(findEmployeeByUserId(summary.employees, "30")?.name, "Kaviyarasan");
assert.equal(visitEmployeeOptionLabel(kavi), "Kaviyarasan · KAC-0003");

const a11y = employeeActivityCardA11y({ selected: true, name: "Kaviyarasan", code: "KAC-0003" });
assert.equal(a11y.type, "button");
assert.equal(a11y["aria-pressed"], true);
assert.match(a11y["aria-label"], /selected/i);
const a11yIdle = employeeActivityCardA11y({ selected: false, name: "Kaviyarasan", code: "KAC-0003" });
assert.equal(a11yIdle["aria-pressed"], false);

assert.deepEqual(visitsRefreshPlan(), { activity: true, visits: true });

const zeroVisible = summary.employees.some((e) => Number(e.visit_count) === 0);
assert.equal(zeroVisible, true);

console.log("visitsActivity checks OK");
