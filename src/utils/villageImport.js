/**
 * Village Excel import — maps the Admin validate/confirm contract.
 * Confirm always sends { import_token } only.
 * Assignment identity is (employee, village). Shared villages are valid.
 */

export const VILLAGE_IMPORT_ACCEPT = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const VILLAGE_IMPORT_FILENAME = "Kavya_Village_Import_Template.xlsx";
export const IMPORT_BUTTON_LABEL = "Import Excel";

export const ERROR_CODES = {
  TAMIL_NAME_CONFLICT: "TAMIL_NAME_CONFLICT",
  EMPLOYEE_NOT_FOUND: "EMPLOYEE_NOT_FOUND",
  AMBIGUOUS_EMPLOYEE: "AMBIGUOUS_EMPLOYEE",
  EMPLOYEE_MISMATCH: "EMPLOYEE_MISMATCH",
  MISSING_VILLAGE: "MISSING_VILLAGE",
  INVALID_MISSING_VILLAGE: "INVALID_MISSING_VILLAGE",
  INVALID_FILE: "INVALID_FILE",
  INVALID_EXTENSION: "INVALID_EXTENSION",
  MISSING_HEADERS: "MISSING_HEADERS",
  FILE_REQUIRED: "FILE_REQUIRED",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  MALFORMED_WORKBOOK: "MALFORMED_WORKBOOK",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_CONSUMED: "TOKEN_CONSUMED",
  TOKEN_REPLAY: "TOKEN_REPLAY",
  TOKEN_REQUIRED: "TOKEN_REQUIRED",
  TOKEN_FORBIDDEN: "TOKEN_FORBIDDEN",
};

const BLOCKING_CODES = new Set([
  ERROR_CODES.EMPLOYEE_NOT_FOUND,
  ERROR_CODES.AMBIGUOUS_EMPLOYEE,
  ERROR_CODES.EMPLOYEE_MISMATCH,
]);

const SKIPPABLE_CODES = new Set([ERROR_CODES.TAMIL_NAME_CONFLICT]);

const NON_BLOCKING_ROW_CODES = new Set([
  ERROR_CODES.INVALID_MISSING_VILLAGE,
  ERROR_CODES.MISSING_VILLAGE,
  "NAME_BASED_MATCH",
  "VILLAGE_ONLY",
  "BLANK_TAMIL",
  "DUPLICATE_ASSIGNMENT",
  "DUPLICATE_ROW",
]);

const ERROR_TITLES = {
  [ERROR_CODES.TAMIL_NAME_CONFLICT]: "Tamil name conflict (skipped)",
  [ERROR_CODES.EMPLOYEE_NOT_FOUND]: "Employee not found",
  [ERROR_CODES.AMBIGUOUS_EMPLOYEE]: "Ambiguous employee",
  [ERROR_CODES.EMPLOYEE_MISMATCH]: "Employee mismatch",
  [ERROR_CODES.MISSING_VILLAGE]: "Missing village",
  [ERROR_CODES.INVALID_MISSING_VILLAGE]: "Missing village",
  [ERROR_CODES.INVALID_FILE]: "Invalid file",
  [ERROR_CODES.INVALID_EXTENSION]: "Invalid file",
  [ERROR_CODES.MISSING_HEADERS]: "Missing headers",
  [ERROR_CODES.FILE_REQUIRED]: "Excel file required",
  [ERROR_CODES.FILE_TOO_LARGE]: "File too large",
  [ERROR_CODES.MALFORMED_WORKBOOK]: "Unreadable workbook",
  [ERROR_CODES.TOKEN_EXPIRED]: "Validation expired",
  [ERROR_CODES.TOKEN_INVALID]: "Validation expired",
  [ERROR_CODES.TOKEN_CONSUMED]: "Import already completed",
  [ERROR_CODES.TOKEN_REPLAY]: "Import already completed",
  [ERROR_CODES.TOKEN_REQUIRED]: "Validation required",
  [ERROR_CODES.TOKEN_FORBIDDEN]: "Not allowed",
};

const KNOWN_CODES = new Set(Object.keys(ERROR_TITLES));

