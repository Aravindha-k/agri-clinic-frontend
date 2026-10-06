/**
 * Field Visits — today's operational activity helpers.
 *
 * Employee identity for visit filtering is AUTH User PK (`user_id`).
 * EmployeeProfile.pk must never be used. Never fall back to `id`.
 */

import { BUSINESS_TIME_ZONE, todayIsoDate } from "./businessDate.js";
import { reportEmployeeOptionValue } from "./reportsEmployeeFilter.js";

export const DEFAULT_ACTIVITY_PERIOD = "today";

export const ACTIVITY_PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

export function normalizeActivityPeriod(period) {
  if (period === "week" || period === "month") return period;
  return DEFAULT_ACTIVITY_PERIOD;
}

export function applyActivityPeriodChange(state, activityPeriod) {
  return { ...state, activityPeriod: normalizeActivityPeriod(activityPeriod) };
}

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

export const DUTY_STATUS = {
  ON_DUTY: "ON_DUTY",
  ENDED: "ENDED",
  AUTO_ENDED: "AUTO_ENDED",
  NOT_STARTED: "NOT_STARTED",
};

/** Duty rows are authoritative only for the Today activity period. */
export function activityShowsDuty(period = DEFAULT_ACTIVITY_PERIOD) {
  return normalizeActivityPeriod(period) === "today";
}

export function normalizeEmployeeDuty(raw) {
  if (raw == null || typeof raw !== "object") return null;
  const statusRaw = String(raw.status || "").toUpperCase();
  const status =
    statusRaw === DUTY_STATUS.ON_DUTY ||
    statusRaw === DUTY_STATUS.ENDED ||
    statusRaw === DUTY_STATUS.AUTO_ENDED ||
    statusRaw === DUTY_STATUS.NOT_STARTED
      ? statusRaw
      : DUTY_STATUS.NOT_STARTED;
  const durationLimit = toNonNegInt(raw.duration_limit_seconds);
  return {
    status,
    start_time: raw.start_time == null || raw.start_time === "" ? null : String(raw.start_time),
    end_time: raw.end_time == null || raw.end_time === "" ? null : String(raw.end_time),
    duration_seconds: toNonNegInt(raw.duration_seconds),
    completion_reason:
      raw.completion_reason == null || raw.completion_reason === ""
        ? null
        : String(raw.completion_reason),
    session_count: toNonNegInt(raw.session_count),
    duration_limit_seconds: durationLimit > 0 ? durationLimit : 32400,
  };
}

export function normalizeActivityEmployee(emp) {
  if (emp == null || typeof emp !== "object") return emp;
  return {
    ...emp,
    duty: Object.prototype.hasOwnProperty.call(emp, "duty")
      ? normalizeEmployeeDuty(emp.duty)
      : null,
  };
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
    start_date: data.start_date == null ? "" : String(data.start_date),
    end_date: data.end_date == null ? "" : String(data.end_date),
    total_visits: toNonNegInt(data.total_visits),
    active_staff: toNonNegInt(data.active_staff),
    no_visits: toNonNegInt(data.no_visits),
    gps_verified: toNonNegInt(data.gps_verified),
    employees: Array.isArray(data.employees)
      ? data.employees.map(normalizeActivityEmployee)
      : [],
  };
}

/** Format duty duration seconds for compact cards. */
export function formatDutyDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatDutyClock(iso) {
  return formatLatestVisitClock(iso);
}

/**
 * Live ON_DUTY duration from snapshot seconds + elapsed wall time since fetch.
 * Caps at duration_limit_seconds * session_count when known.
 */
export function liveDutyDurationSeconds(duty, fetchedAtMs, nowMs = Date.now()) {
  if (!duty || duty.status !== DUTY_STATUS.ON_DUTY) {
    return toNonNegInt(duty?.duration_seconds);
  }
  const base = toNonNegInt(duty.duration_seconds);
  const fetched = Number(fetchedAtMs);
  if (!Number.isFinite(fetched)) return base;
  const elapsed = Math.max(0, Math.floor((Number(nowMs) - fetched) / 1000));
  const sessions = Math.max(1, toNonNegInt(duty.session_count) || 1);
  const limitPer = toNonNegInt(duty.duration_limit_seconds) || 32400;
  const cap = limitPer * sessions;
  return Math.min(base + elapsed, cap);
}

