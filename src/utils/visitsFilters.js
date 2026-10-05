/**
 * Field Visits — Visit Records filter params, scope labels, empty copy.
 *
 * Date chips use Asia/Kolkata via todayIsoDate (same contract as the existing page).
 * Numeric employee= is AUTH User PK only (buildVisitFilterParams).
 */

import { todayIsoDate } from "./businessDate.js";
import { buildVisitFilterParams } from "./reportsEmployeeFilter.js";
import {
  visitEmployeeCode,
  visitEmployeeDisplayName,
} from "./visitsActivity.js";

export const PAGE_SIZE = 12;

export const DATE_CHIPS = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

export const CLEARED_VISIT_RECORD_FILTERS = {
  employeeUserId: "",
  dateChip: "all",
  search: "",
  page: 1,
};

/** Inclusive start_date/end_date (YYYY-MM-DD) for admin/visits. */
export function dateRangeForChip(chip, today = todayIsoDate()) {
  if (!chip || chip === "all") return null;
  const end = today;
  if (chip === "today") {
    return { start_date: end, end_date: end };
  }
  if (chip === "week") {
    const endDate = new Date(`${end}T12:00:00`);
    if (Number.isNaN(endDate.getTime())) return null;
    const weekday = endDate.getDay();
    const mondayOffset = weekday === 0 ? 6 : weekday - 1;
    endDate.setDate(endDate.getDate() - mondayOffset);
    return { start_date: todayIsoDate(endDate), end_date: end };
  }
  if (chip === "month") {
    const start = `${end.slice(0, 7)}-01`;
    return { start_date: start, end_date: end };
  }
  return null;
}

export function dateChipLabel(chip) {
  return DATE_CHIPS.find((c) => c.id === chip)?.label || "All time";
}

/**
 * GET /admin/visits/ query. Employee param omitted when All Employees.
 * Period + employee + search combine. Pagination preserved by caller.
 */
export function buildVisitsQueryParams({
  page = 1,
  pageSize = PAGE_SIZE,
  search = "",
  dateChip = "all",
  employeeUserId = "",
  today,
} = {}) {
  const params = {
    ordering: "-created_at",
    page,
    page_size: pageSize,
  };
  const q = String(search || "").trim();
  if (q) params.search = q;
  const range = dateRangeForChip(dateChip, today ?? todayIsoDate()) || {};
  Object.assign(
    params,
    buildVisitFilterParams({
      start_date: range.start_date,
      end_date: range.end_date,
      employeeUserId,
    })
  );
  return params;
}

export function applyEmployeeChange(state, employeeUserId) {
  return { ...state, employeeUserId: String(employeeUserId ?? ""), page: 1 };
}

export function applyPeriodChange(state, dateChip) {
  return { ...state, dateChip, page: 1 };
}

export function applySearchChange(state, search) {
  return { ...state, search: String(search ?? ""), page: 1 };
}

export function applyClearVisitFilters() {
  return { ...CLEARED_VISIT_RECORD_FILTERS };
}

export function visitsScopeKey({ employeeUserId = "", dateChip = "all", search = "", page = 1 } = {}) {
  return `${String(employeeUserId)}|${dateChip}|${String(search).trim()}|${page}`;
}

export function visitResultsViewState({ currentScope, loadedScope, loading, error } = {}) {
  if (loading || currentScope !== loadedScope) return "loading";
  if (error) return "error";
  return "ready";
}

/** Server paginated count — never activity-summary.total_visits. */
export function visitRecordsCountFromResponse(data, fallbackListLength = 0) {
  if (typeof data?.count === "number" && Number.isFinite(data.count)) return data.count;
  return fallbackListLength;
}

export function visitRecordsScopeLine({ employee, dateChip } = {}) {
  const period = dateChipLabel(dateChip);
  const name = visitEmployeeDisplayName(employee);
  if (!name) return `All Employees · ${period}`;
  const code = visitEmployeeCode(employee);
  return code ? `${name} · ${code} · ${period}` : `${name} · ${period}`;
}

export function visitRecordsCountLine(count) {
  if (typeof count !== "number" || !Number.isFinite(count)) return null;
  return `${count} submitted visit${count === 1 ? "" : "s"}`;
}

export function visitRecordsEmptyCopy({ hasSearch, dateChip, employeeName } = {}) {
  if (hasSearch) {
    return {
      title: "No visits match the current filters.",
      subtitle: "Try a different search, employee, or period.",
    };
  }
  const name = String(employeeName || "").trim();
  if (name && dateChip === "today") {
    return {
      title: `${name} has no submitted visits today.`,
      subtitle: "Try another period or choose All Employees.",
    };
  }
  if (name) {
    return {
      title: `No submitted visits found for ${name} in this period.`,
      subtitle: "Try a different period or clear filters.",
    };
  }
  if (dateChip === "today") {
    return {
      title: "No submitted visits today.",
      subtitle: "Visits appear here when field agents submit them from the mobile app.",
    };
  }
  return {
    title: "No field visits yet",
    subtitle: "Visits appear here when field agents submit them from the mobile app.",
  };
}