const SUMMARY_FIELDS = [
  { key: "totalRows", label: "Total Rows", aliases: ["total_rows", "valid_rows", "row_count", "rows_processed", "rows"] },
  { key: "uniqueVillages", label: "Unique Villages", aliases: ["unique_villages", "unique_village_count"] },
  { key: "newVillages", label: "New Villages", aliases: ["new_villages", "villages_to_create", "create_village_count"] },
  { key: "existingVillages", label: "Existing Villages", aliases: ["villages_existing", "existing_villages", "villages_reused", "existing_village_count"] },
  { key: "employeeAssignments", label: "Employee Assignments", aliases: ["assignments_to_create", "employee_assignments", "assignment_count"] },
  { key: "tamilNamesAvailable", label: "Tamil Names Available", aliases: ["tamil_names_present", "tamil_names_available", "tamil_available", "name_ta_present"] },
  { key: "tamilNamesMissing", label: "Tamil Names Missing", aliases: ["tamil_names_blank", "tamil_names_missing", "tamil_missing", "name_ta_missing"] },
  { key: "sharedVillages", label: "Shared Villages", aliases: ["shared_village_count"] },
  { key: "warnings", label: "Warnings", aliases: ["warning_count"] },
  { key: "errors", label: "Errors", aliases: ["error_count", "blocking_error_count"] },
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

function truthyFlag(value) {
  return value === true || value === 1 || value === "true" || value === "True";
}

function extractKnownCode(text) {
  const upper = String(text || "").toUpperCase();
  const trimmed = upper.trim();
  if (KNOWN_CODES.has(trimmed)) return trimmed;
  const ordered = [...KNOWN_CODES].sort((a, b) => b.length - a.length);
  for (const code of ordered) {
    if (new RegExp(`\\b${code}\\b`).test(upper)) return code;
  }
  return "";
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
  if (typeof entry === "string") return extractKnownCode(entry);
  if (!isPlainObject(entry)) return "";
  return pickString(entry?.code, entry?.error_code, entry?.type).toUpperCase() || extractKnownCode(entry?.error);
}

function parseExcelRow(text, fallback = null) {
  const match = String(text || "").match(/Excel row\s+(\d+)/i);
  if (match) return Number(match[1]);
  return fallback;
}

function flattenIssue(entry) {
  if (typeof entry === "string") {
    const code = extractKnownCode(entry);
    return {
      code,
      message: entry,
      village: "",
      employee_id: "",
      employee_name: "",
      row: parseExcelRow(entry),
      rows: [],
    };
  }
  if (!isPlainObject(entry)) return null;
  const rows = asArray(entry.rows || entry.entries || entry.values || entry.conflicts || entry.excel_rows).map((row) => {
    if (typeof row === "number") return { row, name_ta: "", message: "" };
    return {
      row: row?.row ?? row?.row_number ?? row?.line ?? row?.excel_row ?? null,
      name_ta: pickString(row?.name_ta, row?.village_tamil_name, row?.tamil_name, row?.value),
      message: pickString(row?.message, row?.detail),
    };
  });
  const tamilValues = asArray(entry.tamil_values).map((value) => String(value));
  tamilValues.forEach((value, index) => {
    if (!rows[index]) rows.push({ row: asArray(entry.excel_rows)[index] ?? null, name_ta: value, message: "" });
    else if (!rows[index].name_ta) rows[index].name_ta = value;
  });
  return {
    code: errorCode(entry),
    message: pickString(entry.message, entry.detail, entry.title, ERROR_TITLES[errorCode(entry)]),
    village: pickString(entry.village, entry.village_name, entry.name),
    employee_id: pickString(entry.employee_id, entry.employee_code),
    employee_name: pickString(entry.employee_name, entry.name),
    row: entry.row ?? entry.row_number ?? entry.excel_row ?? parseExcelRow(entry.message),
    rows,
  };
}

export function errorTitle(code, fallback = "Import error") {
  return ERROR_TITLES[String(code || "").toUpperCase()] || fallback;
}

export function rowPreviewStatus(row) {
  if (!isPlainObject(row)) return { kind: "ready", label: "Ready" };

  const explicit = pickString(row.status_label, row.status_display, row.label);
  const status = pickString(row.status, row.result, row.state).toLowerCase();
  const code = errorCode(row) || extractKnownCode(asArray(row.messages).join(" "));
  const flags = asArray(row.flags || row.tags || row.markers || row.messages).map((flag) => String(flag).toLowerCase());

  if (SKIPPABLE_CODES.has(code) || flags.includes("tamil_name_conflict") || status === "skipped") {
    return { kind: "warning", label: explicit || (code === ERROR_CODES.TAMIL_NAME_CONFLICT ? "Skipped (Tamil conflict)" : "Skipped") };
  }
  if (BLOCKING_CODES.has(code)) {
    return { kind: "error", label: ERROR_TITLES[code] };
  }
  if (NON_BLOCKING_ROW_CODES.has(code) && ERROR_TITLES[code]) {
    return { kind: "warning", label: explicit || ERROR_TITLES[code] };
  }
  if (status.includes("error") || status === "invalid" || flags.includes("error") || row.is_error === true) {
    return { kind: "error", label: explicit || (ERROR_TITLES[code] || "Error") };
  }
  if (status.includes("warn") || flags.includes("warning") || row.is_warning === true || flags.includes("name_based_match")) {
    return { kind: "warning", label: explicit || "Warning" };
  }
  if (explicit) {
    const kind = /error/i.test(explicit) ? "error" : /warn|skip/i.test(explicit) ? "warning" : "ready";
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
  const excelRow = src.excel_row ?? src.row ?? src.row_number ?? src.line ?? index + 1;
  const employeeId = pickString(src.matched_employee_id, src.employee_id, src.employee_code, src.emp_id);
  const village = pickString(src.village, src.village_name, src.name);
  return {
    key: `${excelRow}-${employeeId}-${village}-${index}`,
    row: excelRow,
    employee_id: employeeId,
    employee_name: pickString(src.employee_name, src.employee, src.name),
    village,
    village_tamil_name: pickString(src.village_tamil_name, src.name_ta, src.tamil_name),
    status: status.label,
    statusKind: status.kind,
    message: pickString(src.message, src.detail, src.warning, src.error, asArray(src.messages).join(" ")),
  };
}

function parseEmployeeLabel(label) {
  const text = String(label || "").trim();
  if (!text) return null;
  const matched = text.match(/^([A-Za-z0-9-]+)\s*\((.+)\)\s*$/);
  if (matched) {
    return { employee_id: matched[1], employee_name: matched[2].trim(), village_count: null };
  }
  return { employee_id: "", employee_name: text, village_count: null };
}

export function normalizeEmployeePreview(entry) {
  if (typeof entry === "string") return parseEmployeeLabel(entry);
  const src = isPlainObject(entry) ? entry : {};
  const villages = asArray(src.villages);
  const count =
    pickNumber(src, ["village_count", "count", "assignment_count"]) ??
    (villages.length || null);
  return {
    employee_id: pickString(src.employee_id, src.employee_code, src.code, src.matched_employee_id),
    employee_name: pickString(src.employee_name, src.display_name, src.name),
    village_count: count,
  };
}

function normalizeSharedVillages(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (typeof entry === "string") return { village: entry, employees: [] };
        if (!isPlainObject(entry)) return null;
        const employees = asArray(entry.employees || entry.staff || entry.assigned_employees).map((emp) =>
          typeof emp === "string" ? emp : pickString(emp?.employee_id, emp?.employee_name, emp?.label)
        );
        return {
          village: pickString(entry.village, entry.village_name, entry.name),
          employees: employees.filter(Boolean),
        };
      })
      .filter((entry) => entry && entry.village);
  }
  if (isPlainObject(raw)) {
    return Object.entries(raw).map(([village, employees]) => ({
      village,
      employees: asArray(employees).map((emp) => String(emp)),
    }));
  }
  return [];
}

