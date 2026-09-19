/**
 * Village Excel import — validate/preview mapping.
 * Confirm always sends { import_token } only.
 */

export const VILLAGE_IMPORT_ACCEPT = ".xlsx,application/vnd.openxmlformats-offamedocument.spreadsheetml.sheet";
export const VILLAGE_IMPORT_FILENAME = "Kavya_Village_Import_Template.xlsx";
export const IMPORT_BUTTON_LABEL = "Import Excel";

export const ERROR_CODES = {
  TAMIL_NAME_CONFLICT: "TAMIL_NAME_CONFLICT",
  EMPLOYEE_NOT_FOUND: "EMPLOYEE_NOT_FOUND",
  AMBIGUOUS_EMPLOYEE: "AMBIGUOUS_EMPLOYEE",
  EMPLOYEE_MISMATCH: "EMPLOYEE_MISMATCH",
  MISSING_VILLAGE: "MISSING_VILLAGE",
  INVALID_FILE: "INVALID_FILE",
  MISSING_HEADERS: "MISSING_HEADERS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_CONSUMED: "TOKEN_CONSUMED",
};

const ERROR_TITLES = {
  [ERROR_CODES.TAMIL_NAME_CONFLICT]: "Tamil name conflict",
  [ERROR_CODES.EMPLOYEE_NOT_FOUND]: "Employee not found",
  [ERROR_CODES.AMBIGUOUS_EMPLOYEE]: "Ambiguous employee",
  [ERROR_CODES.EMPLOYEE_MISMATCH]: "Employee mismatch",
  [ERROR_CODES.MISSING_VILLAGE]: "Missing village",
  [ERROR_CODES.INVALID_FILE]: "Invalid file",
  [ERROR_CODES.MISSING_HEADERS]: "Missing headers",
  [ERROR_CODES.TOKEN_EXPIRED]: "Validation expired",
  [ERROR_CODES.TOKEN_CONSUMED]: "Import already completed",
};

const SUMMARY_FIELDS = [
  { key: "totalRows", label: "Total Rows", aliases: ["total_rows", "row_count", "rows_processed", "rows"] },
  { key: "uniqueVillages", label: "Unique Villages", aliases: ["unique_villages", "unique_village_count"] },
  { key: "newVillages", label: "New Villages", aliases: ["new_villages", "villages_to_create", "create_village_count"] },
  { key: "existingVillages", label: "Existing Villages", aliases: ["existing_villages", "villages_reused", "existing_village_count"] },
  { key: "employeeAssignments", label: "Employee Assignments", aliases: ["employee_assignments", "assignments_to_create", "assignment_count"] },
  { key: "tamilNamesAvailable", label: "Tamil Names Available", aliases: ["tamil_names_available", "tamil_available", "name_ta_present"] },
  { key: "tamilNamesMissing", label: "Tamil Names Missing", aliases: ["tamil_names_missing", "tamil_missing", "name_ta_missing"] },
  { key: "sharedVillages", label: "Shared Villages", aliases: ["shared_villages", "shared_village_count"] },
  { key: "warnings", label: "Warnings", aliases: ["warning_count", "warnings"] },
  { key: "errors", label: "Errors", aliases: ["error_count", "errors"] },
];

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function unwrapImportPayload(raw) {
  if (raw == null) return {};
  const body = raw.data !== undefined && raw.status != null && raw.config != null ? raw.data : raw;
  if (isPlainObject(body) && body.success === true && body.data !== undefined) {
    return isPlainObject(body.data) ? body.data : { value: body.data };
  }
  if (isPlainObject(body) && isPlainObject(body.data) && (body.data.import_token != null || body.data.can_confirm != null || body.data.row_results || body.data.summary)) {
    return body.data;
  }
  return isPlainObject(body) ? body : {};
}

function pickNumber(source, aliases) {
  if (!isPlainObject(source)) return null;
  for (const key of aliases) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    if (Array.isArray(value)) return value.length;
  }
  return null;
}