/**
 * Compact duty presentation for Today employee cards.
 * Visit zero/active colors stay independent — duty is secondary.
 */
export function employeeDutyPresentation(duty, { period = DEFAULT_ACTIVITY_PERIOD, fetchedAtMs, nowMs } = {}) {
  if (!activityShowsDuty(period) || duty == null) return null;
  const status = duty.status || DUTY_STATUS.NOT_STARTED;
  const startLabel = formatDutyClock(duty.start_time);
  const endLabel = formatDutyClock(duty.end_time);
  const durationSeconds = liveDutyDurationSeconds(duty, fetchedAtMs, nowMs);
  const durationLabel = formatDutyDuration(durationSeconds);

  if (status === DUTY_STATUS.NOT_STARTED) {
    return {
      status,
      statusLabel: "Duty not started",
      tone: "muted",
      rows: [],
      showAutoEndedNote: false,
    };
  }

  if (status === DUTY_STATUS.ON_DUTY) {
    return {
      status,
      statusLabel: "On duty",
      tone: "on",
      rows: [
        startLabel ? { key: "start", label: "Start", value: startLabel } : null,
        { key: "duty", label: "Duty so far", value: durationLabel },
      ].filter(Boolean),
      showAutoEndedNote: false,
    };
  }

  if (status === DUTY_STATUS.AUTO_ENDED) {
    return {
      status,
      statusLabel: "Auto-ended",
      tone: "auto",
      rows: [
        startLabel ? { key: "start", label: "Start", value: startLabel } : null,
        endLabel ? { key: "end", label: "End", value: endLabel } : null,
        { key: "duty", label: "Duty", value: durationLabel },
      ].filter(Boolean),
      showAutoEndedNote: true,
    };
  }

  return {
    status: DUTY_STATUS.ENDED,
    statusLabel: "Duty ended",
    tone: "ended",
    rows: [
      startLabel ? { key: "start", label: "Start", value: startLabel } : null,
      endLabel ? { key: "end", label: "End", value: endLabel } : null,
      { key: "duty", label: "Duty", value: durationLabel },
    ].filter(Boolean),
    showAutoEndedNote: false,
  };
}

export function buildActivitySummaryParams({ startDate, endDate } = {}) {
  return {
    start_date: String(startDate || ""),
    end_date: String(endDate || ""),
  };
}

export function activityViewState({ loading, period, loadedPeriod, error } = {}) {
  if (loading || period !== loadedPeriod) return "loading";
  if (error) return "error";
  return "ready";
}

export function isCurrentActivitySeq(seq, current) {
  return seq === current;
}

export function activityErrorMessage(period) {
  const p = normalizeActivityPeriod(period);
  if (p === "week") return "Unable to load this week's activity.";
  if (p === "month") return "Unable to load this month's activity.";
  return "Unable to load today's activity.";
}

export function activitySectionCopy(period) {
  const p = normalizeActivityPeriod(period);
  if (p === "week") {
    return {
      title: "Field Activity — This Week",
      subtitle: "Operational snapshot for this week",
      employeeTitle: "Employee Activity — This Week",
      employeeSubtitle: "This week's submitted field visits by employee",
      emptyEmployees: "No eligible field employees in this week's activity snapshot.",
    };
  }
  if (p === "month") {
    return {
      title: "Field Activity — This Month",
      subtitle: "Operational snapshot for this month",
      employeeTitle: "Employee Activity — This Month",
      employeeSubtitle: "This month's submitted field visits by employee",
      emptyEmployees: "No eligible field employees in this month's activity snapshot.",
    };
  }
  return {
    title: "Field Activity — Today",
    subtitle: "Operational snapshot for today",
    employeeTitle: "Employee Activity — Today",
    employeeSubtitle: "Today's submitted field visits by employee",
    emptyEmployees: "No eligible field employees in today's activity snapshot.",
  };
}