function normalizeTamilConflicts(list) {
  return asArray(list)
    .map((entry) => {
      if (!isPlainObject(entry)) return null;
      const excelRows = asArray(entry.excel_rows || entry.rows);
      const tamilValues = asArray(entry.tamil_values);
      const rows = excelRows.map((row, index) => ({
        row: typeof row === "number" ? row : row?.row ?? row?.excel_row ?? null,
        name_ta: tamilValues[index] != null ? String(tamilValues[index]) : pickString(row?.name_ta, row?.value),
      }));
      if (!rows.length && tamilValues.length) {
        tamilValues.forEach((value) => rows.push({ row: null, name_ta: String(value) }));
      }
      return {
        code: ERROR_CODES.TAMIL_NAME_CONFLICT,
        message: "Tamil name conflict",
        village: pickString(entry.village, entry.display_name, entry.village_name),
        employee_id: "",
        employee_name: asArray(entry.affected_employees).filter(Boolean).join(", "),
        row: null,
        rows,
        skippable: true,
      };
    })
    .filter(Boolean);
}

export function buildSummaryCards(preview) {
  const summary = preview?.summary || {};
  return SUMMARY_FIELDS.map((field) => {
    const value = summary[field.key];
    if (value == null) return null;
    return { key: field.key, label: field.label, value };
  }).filter(Boolean);
}