function pickString(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function isXlsxFile(file) {
  if (!file) return false;
  const name = String(file.name || "");
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  if (ext === "xlsx") return true;
  const type = String(file.type || "").toLowerCase();
  return type.includes("spreadsheetml");
}

export function xlsxFileError(file) {
  if (!file) return "Choose an Excel (.xlsx) file.";
  if (!isXlsxFile(file)) return "Please choose an Excel (.xlsx) file. Other formats are not supported.";
  return "";
}

export function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildConfirmPayload(importToken) {
  return { import_token: String(importToken || "") };
}

export function canConfirmImport(preview) {
  const token = pickString(preview?.import_token);
  return Boolean(preview?.can_confirm) && Boolean(token);
}

export function isConfirmDisabled(preview, busy = false) {
  return busy || !canConfirmImport(preview);
}

/** Prevent duplicate validate/confirm submissions. */
export function tryAcquireActionLock(lock) {
  if (!lock || lock.current) return false;
  lock.current = true;
  return true;
}

export function releaseActionLock(lock) {
  if (lock) lock.current = false;
}

function errorCode(entry) {
  if (typeof entry === "string") return "";
  return pickString(entry?.code, entry?.error_code, entry?.type, entry?.error).toUpperCase();
}

function flattenErrors(list) {
  return asArray(list)
    .map((entry) => {
      if (typeof entry === "string") {
        return { code: "", message: entry, village: "", rows: [] };
      }
      if (!isPlainObject(entry)) return null;
      const rows = asArray(entry.rows || entry.entries || entry.values || entry.conflicts).map((row) => ({
        row: row?.row ?? row?.row_number ?? row?.line ?? null,
        name_ta: pickString(row?.name_ta, row?.village_tamil_name, row?.tamil_name, row?.value),
        message: pickString(row?.message, row?.detail),
      }));
      return {
        code: errorCode(entry),
        message: pickString(entry.message, entry.detail, entry.title, ERROR_TITLES[errorCode(entry)]),
        village: pickString(entry.village, entry.village_name, entry.name),
        employee_id: pickString(entry.employee_id, entry.employee_code),
        employee_name: pickString(entry.employee_name, entry.name),
        row: entry.row ?? entry.row_number ?? null,
        rows,
      };
    })
    .filter(Boolean);
}

function flattenWarnings(list) {
  return asArray(list)
    .map((entry) => {
      if (typeof entry === "string") return { code: "", message: entry, row: null };
      if (!isPlainObject(entry)) return null;
      return {
        code: errorCode(entry),
        message: pickString(entry.message, entry.detail, entry.title),
        row: entry.row ?? entry.row_number ?? null,
        village: pickString(entry.village, entry.village_name),
      };
    })
    .filter(Boolean);
}

export function errorTitle(code, fallback = "Import error") {
  return ERROR_TITLES[String(code || "").toUpperCase()] || fallback;
}

export function rowPreviewStatus(row) {
  if (!isPlainObject(row)) return { kind: "ready", label: "Ready" };

  const explicit = pickString(row.status_label, row.status_display, row.label);
  const status = pickString(row.status, row.result, row.state).toLowerCase();
  const code = errorCode(row);
  const flags = asArray(row.flags || row.tags || row.markers).map((flag) => String(flag).toLowerCase());

  if (code && ERROR_TITLES[code] && code !== ERROR_CODES.TOKEN_EXPIRED) {
    return { kind: "error", label: ERROR_TITLES[code] };
  }
  if (status.includes("error") || status === "invalid" || flags.includes("error") || row.is_error === true) {
    return { kind: "error", label: explicit || "Error" };
  }
  if (status.includes("warn") || flags.includes("warning") || row.is_warning === true) {
    return { kind: "warning", label: explicit || "Warning" };
  }
  if (explicit) {
    const kind = /error/i.test(explicit) ? "error" : /warn/i.test(explicit) ? "warning" : "ready";
    return { kind, label: explicit };
  }
  if (flags.includes("new_village") || status.includes("new")) {
    return { kind: "ready", label: "New Village" };
  }
  if (flags.includes("shared_village") || status.includes("shared")) {
    return { kind: "ready", label: "Shared Village" };
  }
  if (flags.includes("village_only") || status.includes("unassigned") || status.includes("village_only")) {
    return { kind: "ready", label: "Village Only" };
  }
  if (flags.includes("existing_village") || status.includes("existing") || status.includes("reused")) {
    return { kind: "ready", label: "Existing Village" };
  }
  if (status === "ready" || status === "ok" || status === "valid") {
    return { kind: "ready", label: "Ready" };
  }
  return { kind: "ready", label: status ? status.replace(/_/g, " ") : "Ready" };
}

export function normalizeRowResult(row, index = 0) {
  const src = isPlainObject(row) ? row : {};
  const status = rowPreviewStatus(src);
  return {
    key: `${src.row ?? src.row_number ?? index + 1}-${src.village ?? src.village_name ?? index}`,
    row: src.row ?? src.row_number ?? src.line ?? index + 1,
    employee_id: pickString(src.employee_id, src.employee_code, src.emp_id),
    employee_name: pickString(src.employee_name, src.employee, src.name),
    village: pickString(src.village, src.village_name, src.name),
    village_tamil_name: pickString(src.village_tamil_name, src.name_ta, src.tamil_name),
    status: status.label,
    statusKind: status.kind,
    message: pickString(src.message, src.detail, src.warning, src.error),
  };
}

export function normalizeEmployeePreview(entry) {
  const src = isPlainObject(entry) ? entry : {};
  const villages = asArray(src.villages);
  const count =
    pickNumber(src, ["village_count", "villages", "count", "assignment_count"]) ??
    (villages.length || null);
  return {
    employee_id: pickString(src.employee_id, src.employee_code, src.code),
    employee_name: pickString(src.employee_name, src.display_name, src.name),
    village_count: count,
  };
}

export function buildSummaryCards(preview) {
  const summary = preview?.summary || {};
  return SUMMARY_FIELDS.map((field) => {
    const value = summary[field.key];
    if (value == null) return null;
    return { key: field.key, label: field.label, value };
  }).filter(Boolean);
}

export function normalizeValidateResponse(raw) {
  const data = unwrapImportPayload(raw);
  const summarySrc = isPlainObject(data.summary) ? data.summary : isPlainObject(data.counts) ? data.counts : data;
  const summary = {};
  for (const field of SUMMARY_FIELDS) {
    const value = pickNumber(summarySrc, field.aliases);
    if (value != null) summary[field.key] = value;
  }
  if (summary.warnings == null) {
    const warningCount = asArray(data.warnings).length;
    if (warningCount) summary.warnings = warningCount;
  }
  if (summary.errors == null) {
    const errorCount = asArray(data.errors).length + asArray(data.blocking_errors).length;
    if (errorCount) summary.errors = errorCount;
  }

  const employees = asArray(
    data.employee_assignment_preview ||
      data.employee_assignments_preview ||
      data.assignment_preview ||
      (Array.isArray(data.employee_assignments) ? data.employee_assignments : null) ||
      data.employees
  )
    .filter((entry) => isPlainObject(entry))
    .map(normalizeEmployeePreview)
    .filter((entry) => entry.employee_id || entry.employee_name);

  const rows = asArray(data.row_results || data.rows || data.preview_rows || data.preview?.rows).map(
    (row, index) => normalizeRowResult(row, index)
  );

  const errors = [...flattenErrors(data.errors), ...flattenErrors(data.blocking_errors)];
  const warnings = flattenWarnings(data.warnings);

  const unassigned =
    pickNumber(data, ["unassigned_villages", "unassigned_village_count", "village_only_count"]) ??
    pickNumber(summarySrc, ["unassigned_villages", "unassigned_village_count", "village_only_count"]);

  return {
    can_confirm: data.can_confirm === true,
    import_token: pickString(data.import_token, data.token) || "",
    summary,
    employees,
    unassignedVillages: unassigned,
    rows,
    errors,
    warnings,
  };
}

export function normalizeConfirmResponse(raw) {
  const data = unwrapImportPayload(raw);
  const summarySrc = isPlainObject(data.summary) ? data.summary : data;
  return {
    villagesCreated: pickNumber(summarySrc, ["villages_created", "created_villages", "new_villages"]),
    villagesReused: pickNumber(summarySrc, ["villages_reused", "existing_villages", "reused_villages"]),
    assignmentsCreated: pickNumber(summarySrc, ["assignments_created", "employee_assignments_created", "created_assignments"]),
    assignmentsReused: pickNumber(summarySrc, ["assignments_reused", "reused_assignments"]),
    rowsProcessed: pickNumber(summarySrc, ["rows_processed", "total_rows", "row_count"]),
    message: pickString(data.message, summarySrc.message) || "Import completed successfully",
  };
}

export function isExpiredImportError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const code = errorCode(data) || errorCode(data?.data) || errorCode(asArray(data?.errors)[0]);
  const text = `${pickString(data?.detail, data?.message, data?.error, err?.message)} ${code}`.toLowerCase();
  if (status === 410) return true;
  if (code === ERROR_CODES.TOKEN_EXPIRED || code === "EXPIRED" || code === "IMPORT_TOKEN_EXPIRED") return true;
  return text.includes("expired") || text.includes("import_token") && text.includes("invalid");
}

