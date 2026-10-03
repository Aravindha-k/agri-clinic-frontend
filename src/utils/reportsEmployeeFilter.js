/**
 * Admin Reports employee filter contract.
 *
 * Visit.employee is AUTH_USER_MODEL. Numeric `employee` query values are User PKs.
 * EmployeeProfile.pk must NEVER be sent as `employee=`.
 *
 * Preferred option value: emp.user_id (number|string).
 * Also accepted by backend: employee_id code (e.g. KAC-0003) — not used by the dropdown.
 */

/** @returns {string|null} User PK as string, or null if user_id is missing/invalid. */
export function reportEmployeeOptionValue(emp) {
  if (!emp || typeof emp !== "object") return null;
  const userId = emp.user_id;
  if (userId == null || userId === "") return null;
  const n = Number(userId);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(n);
}

/** Employees that can safely appear in the Reports filter dropdown. */
export function employeesForReportSelect(employees) {
  return (Array.isArray(employees) ? employees : []).filter(
    (emp) => reportEmployeeOptionValue(emp) != null
  );
}

/**
 * Build GET /reports/summary/ params.
 * @param {{ from?: string, to?: string, employeeUserId?: string }} opts
 */
export function buildReportSummaryParams({ from, to, employeeUserId } = {}) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const emp = String(employeeUserId ?? "").trim();
  if (emp) {
    // Reject profile-shaped accidental values only by requiring a positive int string
    // (dropdown already uses user_id). Never fall back to profile id.
    params.employee = emp;
  }
  return params;
}

/**
 * Build admin visits list/export params (same employee identity as summary).
 * @param {{ start_date?: string, end_date?: string, employeeUserId?: string }} opts
 */
export function buildVisitFilterParams({ start_date, end_date, employeeUserId } = {}) {
  const params = {};
  if (start_date) params.start_date = start_date;
  if (end_date) params.end_date = end_date;
  const emp = String(employeeUserId ?? "").trim();
  if (emp) params.employee = emp;
  return params;
}