function blockingCodesFrom(data) {
  const codes = new Set();
  asArray(data.blocking_errors).forEach((entry) => {
    const code = typeof entry === "string" ? extractKnownCode(entry) || String(entry).trim().toUpperCase() : errorCode(entry);
    if (code) codes.add(code);
  });
  return codes;
}

export function normalizeValidateResponse(raw) {
  const data = unwrapImportPayload(raw);
  const summarySrc = isPlainObject(data.summary) ? data.summary : isPlainObject(data.counts) ? data.counts : data;
  const summary = {};
  for (const field of SUMMARY_FIELDS) {
    const value = pickNumber(summarySrc, field.aliases);
    if (value != null) summary[field.key] = value;
  }

  const sharedVillages = normalizeSharedVillages(data.shared_villages);
  if (summary.sharedVillages == null && sharedVillages.length) {
    summary.sharedVillages = sharedVillages.length;
  }

  const blockingCodes = blockingCodesFrom(data);
  const blockingFromCodes = asArray(data.blocking_errors).map(flattenIssue).filter(Boolean);
  const allRowIssues = asArray(data.errors).map(flattenIssue).filter(Boolean);
  const blockingFromRows = allRowIssues.filter((issue) => BLOCKING_CODES.has(issue.code) || blockingCodes.has(issue.code));
  const blockingFromCodesOnly = blockingFromCodes.filter(
    (issue) => !blockingFromRows.some((row) => row.code === issue.code)
  );
  const blocking = [...blockingFromRows, ...blockingFromCodesOnly];
  const seenBlocking = new Set();
  const errors = blocking.filter((issue) => {
    const key = `${issue.code}:${issue.row}:${issue.message}`;
    if (seenBlocking.has(key)) return false;
    seenBlocking.add(key);
    return true;
  });

  const skippable = [
    ...normalizeTamilConflicts(data.tamil_name_conflicts),
    ...allRowIssues.filter((issue) => SKIPPABLE_CODES.has(issue.code)),
    ...asArray(data.skippable_errors).map(flattenIssue).filter((issue) => issue && SKIPPABLE_CODES.has(issue.code)),
  ].filter((issue, index, list) => {
    const key = `${issue.code}:${issue.village}:${issue.rows.map((row) => `${row.row}:${row.name_ta}`).join("|")}`;
    return list.findIndex((other) => `${other.code}:${other.village}:${other.rows.map((row) => `${row.row}:${row.name_ta}`).join("|")}` === key) === index;
  });

  const warnings = [
    ...asArray(data.warnings).map(flattenIssue).filter(Boolean),
    ...allRowIssues.filter((issue) => NON_BLOCKING_ROW_CODES.has(issue.code) && !blockingCodes.has(issue.code)),
    ...skippable,
  ].filter((issue) => issue && issue.message);

  if (summary.warnings == null && warnings.length) summary.warnings = warnings.length;
  if (summary.errors == null && (errors.length || blockingCodes.size)) {
    summary.errors = errors.length || blockingCodes.size;
  }

  const employees = asArray(
    data.employee_assignment_preview ||
      data.employee_assignments_preview ||
      data.assignment_preview ||
      (Array.isArray(data.employee_assignments) ? data.employee_assignments : null) ||
      data.employees ||
      data.employees_matched
  )
    .map(normalizeEmployeePreview)
    .filter((entry) => entry && (entry.employee_id || entry.employee_name));

  const rows = asArray(data.row_results || data.rows || data.preview_rows || data.preview?.rows).map(
    (row, index) => normalizeRowResult(row, index)
  );

  const unassigned =
    pickNumber(data, ["unassigned_villages", "unassigned_village_count", "village_only_count"]) ??
    pickNumber(summarySrc, ["unassigned_villages", "unassigned_village_count", "village_only_count"]);

  const token = pickString(data.import_token, data.token);
  const canConfirm = truthyFlag(data.can_confirm) && Boolean(token);

  return {
    can_confirm: canConfirm,
    import_token: token,
    summary,
    employees,
    sharedVillages,
    unassignedVillages: unassigned,
    rows,
    errors,
    warnings,
    tamilConflicts: skippable.filter((issue) => issue.code === ERROR_CODES.TAMIL_NAME_CONFLICT),
  };
}

