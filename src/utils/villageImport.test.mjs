import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IMPORT_BUTTON_LABEL,
  VILLAGE_IMPORT_FILENAME,
  buildConfirmPayload,
  buildSummaryCards,
  canConfirmImport,
  confirmRequestErrorMessage,
  errorTitle,
  filterPreviewRows,
  formatFileSize,
  isConfirmDisabled,
  isConsumedImportError,
  isExpiredImportError,
  isXlsxFile,
  normalizeConfirmResponse,
  normalizeValidateResponse,
  releaseActionLock,
  rowPreviewStatus,
  tryAcquireActionLock,
  validateRequestErrorMessage,
  xlsxFileError,
} from "./villageImport.js";
import {
  TEMPLATE_EXAMPLE_ROWS,
  TEMPLATE_HEADERS,
  TEMPLATE_INSTRUCTIONS,
  TEMPLATE_SHEET_IMPORT,
  TEMPLATE_SHEET_INSTRUCTIONS,
  buildVillageImportTemplateBytes,
} from "./villageImportTemplate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageSrc = readFileSync(join(root, "pages/masters/MasterLocationsPage.jsx"), "utf8");
const modalSrc = readFileSync(join(root, "components/masters/VillageImportModal.jsx"), "utf8");
const apiSrc = readFileSync(join(root, "api/villageImport.api.js"), "utf8");

assert.equal(IMPORT_BUTTON_LABEL, "Import Excel");
assert.match(pageSrc, /IMPORT_BUTTON_LABEL/);
assert.match(pageSrc, /VillageImportModal/);
assert.match(pageSrc, /Add Village/);
assert.match(pageSrc, /onImported=\{fetchVillages\}/);
assert.match(pageSrc, /btn btn-secondary btn-md/);

assert.equal(isXlsxFile({ name: "villages.xlsx" }), true);
assert.equal(isXlsxFile({ name: "villages.xls" }), false);
assert.equal(isXlsxFile({ name: "villages.csv" }), false);
assert.equal(isXlsxFile({ name: "notes.txt" }), false);
assert.match(xlsxFileError({ name: "data.csv" }), /\.xlsx/);
assert.equal(xlsxFileError({ name: "ok.xlsx" }), "");

assert.match(modalSrc, /Download Sample Excel/);
assert.match(modalSrc, /downloadVillageImportTemplate/);
assert.match(modalSrc, /Kavya_Village_Import_Template\.xlsx|downloadVillageImportTemplate/);
assert.equal(VILLAGE_IMPORT_FILENAME, "Kavya_Village_Import_Template.xlsx");

const bytes = buildVillageImportTemplateBytes();
const zipText = new TextDecoder("utf-8").decode(bytes);
assert.equal(bytes[0], 0x50);
assert.equal(bytes[1], 0x4b);
assert.match(zipText, new RegExp(TEMPLATE_SHEET_IMPORT));
assert.match(zipText, new RegExp(TEMPLATE_SHEET_INSTRUCTIONS));
assert.deepEqual(TEMPLATE_HEADERS, ["Employee ID", "Employee Name", "Village", "Village Tamil Name"]);
assert.equal(TEMPLATE_EXAMPLE_ROWS.length, 5);
assert.equal(TEMPLATE_EXAMPLE_ROWS[0][0], "KAC-0003");
assert.equal(TEMPLATE_EXAMPLE_ROWS[4][2], "Unassigned Village");
assert.match(TEMPLATE_INSTRUCTIONS.join("\n"), /template only/i);
assert.match(TEMPLATE_INSTRUCTIONS.join("\n"), /District/);
assert.match(zipText, /Example Village 1/);
assert.match(zipText, /Shared Village/);

