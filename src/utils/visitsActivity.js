/**
 * Field Visits — today's operational activity helpers.
 *
 * Employee identity for visit filtering is AUTH User PK (`user_id`).
 * EmployeeProfile.pk must never be used. Never fall back to `id`.
 */

import { BUSINESS_TIME_ZONE } from "./businessDate.js";
import { reportEmployeeOptionValue } from "./reportsEmployeeFilter.js";

export function unwrapActivityPayload(payload) {
  if (payload == null || typeof payload !== "object") return null;
  if (payload.success === true && payload.data != null && typeof payload.data === "object") {
    return payload.data;
  }
  if (
    Array.isArray(payload.employees) ||
    payload.date != null ||
    payload.total_visits != null
  ) {
    return payload;
  }
  if (payload.data != null && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return null;
}

function toNonNegInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function normalizeVisitActivitySummary(payload) {
  const data = unwrapActivityPayload(payload);
  if (!data) {
    return {
      date: "",
      total_visits: 0,
      active_staff: 0,
      no_visits: 0,
      gps_verified: 0,
      employees: [],
    };
  }
  return {
    date: data.date == null ? "" : String(data.date),
    total_visits: toNonNegInt(data.total_visits),
    active_staff: toNonNegInt(data.active_staff),
    no_visits: toNonNegInt(data.no_visits),
    gps_verified: toNonNegInt(data.gps_verified),
    employees: Array.isArray(data.employees) ? data.employees : [],
  };
}

export function buildActivitySummaryParams(todayIso) {
  return { date: String(todayIso || "") };
}

export function gpsVerifiedPercent(gpsVerified, totalVisits) {
  const total = Number(totalVisits);
  const gps = Number(gpsVerified);
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(gps) || gps < 0) return 0;
  return Math.round((gps / total) * 100);
}

export function todayActivityKpis(summary) {
  const total = toNonNegInt(summary?.total_visits);
  const gps = toNonNegInt(summary?.gps_verified);
  const pct = gpsVerifiedPercent(gps, total);
  return [
    {
      id: "visits",
      label: "Today's Visits",
      value: String(total),
      hint: "Submitted today",
    },
    {
      id: "staff",
      label: "Active Staff",
      value: String(toNonNegInt(summary?.active_staff)),
      hint: "Employees with visits today",
    },
    {
      id: "none",
      label: "No Visits Yet",
      value: String(toNonNegInt(summary?.no_visits)),
      hint: "Eligible employees with 0 visits",
    },
    {
      id: "gps",
      label: "GPS Verified",
      value: `${gps} / ${total}`,
      hint: `${pct}% of today's visits`,
    },
  ];
}

/** User PK string, or null. Never uses EmployeeProfile.pk / emp.id. */
export function activityEmployeeUserId(emp) {
  return reportEmployeeOptionValue(emp);
}

export function visitEmployeeDisplayName(emp) {
  if (!emp || typeof emp !== "object") return "";
  const name = String(emp.name || "").trim();
  if (name) return name;
  const first = String(emp.first_name || "").trim();
  const last = String(emp.last_name || "").trim();
  const combined = [first, last].filter(Boolean).join(" ");
  if (combined) return combined;
  const employeeName = String(emp.employee_name || "").trim();
  if (employeeName) return employeeName;
  return String(emp.username || "").trim();
}

export function visitEmployeeCode(emp) {
  if (!emp || typeof emp !== "object") return "";
  return String(emp.employee_id || "").trim();
}

export function visitEmployeeOptionLabel(emp) {
  const name = visitEmployeeDisplayName(emp);
  const code = visitEmployeeCode(emp);
  if (name && code) return `${name} · ${code}`;
  return name || code || "Employee";
}

export function formatLatestVisitClock(iso) {
  if (iso == null || iso === "") return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const text = d.toLocaleTimeString("en-IN", {
      timeZone: BUSINESS_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return String(text).replace(/\s*(am|pm)\.?$/i, (_, mer) => ` ${String(mer).toUpperCase()}`);
  } catch {
    return null;
  }
}

export function employeeActivityMeta(emp) {
  const count = toNonNegInt(emp?.visit_count);
  const visitsLabel = `${count} visit${count === 1 ? "" : "s"}`;
  if (count <= 0) {
    return {
      visitCount: count,
      visitsLabel,
      detail: "No visits today",
      zero: true,
    };
  }
  const clock = formatLatestVisitClock(emp?.latest_visit_at);
  return {
    visitCount: count,
    visitsLabel,
    detail: clock ? `Last visit · ${clock}` : "",
    zero: false,
  };
}

export function employeesForVisitSelect(employees) {
  return (Array.isArray(employees) ? employees : []).filter(
    (emp) => activityEmployeeUserId(emp) != null
  );
}

export function findEmployeeByUserId(employees, userId) {
  const wanted = String(userId ?? "").trim();
  if (!wanted) return null;
  return (
    (Array.isArray(employees) ? employees : []).find(
      (emp) => activityEmployeeUserId(emp) === wanted
    ) || null
  );
}

export function employeeActivityCardA11y({ selected, name, code } = {}) {
  const who = [name, code].filter(Boolean).join(", ");
  return {
    type: "button",
    "aria-pressed": Boolean(selected),
    "aria-label": selected
      ? `${who || "Employee"}, selected. Showing this employee's visits.`
      : `Show visits for ${who || "employee"}`,
  };
}

export function visitsRefreshPlan() {
  return { activity: true, visits: true };
}