export function gpsVerifiedPercent(gpsVerified, totalVisits) {
  const total = Number(totalVisits);
  const gps = Number(gpsVerified);
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(gps) || gps < 0) return 0;
  return Math.round((gps / total) * 100);
}

export function todayActivityKpis(summary, period = DEFAULT_ACTIVITY_PERIOD) {
  const p = normalizeActivityPeriod(period);
  const total = toNonNegInt(summary?.total_visits);
  const gps = toNonNegInt(summary?.gps_verified);
  const pct = gpsVerifiedPercent(gps, total);
  const visitsLabel =
    p === "week" ? "This Week's Visits" : p === "month" ? "This Month's Visits" : "Today's Visits";
  const visitsHint =
    p === "week" ? "Submitted this week" : p === "month" ? "Submitted this month" : "Submitted today";
  const staffHint =
    p === "week"
      ? "Employees with visits this week"
      : p === "month"
        ? "Employees with visits this month"
        : "Employees with visits today";
  const noneLabel = p === "today" ? "No Visits Yet" : "No Visits";
  const noneHint =
    p === "week"
      ? "Eligible employees with 0 visits this week"
      : p === "month"
        ? "Eligible employees with 0 visits this month"
        : "Eligible employees with 0 visits today";
  const gpsHint =
    p === "week"
      ? `${pct}% of this week's visits`
      : p === "month"
        ? `${pct}% of this month's visits`
        : `${pct}% of today's visits`;
  return [
    { id: "visits", label: visitsLabel, value: String(total), hint: visitsHint },
    {
      id: "staff",
      label: "Active Staff",
      value: String(toNonNegInt(summary?.active_staff)),
      hint: staffHint,
    },
    {
      id: "none",
      label: noneLabel,
      value: String(toNonNegInt(summary?.no_visits)),
      hint: noneHint,
    },
    {
      id: "gps",
      label: "GPS Verified",
      value: `${gps} / ${total}`,
      hint: gpsHint,
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

export function formatLatestVisitContext(iso, period = DEFAULT_ACTIVITY_PERIOD, today = todayIsoDate()) {
  const clock = formatLatestVisitClock(iso);
  if (!clock) return null;
  if (normalizeActivityPeriod(period) === "today") return clock;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return clock;
  const visitDay = todayIsoDate(d);
  if (visitDay === today) return `Today ${clock}`;
  try {
    const dayMonth = d.toLocaleDateString("en-GB", {
      timeZone: BUSINESS_TIME_ZONE,
      day: "numeric",
      month: "short",
    });
    return `${dayMonth}, ${clock}`;
  } catch {
    return clock;
  }
}

export function zeroVisitDetail(period = DEFAULT_ACTIVITY_PERIOD) {
  const p = normalizeActivityPeriod(period);
  if (p === "week") return "No visits this week";
  if (p === "month") return "No visits this month";
  return "No visits today";
}

export function employeeActivityMeta(emp, period = DEFAULT_ACTIVITY_PERIOD, today = todayIsoDate()) {
  const count = toNonNegInt(emp?.visit_count);
  const visitsLabel = `${count} visit${count === 1 ? "" : "s"}`;
  if (count <= 0) {
    return {
      visitCount: count,
      visitsLabel,
      detail: zeroVisitDetail(period),
      zero: true,
    };
  }
  const context = formatLatestVisitContext(emp?.latest_visit_at, period, today);
  return {
    visitCount: count,
    visitsLabel,
    detail: context ? `Last visit · ${context}` : "",
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

export function visitsRefreshPlan(activityPeriod = DEFAULT_ACTIVITY_PERIOD, visitScope = {}) {
  return {
    activity: true,
    visits: true,
    activityPeriod: normalizeActivityPeriod(activityPeriod),
    visitScope,
  };
}