export function normalizeConfirmResponse(raw) {
  const data = unwrapImportPayload(raw);
  const summarySrc = isPlainObject(data.summary) ? data.summary : data;
  return {
    villagesCreated: pickNumber(summarySrc, ["villages_created", "created_villages", "new_villages"]),
    villagesReused: pickNumber(summarySrc, ["villages_reused", "villages_existing", "existing_villages", "reused_villages"]),
    assignmentsCreated: pickNumber(summarySrc, ["assignments_created", "employee_assignments_created", "created_assignments"]),
    assignmentsReused: pickNumber(summarySrc, ["assignments_reused", "assignments_existing", "reused_assignments"]),
    rowsProcessed: pickNumber(summarySrc, ["rows_processed", "total_rows", "valid_rows", "row_count"]),
    skippedConflictedVillages: pickNumber(summarySrc, ["skipped_conflicted_villages"]),
    skippedConflictedAssignments: pickNumber(summarySrc, ["skipped_conflicted_assignments"]),
    message: pickString(data.message, summarySrc.message) || "Import completed successfully",
  };
}

function responseCode(err) {
  const data = err?.response?.data;
  return (
    errorCode(data) ||
    errorCode(data?.data) ||
    extractKnownCode(data?.code) ||
    errorCode(asArray(data?.errors)[0]) ||
    extractKnownCode(data?.errors?.import_token?.[0]) ||
    extractKnownCode(data?.errors?.import?.[0])
  );
}

export function isExpiredImportError(err) {
  const status = err?.response?.status;
  const code = responseCode(err);
  if (status === 410) return true;
  if (code === ERROR_CODES.TOKEN_EXPIRED || code === ERROR_CODES.TOKEN_INVALID) return true;
  if (code === ERROR_CODES.TOKEN_REPLAY || code === ERROR_CODES.TOKEN_CONSUMED || code === ERROR_CODES.TOKEN_FORBIDDEN) {
    return false;
  }
  const data = err?.response?.data;
  const text = `${pickString(data?.detail, data?.message, err?.message)} ${code}`.toLowerCase();
  return text.includes("expired") && (text.includes("token") || text.includes("import"));
}

export function isConsumedImportError(err) {
  const status = err?.response?.status;
  const code = responseCode(err);
  const data = err?.response?.data;
  const text = `${pickString(data?.detail, data?.message, err?.message)} ${code}`.toLowerCase();
  if (status === 409) return true;
  if (code === ERROR_CODES.TOKEN_CONSUMED || code === ERROR_CODES.TOKEN_REPLAY) return true;
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
  const code = responseCode(err);
  if (code === ERROR_CODES.INVALID_FILE || code === ERROR_CODES.INVALID_EXTENSION) {
    return "Invalid file. Please upload a .xlsx workbook.";
  }
  if (code === ERROR_CODES.MISSING_HEADERS) {
    return "Missing headers. The sheet must include Village, and may include Employee ID, Employee Name, and Village Tamil Name.";
  }
  if (code === ERROR_CODES.FILE_TOO_LARGE) return pickString(data?.message) || "File too large.";
  if (code === ERROR_CODES.MALFORMED_WORKBOOK) return pickString(data?.message) || "Could not read this Excel file.";
  if (code === ERROR_CODES.FILE_REQUIRED) return "Choose an Excel (.xlsx) file.";
  return pickString(data?.detail, data?.message, Array.isArray(data?.errors?.import) ? data.errors.import[0] : "") ||
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
  const code = responseCode(err);
  if (status === 401 || status === 403 || code === ERROR_CODES.TOKEN_FORBIDDEN) {
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