assert.match(apiSrc, /admin\/villages\/import\/validate\//);
assert.match(apiSrc, /admin\/villages\/import\/confirm\//);
assert.match(apiSrc, /form\.append\("file", file\)/);
assert.match(apiSrc, /\{ import_token: importToken \}/);
assert.doesNotMatch(apiSrc, /row_results/);
assert.doesNotMatch(modalSrc, /confirmVillageImport\([^)]*preview\.rows/);
assert.match(modalSrc, /confirmVillageImport\(preview\.import_token\)/);

assert.match(modalSrc, /Validating Excel/);
assert.match(modalSrc, /tryAcquireActionLock\(validateLockRef\)/);
assert.match(modalSrc, /tryAcquireActionLock\(confirmLockRef\)/);
assert.match(modalSrc, /applyFile\(/);
assert.doesNotMatch(modalSrc, /applyFile[\s\S]{0,80}validateVillageImport/);
assert.match(modalSrc, /disabled=\{!confirmReady\}/);
assert.match(modalSrc, /Import Villages\?/);
assert.match(modalSrc, /invalidateVillageCache/);
assert.match(modalSrc, /onImported\?\.\(\)/);
assert.match(modalSrc, /Validation expired|confirmRequestErrorMessage/);

const lock = { current: false };
assert.equal(tryAcquireActionLock(lock), true);
assert.equal(tryAcquireActionLock(lock), false);
releaseActionLock(lock);
assert.equal(tryAcquireActionLock(lock), true);

const blocked = normalizeValidateResponse({
  can_confirm: false,
  summary: { total_rows: 12, unique_villages: 10, warning_count: 2, error_count: 3 },
  errors: [{ code: "EMPLOYEE_NOT_FOUND", employee_id: "KAC-9999", message: "No employee with this ID." }],
  warnings: [{ code: "BLANK_TAMIL", message: "Blank Tamil name", row: 4, village: "Kedar" }],
  row_results: [
    { row: 1, employee_id: "KAC-0003", employee_name: "Kaviyarasan", village: "Madagadipattu", status: "ready" },
    { row: 2, village: "Manaveli", flags: ["new_village"] },
    { row: 3, village: "Shared Village", flags: ["shared_village"] },
    { row: 4, village: "Only", flags: ["village_only"] },
    { row: 5, village: "Old", flags: ["existing_village"] },
    { row: 6, village: "Warn", is_warning: true },
    { row: 7, village: "Bad", code: "MISSING_VILLAGE" },
  ],
  employee_assignment_preview: [
    { employee_name: "Kaviyarasan", employee_id: "KAC-0003", village_count: 143 },
  ],
  unassigned_villages: 2,
});

assert.equal(canConfirmImport(blocked), false);
assert.equal(isConfirmDisabled(blocked), true);
assert.deepEqual(
  buildSummaryCards(blocked).map((card) => `${card.label}:${card.value}`),
  ["Total Rows:12", "Unique Villages:10", "Warnings:2", "Errors:3"]
);
assert.equal(blocked.employees[0].village_count, 143);
assert.equal(blocked.unassignedVillages, 2);
assert.equal(blocked.rows[0].status, "Ready");
assert.equal(blocked.rows[1].status, "New Village");
assert.equal(blocked.rows[2].status, "Shared Village");
assert.equal(blocked.rows[3].status, "Village Only");
assert.equal(blocked.rows[4].status, "Existing Village");
assert.equal(blocked.rows[5].status, "Warning");
assert.equal(blocked.rows[6].status, "Missing village");
assert.equal(blocked.rows[6].statusKind, "warning");
assert.equal(blocked.errors[0].code, "EMPLOYEE_NOT_FOUND");
assert.equal(errorTitle("EMPLOYEE_NOT_FOUND"), "Employee not found");
assert.equal(blocked.warnings[0].message, "Blank Tamil name");
assert.equal(filterPreviewRows(blocked.rows, "mada")[0].village, "Madagadipattu");

const emptyCards = buildSummaryCards({ summary: {} });
assert.deepEqual(emptyCards, []);

const tamil = normalizeValidateResponse({
  can_confirm: true,
  import_token: "tok-tamil",
  blocking_errors: [],
  skippable_errors: ["TAMIL_NAME_CONFLICT"],
  tamil_name_conflicts: [
    {
      village: "Manaveli",
      tamil_values: ["மனவெளி", "மணவெளி"],
      excel_rows: [36, 182],
    },
  ],
});
assert.equal(tamil.errors.length, 0);
assert.equal(canConfirmImport(tamil), true);
assert.equal(errorTitle(tamil.tamilConflicts[0].code), "Tamil name conflict (skipped)");
assert.equal(tamil.tamilConflicts[0].village, "Manaveli");
assert.equal(tamil.tamilConflicts[0].rows[0].row, 36);
assert.equal(tamil.tamilConflicts[0].rows[1].row, 182);
assert.match(modalSrc, /Tamil name conflict|errorTitle/);
assert.match(modalSrc, /Correct the Excel file and upload it again/);
assert.match(modalSrc, /village-import-warnings/);
assert.match(modalSrc, /village-import-errors/);

const ready = normalizeValidateResponse({
  can_confirm: true,
  import_token: "tok-abc",
  summary: {
    villages_to_create: 8,
    assignments_to_create: 20,
    existing_villages: 4,
    total_rows: 28,
  },
});
assert.equal(canConfirmImport(ready), true);
assert.equal(isConfirmDisabled(ready), false);
assert.equal(isConfirmDisabled(ready, true), true);
assert.deepEqual(buildConfirmPayload(ready.import_token), { import_token: "tok-abc" });
assert.equal(Object.keys(buildConfirmPayload(ready.import_token)).join(","), "import_token");
assert.equal(ready.summary.newVillages, 8);
assert.equal(ready.summary.employeeAssignments, 20);
assert.equal(ready.summary.existingVillages, 4);

assert.equal(rowPreviewStatus({}).label, "Ready");
assert.equal(formatFileSize(2048), "2.0 KB");

assert.match(validateRequestErrorMessage({ message: "Network Error" }), /Could not reach the server/);
assert.match(validateRequestErrorMessage({ response: { status: 401, data: {} } }), /permission/);
assert.match(validateRequestErrorMessage({ response: { status: 400, data: { code: "INVALID_FILE" } } }), /Invalid file/);
assert.match(validateRequestErrorMessage({ response: { status: 400, data: { code: "MISSING_HEADERS" } } }), /Missing headers/);
assert.match(validateRequestErrorMessage({ response: { status: 500, data: {} } }), /Could not validate/);

assert.equal(isExpiredImportError({ response: { status: 410, data: { detail: "expired" } } }), true);
assert.match(confirmRequestErrorMessage({ response: { status: 410, data: { detail: "token expired" } } }), /Validation expired/);
assert.equal(isConsumedImportError({ response: { status: 409, data: { detail: "already consumed" } } }), true);
assert.match(confirmRequestErrorMessage({ response: { status: 500, data: {} } }), /Could not confirm/);
assert.match(confirmRequestErrorMessage({ message: "timeout" }), /not confirmed/);

const success = normalizeConfirmResponse({
  summary: {
    villages_created: 8,
    villages_reused: 4,
    assignments_created: 20,
    assignments_reused: 1,
    rows_processed: 28,
  },
});
assert.equal(success.villagesCreated, 8);
assert.equal(success.villagesReused, 4);
assert.equal(success.assignmentsCreated, 20);
assert.equal(success.assignmentsReused, 1);
assert.equal(success.rowsProcessed, 28);
assert.match(modalSrc, /Import completed successfully/);
assert.match(modalSrc, /onClick=\{handleDone\}/);
assert.match(modalSrc, /Done/);

// Backend preview_dict contract — shared village is not a duplicate.
const uniqueRows = normalizeValidateResponse({
  can_confirm: true,
  import_token: "tok-unique",
  total_rows: 2,
  unique_villages: 2,
  villages_to_create: 2,
  villages_existing: 0,
  assignments_to_create: 2,
  blocking_errors: [],
  errors: [],
  row_results: [
    { excel_row: 2, employee_id: "KAC-0008", employee_name: "Rajiv Gandhi", village: "Village A", status: "ok", matched_employee_id: "KAC-0008" },
    { excel_row: 3, employee_id: "KAC-0008", employee_name: "Rajiv Gandhi", village: "Village B", status: "ok", matched_employee_id: "KAC-0008" },
  ],
});
assert.equal(canConfirmImport(uniqueRows), true);
assert.equal(uniqueRows.rows.length, 2);

const sharedKollaar = normalizeValidateResponse({
  can_confirm: true,
  import_token: "tok-shared",
  unique_villages: 1,
  assignments_to_create: 2,
  blocking_errors: [],
  errors: [],
  employees_matched: ["KAC-0008 (Rajiv Gandhi)", "KAC-0009 (Uthiramoorthi)"],
  shared_villages: [
    { village: "Kollaar", employees: ["KAC-0008 (Rajiv Gandhi)", "KAC-0009 (Uthiramoorthi)"] },
  ],
  row_results: [
    { excel_row: 2, employee_id: "KAC-0008", employee_name: "Rajiv Gandhi", village: "Kollaar", village_tamil_name: "கொள்ளார்", status: "ok", matched_employee_id: "KAC-0008" },
    { excel_row: 3, employee_id: "KAC-0009", employee_name: "Uthiramoorthi", village: "Kollaar", village_tamil_name: "கொள்ளார்", status: "ok", matched_employee_id: "KAC-0009" },
  ],
});
assert.equal(canConfirmImport(sharedKollaar), true);
assert.equal(sharedKollaar.errors.length, 0);
assert.equal(sharedKollaar.rows.length, 2);
assert.equal(sharedKollaar.sharedVillages[0].village, "Kollaar");
assert.equal(sharedKollaar.sharedVillages[0].employees.length, 2);
assert.equal(sharedKollaar.employees[0].employee_id, "KAC-0008");
assert.notEqual(sharedKollaar.rows[0].key, sharedKollaar.rows[1].key);

const duplicateAasur = normalizeValidateResponse({
  can_confirm: true,
  import_token: "tok-dup",
  assignments_to_create: 1,
  unique_villages: 1,
  blocking_errors: [],
  errors: [],
  row_results: [
    { excel_row: 2, employee_id: "KAC-0008", village: "Aasur", status: "ok", matched_employee_id: "KAC-0008" },
    { excel_row: 3, employee_id: "KAC-0008", village: "Aasur", status: "ok", matched_employee_id: "KAC-0008" },
  ],
});
assert.equal(canConfirmImport(duplicateAasur), true);
assert.equal(duplicateAasur.summary.employeeAssignments, 1);
assert.equal(duplicateAasur.rows.length, 2);

const combo = normalizeValidateResponse({
  can_confirm: true,
  import_token: "tok-combo",
  unique_villages: 2,
  assignments_to_create: 3,
  blocking_errors: [],
  errors: [],
  shared_villages: [{ village: "Kollaar", employees: ["KAC-0008 (Rajiv Gandhi)", "KAC-0009 (Uthiramoorthi)"] }],
  row_results: [
    { excel_row: 2, employee_id: "KAC-0008", village: "Aasur", status: "ok", matched_employee_id: "KAC-0008" },
    { excel_row: 3, employee_id: "KAC-0008", village: "Aasur", status: "ok", matched_employee_id: "KAC-0008" },
    { excel_row: 4, employee_id: "KAC-0008", village: "Kollaar", status: "ok", matched_employee_id: "KAC-0008" },
    { excel_row: 5, employee_id: "KAC-0009", village: "Kollaar", status: "ok", matched_employee_id: "KAC-0009" },
  ],
});
assert.equal(canConfirmImport(combo), true);
assert.equal(combo.sharedVillages[0].village, "Kollaar");
assert.equal(combo.rows.filter((row) => row.village === "Kollaar").length, 2);
assert.equal(combo.errors.length, 0);

const invalidEmployee = normalizeValidateResponse({
  can_confirm: false,
  import_token: null,
  blocking_errors: ["EMPLOYEE_NOT_FOUND"],
  errors: ["Excel row 2: EMPLOYEE_NOT_FOUND employee_id='UNKNOWN-ID'"],
  employees_not_found: ["UNKNOWN-ID"],
  row_results: [
    { excel_row: 2, employee_id: "UNKNOWN-ID", village: "Village A", status: "error", messages: ["EMPLOYEE_NOT_FOUND"] },
  ],
});
assert.equal(canConfirmImport(invalidEmployee), false);
assert.equal(invalidEmployee.errors[0].code, "EMPLOYEE_NOT_FOUND");
assert.equal(invalidEmployee.errors[0].row, 2);

assert.match(
  validateRequestErrorMessage({ response: { status: 400, data: { code: "MISSING_HEADERS", message: "Required column 'Village' was not found." } } }),
  /Missing headers/
);

assert.equal(
  isExpiredImportError({
    response: { status: 400, data: { code: "TOKEN_INVALID", message: "Import token is invalid or expired." } },
  }),
  true
);
assert.equal(
  isConsumedImportError({
    response: { status: 400, data: { code: "TOKEN_REPLAY", message: "Import token was already used." } },
  }),
  true
);
assert.match(
  confirmRequestErrorMessage({
    response: { status: 400, data: { code: "TOKEN_REPLAY", message: "Import token was already used." } },
  }),
  /already completed/
);

console.log("village import checks OK");