export function isConsumedImportError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const code = errorCode(data) || errorCode(data?.data);
  const text = `${pickString(data?.detail, data?.message, err?.message)} ${code}`.toLowerCase();
  if (status === 409) return true;
  if (code === ERROR_CODES.TOKEN_CONSUMED) return true;
  return text.includes("already") && (text.includes("consumed") || text.includes("used") || text.includes("imported"));
}

export function validateRequestErrorMessage(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (!err?.response) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (status === 401 || status === 403) {
    return "You don't have permission to import villages.";
  }
  const code = errorCode(data) || errorCode(asArray(data?.errors)[0]);
  if (code === ERROR_CODES.INVALID_FILE) return "Invalid file. Please upload a .xlsx workbook.";
  if (code === ERROR_CODES.MISSING_HEADERS) {
    return "Missing headers. The sheet must include Village, and may include Employee ID, Employee Name, and Village Tamil Name.";
  }
  return pickString(data?.detail, data?.message, Array.isArray(data?.errors) && typeof data.errors[0] === "string" ? data.errors[0] : "") ||
    "Could not validate this Excel file.";
}

export function confirmRequestErrorMessage(err) {
  if (!err?.response) {
    return "Could not reach the server. The import was not confirmed.";
  }
  if (isExpiredImportError(err)) {
    return "Validation expired. Please validate the Excel file again.";
  }
  if (isConsumedImportError(err)) {
    return "This import was already completed. Validate a file again if you need to import more villages.";
  }
  const status = err?.response?.status;
  if (status === 401 || status === 403) {
    return "You don't have permission to import villages.";
  }
  return pickString(err?.response?.data?.detail, err?.response?.data?.message) ||
    "Could not confirm the import.";
}

export function filterPreviewRows(rows, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return rows || [];
  return (rows || []).filter((row) =>
    [row.row, row.employee_id, row.employee_name, row.village, row.village_tamil_name, row.status]
      .map((value) => String(value ?? "").toLowerCase())
      .some((value) => value.startsWith(q) || value.includes(q))
  );
}
